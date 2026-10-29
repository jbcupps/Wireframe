"""Formal twist/loop candidate indexing and explorer CSV import.

This module indexes ordered *labels*. It makes no claim about the existence,
geometry, equivalence, closure, or smoothness of a represented object.

Examples::

    python topological_assessment/candidate_feed.py words --start 0 --count 5
    python topological_assessment/candidate_feed.py triples --start 0 --count 5
    python topological_assessment/candidate_feed.py triples --max-operations 3 --count 5
    python topological_assessment/candidate_feed.py import-csv exported-page.csv

``--start`` is a zero-based rank. The explorer displays that rank plus one.
The unbounded triple order uses Cantor pairing; the optional bounded triple
order uses the Cartesian product with the third word changing fastest.
The globally stable triple identifier uses the ordered piece IDs rather than
an explorer row, because a bounded row number depends on the chosen maximum.
"""

from __future__ import annotations

import argparse
import csv
from dataclasses import asdict, dataclass
import json
from math import isqrt
from pathlib import Path
import re
from typing import Iterable, Iterator, Sequence, TextIO

PLANES = ("xy", "xz", "xw", "yz", "yw", "zw")
AXES = ("x", "y", "z", "w")
SIGNS = ("+", "-")
ALPHABET = tuple(
    [f"T{plane}{sign}" for plane in PLANES for sign in SIGNS]
    + [f"L{axis}{sign}" for axis in AXES for sign in SIGNS]
    + [f"P{plane}{sign}" for plane in PLANES for sign in SIGNS]
)
_DIGIT = {code: i for i, code in enumerate(ALPHABET)}
BASE = len(ALPHABET)
assert BASE == 32 and len(_DIGIT) == BASE


def parse_word(value: str | Sequence[str]) -> tuple[str, ...]:
    """Parse explorer or workbook spelling into canonical ASCII labels.

    The explorer uses U+2212 and middle dots; the workbook uses hyphens and
    arrows. Empty sequence markers ``∅``, ``empty word`` and ``""`` are
    recognized. Tokens outside the 32-label vocabulary are rejected.
    """
    if isinstance(value, str):
        text = value.strip().replace("−", "-")
        if text in ("", "∅") or text.casefold() == "empty word":
            return ()
        tokens = tuple(token.strip() for token in re.split(r"\s*(?:·|→)\s*", text))
    else:
        tokens = tuple(str(x).strip().replace("−", "-") for x in value)
    if any(not token or token not in _DIGIT for token in tokens):
        raise ValueError(f"Invalid operation label or separator: {value!r}")
    return tokens


def rank_word(value: str | Sequence[str]) -> int:
    """Zero-based length-first, base-32 rank matching workbook IDs."""
    tokens = parse_word(value)
    offset = sum(BASE**i for i in range(len(tokens)))
    number = 0
    for token in tokens:
        number = BASE * number + _DIGIT[token]
    return offset + number


def word_at(rank: int) -> tuple[str, ...]:
    """Invert a nonnegative length-first rank without pre-enumerating words."""
    if not isinstance(rank, int) or isinstance(rank, bool) or rank < 0:
        raise ValueError("rank must be a nonnegative integer")
    n, block = 0, 1
    while rank >= block:
        rank -= block
        block *= BASE
        n += 1
    tokens = [""] * n
    for i in range(n - 1, -1, -1):
        rank, digit = divmod(rank, BASE)
        tokens[i] = ALPHABET[digit]
    return tuple(tokens)


def word_id(value: str | Sequence[str]) -> str:
    """Workbook-compatible ID for the full 32-label alphabet."""
    return f"P{rank_word(value):05d}"


def pair(x: int, y: int) -> int:
    """Cantor pairing used for unbounded explorer triple rows."""
    if x < 0 or y < 0:
        raise ValueError("pair coordinates must be nonnegative")
    s = x + y
    return s * (s + 1) // 2 + y


def unpair(z: int) -> tuple[int, int]:
    if z < 0:
        raise ValueError("pair rank must be nonnegative")
    d = (isqrt(8 * z + 1) - 1) // 2
    y = z - d * (d + 1) // 2
    return d - y, y


def unbounded_triple_at(rank: int) -> tuple[tuple[str, ...], ...]:
    """Invert explorer's pair(a, pair(b, c)) triple ordering."""
    a, tail = unpair(rank)
    b, c = unpair(tail)
    return word_at(a), word_at(b), word_at(c)


def word_count(max_operations: int) -> int:
    if not isinstance(max_operations, int) or isinstance(max_operations, bool) or max_operations < 0:
        raise ValueError("max_operations must be a nonnegative integer")
    return sum(BASE**i for i in range(max_operations + 1))


def bounded_triple_at(rank: int, max_operations: int) -> tuple[tuple[str, ...], ...]:
    """Invert a finite Cartesian row, with C changing fastest."""
    n = word_count(max_operations)
    if not isinstance(rank, int) or isinstance(rank, bool) or rank < 0 or rank >= n**3:
        raise ValueError("rank is outside the bounded triple table")
    a, tail = divmod(rank, n * n)
    b, c = divmod(tail, n)
    return word_at(a), word_at(b), word_at(c)


@dataclass(frozen=True)
class Candidate:
    candidate_id: str
    word_rank: int
    operations: tuple[str, ...]

    @classmethod
    def from_word(cls, value: str | Sequence[str]) -> Candidate:
        tokens = parse_word(value)
        return cls(word_id(tokens), rank_word(tokens), tokens)


@dataclass(frozen=True)
class Triple:
    candidate_id: str
    pieces: tuple[Candidate, Candidate, Candidate]

    @classmethod
    def from_words(cls, values: Iterable[str | Sequence[str]]) -> Triple:
        parts = tuple(Candidate.from_word(v) for v in values)
        if len(parts) != 3:
            raise ValueError("a triple must contain exactly three words")
        return cls("TR-" + "-".join(p.candidate_id for p in parts), parts)  # type: ignore[arg-type]


def read_explorer_csv(stream: TextIO) -> Iterator[tuple[str, Candidate | Triple]]:
    """Read the explorer's displayed-page export, preserving its row label.

    Identity is calculated from operation strings, never the row number:
    filtered loop modes and finite/unbounded table settings change row ranks.
    The file reports statuses but no geometry or gluing is inferred here.
    Open a file with ``encoding='utf-8-sig', newline=''`` to remove its BOM.
    """
    reader = csv.DictReader(stream)
    names = set(reader.fieldnames or ())
    word_column = "Ordered operation sequence"
    triple_columns = ("Piece A sequence", "Piece B sequence", "Piece C sequence")
    if "Row" not in names:
        raise ValueError("CSV is missing the explorer's Row header")
    kind = "words" if word_column in names else "triples" if set(triple_columns) <= names else None
    if kind is None:
        raise ValueError("CSV is not a recognized explorer words or triples page")
    for line_number, row in enumerate(reader, 2):
        try:
            source_row = row["Row"]
            if not source_row or not source_row.isdigit() or int(source_row) < 1:
                raise ValueError("Row must be a positive decimal integer")
            if kind == "words":
                item = Candidate.from_word(row[word_column])
                length = row.get("Length", "")
                if length and (not length.isdigit() or int(length) != len(item.operations)):
                    raise ValueError("reported Length does not match sequence")
            else:
                item = Triple.from_words(row[c] for c in triple_columns)
            yield source_row, item
        except (KeyError, TypeError, ValueError) as exc:
            raise ValueError(f"CSV line {line_number}: {exc}") from exc


def _nonnegative(text: str) -> int:
    try:
        value = int(text)
    except ValueError as exc:
        raise argparse.ArgumentTypeError("must be a nonnegative integer") from exc
    if value < 0:
        raise argparse.ArgumentTypeError("must be a nonnegative integer")
    return value


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    for name in ("words", "triples"):
        sub = commands.add_parser(name)
        sub.add_argument("--start", type=_nonnegative, default=0, help="zero-based starting row")
        sub.add_argument("--count", type=_nonnegative, default=50)
        if name == "triples":
            sub.add_argument("--max-operations", type=_nonnegative, help="bounded Cartesian table; omit for unbounded pairing")
    inp = commands.add_parser("import-csv")
    inp.add_argument("path", type=Path)
    args = parser.parse_args(argv)
    if args.command == "import-csv":
        with args.path.open(encoding="utf-8-sig", newline="") as stream:
            for row, item in read_explorer_csv(stream):
                print(json.dumps({"source_row": row, **asdict(item)}, ensure_ascii=False))
    elif args.command == "words":
        for rank in range(args.start, args.start + args.count):
            print(json.dumps(asdict(Candidate.from_word(word_at(rank))), ensure_ascii=False))
    else:
        total = None if args.max_operations is None else word_count(args.max_operations) ** 3
        for rank in range(args.start, args.start + args.count):
            if total is not None and rank >= total:
                break
            parts = unbounded_triple_at(rank) if total is None else bounded_triple_at(rank, args.max_operations)
            print(json.dumps({"source_row": str(rank + 1), **asdict(Triple.from_words(parts))}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
