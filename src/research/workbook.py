"""Bounded XLSX table intake. Spreadsheet text is data, never executable code.

Only canonical symbolic words and ordered triples are constructed here. A
spreadsheet's status columns do not create geometric models or assessments.
"""

from hashlib import sha256
from io import BytesIO
import json
import posixpath
import re
import time
import xml.etree.ElementTree as ET
import zipfile
import zlib

from .assessment import ResourceLimit
from .candidate_feed import ALPHABET, parse_word


WORKBOOK_LIMITS = {
    "request_bytes": 3_000_000, "response_bytes": 3_000_000, "expanded_bytes": 32 * 1024 * 1024,
    "zip_members": 1000, "sheets": 32, "cells": 500_000,
    "rows_per_sheet": 50_000, "columns": 64, "shared_strings": 100_000,
    "cell_characters": 65_536, "text_characters": 16_000_000,
    "xml_elements": 2_000_000, "xml_depth": 64,
    "operations_per_word": 4096, "page_rows": 20, "seconds": 8,
}
_NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
_REL_NS = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"
_PKG_NS = "{http://schemas.openxmlformats.org/package/2006/relationships}"
_WORD_HEADERS = {"ID", "Operation sequence", "Length"}
_TRIPLE_HEADERS = {"Triple ID", *[f"Piece {p} {field}" for p in "ABC" for field in ("ID", "sequence")]}
_DIGITS = {label: index for index, label in enumerate(ALPHABET)}


class _Budget:
    def __init__(self):
        self.deadline = time.monotonic() + WORKBOOK_LIMITS["seconds"]
        self.cells = self.text = self.elements = self.expanded = 0

    def check(self):
        if time.monotonic() > self.deadline:
            raise ResourceLimit("Workbook processing exceeded the time budget.")

    def string(self, value):
        if len(value) > WORKBOOK_LIMITS["cell_characters"]:
            raise ResourceLimit("A workbook cell exceeds the character limit.")
        self.text += len(value)
        if self.text > WORKBOOK_LIMITS["text_characters"]:
            raise ResourceLimit("Workbook text exceeds the application limit.")
        return value


def _safe_name(name):
    if (not isinstance(name, str) or not name or name.startswith("/")
            or "\\" in name or ":" in name or any(ord(c) < 32 for c in name)
            or any(part in ("", ".", "..") for part in name.rstrip("/").split("/"))):
        raise ValueError("Workbook contains an unsafe ZIP member path.")
    return name


def _xml_bytes(archive, name, budget):
    try:
        info = archive.getinfo(name)
    except KeyError as exc:
        raise ValueError("Workbook references a missing XML part.") from exc
    remaining = WORKBOOK_LIMITS["expanded_bytes"] - budget.expanded
    if info.file_size > remaining:
        raise ResourceLimit("Expanded workbook exceeds the application limit.")
    with archive.open(info) as stream:
        data = stream.read(remaining + 1)
    budget.expanded += len(data)
    if budget.expanded > WORKBOOK_LIMITS["expanded_bytes"]:
        raise ResourceLimit("Expanded workbook exceeds the application limit.")
    # Removing NULs catches declaration syntax in UTF-16/UTF-32 as well as
    # ASCII-compatible XML encodings, before ElementTree can expand entities.
    declarations = data.replace(b"\x00", b"").upper()
    if b"<!DOCTYPE" in declarations or b"<!ENTITY" in declarations:
        raise ValueError("Workbook XML cannot contain DTD or entity declarations.")
    budget.check()
    return data


def _events(data, budget):
    depth = 0
    for event, element in ET.iterparse(BytesIO(data), events=("start", "end")):
        if event == "start":
            depth += 1
            budget.elements += 1
            if depth > WORKBOOK_LIMITS["xml_depth"] or budget.elements > WORKBOOK_LIMITS["xml_elements"]:
                raise ResourceLimit("Workbook XML nesting or element count exceeds the application limit.")
        else:
            depth -= 1
        if budget.elements % 1024 == 0:
            budget.check()
        yield event, element
    budget.check()


def _small_xml(data, budget):
    root = None
    for event, element in _events(data, budget):
        if root is None and event == "start":
            root = element
    return root


def _shared_strings(data, budget):
    values, root = [], None
    for event, element in _events(data, budget):
        if root is None:
            root = element
        if event == "end" and element.tag == _NS + "si":
            value = "".join(part.text or "" for part in element.iter(_NS + "t"))
            values.append(budget.string(value))
            if len(values) > WORKBOOK_LIMITS["shared_strings"]:
                raise ResourceLimit("Workbook contains too many shared strings.")
            element.clear()
            root.clear()
    return values


def _column_name(index):
    result = ""
    while index:
        index, digit = divmod(index - 1, 26)
        result = chr(65 + digit) + result
    return result


def _cell_column(address, row_number):
    match = re.fullmatch(r"([A-Z]{1,3})([1-9][0-9]{0,6})", address or "")
    if not match or int(match[2]) != row_number:
        raise ValueError("Worksheet cells must have explicit, consistent Excel coordinates.")
    column = 0
    for letter in match[1]:
        column = column * 26 + ord(letter) - 64
    if column > WORKBOOK_LIMITS["columns"]:
        raise ResourceLimit("Worksheet exceeds the supported column limit.")
    return column - 1


def _sheet_rows(data, strings, budget):
    root, row_count, previous_row = None, 0, 0
    for event, element in _events(data, budget):
        if root is None:
            root = element
            if element.tag != _NS + "worksheet":
                raise ValueError("Workbook sheet is not an XLSX worksheet.")
        if event != "end" or element.tag != _NS + "row":
            continue
        row_count += 1
        if row_count > WORKBOOK_LIMITS["rows_per_sheet"]:
            raise ResourceLimit("Worksheet exceeds the supported row limit.")
        number = element.attrib.get("r", "")
        if not re.fullmatch(r"[1-9][0-9]{0,6}", number) or not previous_row < int(number) <= 1_048_576:
            raise ValueError("Worksheet rows must have increasing, valid Excel row numbers.")
        number = int(number)
        previous_row = number
        cells = {}
        for cell in element.findall(_NS + "c"):
            budget.cells += 1
            if budget.cells > WORKBOOK_LIMITS["cells"]:
                raise ResourceLimit("Workbook exceeds the supported cell limit.")
            index = _cell_column(cell.attrib.get("r"), number)
            if index in cells:
                raise ValueError("Worksheet repeats a cell coordinate.")
            value_node = cell.find(_NS + "v")
            value = value_node.text or "" if value_node is not None else ""
            kind = cell.attrib.get("t", "n")
            if kind == "s":
                if not re.fullmatch(r"[0-9]{1,7}", value) or int(value) >= len(strings):
                    raise ValueError("Worksheet refers to an invalid shared string.")
                value = strings[int(value)]
            elif kind == "inlineStr":
                value = "".join(part.text or "" for part in cell.findall(".//" + _NS + "t"))
            elif kind not in ("n", "str", "b", "d", "e"):
                raise ValueError("Worksheet contains an unsupported cell type.")
            formula_node = cell.find(_NS + "f")
            formula = None if formula_node is None else formula_node.text or ""
            value = budget.string(value)
            if formula is not None:
                budget.string(formula)
            cells[index] = (value, formula)
        if any(value or formula is not None for value, formula in cells.values()):
            yield number, cells
        element.clear()
        root.clear()


def _decimal(value):
    """Decimal serialization also supports the 4096-operation word bound."""
    if not value:
        return "0"
    parts = []
    while value:
        value, tail = divmod(value, 1_000_000_000)
        parts.append(tail)
    return str(parts[-1]) + "".join(f"{part:09d}" for part in reversed(parts[:-1]))


def _word(value):
    try:
        operations = parse_word(value)
    except ValueError as exc:
        raise ValueError("A candidate sequence contains an invalid operation label or separator.") from exc
    if len(operations) > WORKBOOK_LIMITS["operations_per_word"]:
        raise ResourceLimit("A workbook candidate exceeds 4096 operations per word.")
    rank = 0
    for operation in operations:
        rank = 32 * rank + _DIGITS[operation] + 1
    rank_text = _decimal(rank)
    return {"candidate_id": "P" + rank_text.zfill(5), "word_rank": rank_text, "operations": list(operations)}


def _integer_cell(value, expected, name):
    if not re.fullmatch(r"[0-9]{1,8}", value) or int(value) != expected:
        raise ValueError(f"Workbook {name} does not match the operation sequence.")


def _candidate(cells, columns, kind):
    positions = {name: i for i, name in enumerate(columns)}

    def field(name, relevant=True):
        value, formula = cells.get(positions[name], ("", None))
        if relevant and formula is not None:
            raise ValueError("Formulas are not supported in candidate identity or operation cells.")
        return value

    if kind == "words":
        item = _word(field("Operation sequence"))
        if field("ID") != item["candidate_id"]:
            raise ValueError("Workbook piece ID does not match its operation sequence.")
        operations = item["operations"]
        _integer_cell(field("Length"), len(operations), "Length")
        for i in range(1, 4):
            name = f"Operation {i}"
            if name in positions and field(name) != (operations[i - 1] if len(operations) >= i else ""):
                raise ValueError("Workbook operation column does not match its sequence.")
        for name, count in (("Twist count", sum(op.startswith("T") for op in operations)),
                            ("Loop count", sum(not op.startswith("T") for op in operations))):
            if name in positions:
                _integer_cell(field(name), count, name)
        return field("ID"), item
    pieces = []
    for label in "ABC":
        piece = _word(field(f"Piece {label} sequence"))
        if field(f"Piece {label} ID") != piece["candidate_id"]:
            raise ValueError(f"Workbook Piece {label} ID does not match its operation sequence.")
        pieces.append(piece)
    source_id = field("Triple ID")
    if not source_id or len(source_id) > 100:
        raise ValueError("Workbook triple source ID must contain 1–100 characters.")
    return source_id, {"candidate_id": "TR-" + "-".join(p["candidate_id"] for p in pieces), "pieces": pieces}


def _display(cells, width):
    return [value if formula is None else "[formula] =" + formula
            for value, formula in (cells.get(i, ("", None)) for i in range(width))]


def _read_sheet(data, strings, name, start, count, budget):
    kind, header_row, columns, total, maximum_column = "reference", None, [], 0, 0
    page = []
    for number, cells in _sheet_rows(data, strings, budget):
        width = max(cells, default=-1) + 1
        maximum_column = max(maximum_column, width)
        values = [cells.get(i, ("", None))[0] for i in range(width)]
        names = set(values)
        if header_row is None and number <= 50:
            detected = "words" if _WORD_HEADERS <= names else "triples" if _TRIPLE_HEADERS <= names else None
            if detected:
                if any(formula is not None for _, formula in cells.values()):
                    raise ValueError("Candidate table headers cannot be formulas.")
                if len([v for v in values if v]) != len(set(v for v in values if v)):
                    raise ValueError("Candidate table contains duplicate headers.")
                kind, header_row, columns, total, page = detected, number, values, 0, []
                continue
            if {"ID", "Operation sequence"} <= names or "Triple ID" in names:
                raise ValueError("Candidate table is missing required headers.")
        source_id, item = "", None
        if kind != "reference":
            if any(index >= len(columns) and (value or formula is not None)
                   for index, (value, formula) in cells.items()):
                raise ValueError("A candidate row contains data beyond its table headers.")
            source_id, item = _candidate(cells, columns, kind)
        if start <= total < start + count:
            page.append({"excel_row": str(number), "source_row": str(number),
                         "source_id": source_id, "cells": _display(cells, width), "item": item})
        total += 1
    if kind == "reference":
        if name in ("Configurations", "Triple examples"):
            raise ValueError(f"The {name} sheet is missing recognized candidate table headers.")
        columns = [_column_name(i) for i in range(1, maximum_column + 1)]
    for row in page:
        row["cells"] = (row["cells"] + [""] * len(columns))[:len(columns)]
    return {"name": name, "kind": kind, "header_row": header_row, "total_rows": total,
            "columns": columns, "rows": page}


def workbook_page(raw, *, sheet=None, start=0, count=20):
    """Read a bounded page and verify every recognized candidate row."""
    if not isinstance(raw, bytes) or not raw:
        raise ValueError("Upload a nonempty XLSX workbook.")
    if len(raw) > WORKBOOK_LIMITS["request_bytes"]:
        raise ResourceLimit("Workbook exceeds the 3,000,000-byte upload limit.")
    for value, name in ((start, "start"), (count, "count")):
        if isinstance(value, bool) or not isinstance(value, int) or value < 0:
            raise ValueError(f"Workbook {name} must be a nonnegative integer.")
    if not 1 <= count <= WORKBOOK_LIMITS["page_rows"] or start > 1_048_576:
        raise ValueError("Workbook count must be 1–20 and start must be a valid row offset.")
    if sheet is not None and (not isinstance(sheet, str) or not sheet or len(sheet) > 100):
        raise ValueError("Workbook sheet must be a name of at most 100 characters.")
    budget = _Budget()
    try:
        with zipfile.ZipFile(BytesIO(raw)) as archive:
            members = archive.infolist()
            if len(members) > WORKBOOK_LIMITS["zip_members"]:
                raise ResourceLimit("Workbook has too many ZIP members.")
            names = set()
            for info in members:
                name = _safe_name(info.orig_filename)
                if name.casefold() in names:
                    raise ValueError("Workbook contains duplicate ZIP member paths.")
                names.add(name.casefold())
                if info.flag_bits & 1 or info.compress_type not in (zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED):
                    raise ValueError("Encrypted or unsupported ZIP compression is not accepted.")
            if sum(info.file_size for info in members) > WORKBOOK_LIMITS["expanded_bytes"]:
                raise ResourceLimit("Expanded workbook exceeds the 32 MiB application limit.")
            workbook = _small_xml(_xml_bytes(archive, "xl/workbook.xml", budget), budget)
            relationships = _small_xml(_xml_bytes(archive, "xl/_rels/workbook.xml.rels", budget), budget)
            if workbook.tag != _NS + "workbook" or relationships.tag != _PKG_NS + "Relationships":
                raise ValueError("Upload a valid XLSX workbook package.")
            parts = {}
            for relationship in relationships:
                if relationship.tag != _PKG_NS + "Relationship":
                    continue
                identifier = relationship.attrib.get("Id")
                if not identifier or identifier in parts:
                    raise ValueError("Workbook contains duplicate or missing relationship IDs.")
                target = relationship.attrib.get("Target", "")
                if relationship.attrib.get("TargetMode", "Internal") != "Internal":
                    raise ValueError("External workbook relationships are not accepted.")
                _safe_name(target.lstrip("/") if target.startswith("/") else target)
                path = target.lstrip("/") if target.startswith("/") else posixpath.join("xl", target)
                parts[identifier] = (path, relationship.attrib.get("Type", ""))
            sources = workbook.findall(_NS + "sheets/" + _NS + "sheet")
            if not sources or len(sources) > WORKBOOK_LIMITS["sheets"]:
                raise ResourceLimit("Workbook must contain 1–32 sheets.")
            strings = []
            shared_parts = [path for path, kind in parts.values() if kind == _REL_NS[1:-1] + "/sharedStrings"]
            if len(shared_parts) > 1:
                raise ValueError("Workbook contains multiple shared-string tables.")
            if shared_parts:
                strings = _shared_strings(_xml_bytes(archive, shared_parts[0], budget), budget)
            tables, seen_names, seen_paths = [], set(), set()
            for source in sources:
                name = source.attrib.get("name", "")
                if not name or len(name) > 100 or name in seen_names:
                    raise ValueError("Workbook contains invalid or duplicate sheet names.")
                seen_names.add(name)
                path, kind = parts.get(source.attrib.get(_REL_NS + "id"), (None, None))
                if not path or kind != _REL_NS[1:-1] + "/worksheet" or path in seen_paths:
                    raise ValueError("Workbook contains an invalid sheet relationship.")
                seen_paths.add(path)
                tables.append(_read_sheet(_xml_bytes(archive, path, budget), strings, name, start, count, budget))
            selected = next((t for t in tables if t["name"] == sheet), None) if sheet else (
                next((t for t in tables if t["name"] == "Configurations"), None)
                or next((t for t in tables if t["kind"] != "reference"), None) or tables[0])
            if selected is None:
                raise ValueError("The requested worksheet does not exist.")
            if start >= selected["total_rows"] and (start or selected["total_rows"]):
                raise ValueError("Workbook start is outside the selected table.")
            budget.check()
            result = {"sha256": sha256(raw).hexdigest(),
                    "sheets": [{k: t[k] for k in ("name", "kind", "header_row", "total_rows")} for t in tables],
                    "sheet": selected["name"], "kind": selected["kind"], "header_row": selected["header_row"],
                    "columns": selected["columns"], "rows": selected["rows"], "start": start,
                    "count": len(selected["rows"]), "total_rows": selected["total_rows"]}
            # Account for Flask's default ASCII escaping so the actual JSON
            # stays below the deployment response cap, including Unicode text.
            if len(json.dumps(result, ensure_ascii=True).encode("utf-8")) > WORKBOOK_LIMITS["response_bytes"]:
                raise ResourceLimit("Workbook page exceeds the response limit; request fewer rows.")
            budget.check()
            return result
    except (zipfile.BadZipFile, zipfile.LargeZipFile, ET.ParseError, UnicodeError, RuntimeError, NotImplementedError, EOFError, zlib.error, LookupError) as exc:
        raise ValueError("Upload a valid, unencrypted XLSX workbook with well-formed XML.") from exc
