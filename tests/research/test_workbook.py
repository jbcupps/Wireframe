"""Exercise source-bound XLSX intake without a spreadsheet dependency."""

import io
import struct
import zipfile
from hashlib import sha256
from unittest.mock import patch
from xml.sax.saxutils import escape

import pytest

from src.app import app
from src.research.workbook import WORKBOOK_LIMITS, workbook_page
from src.research.assessment import ResourceLimit


NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PKG = "http://schemas.openxmlformats.org/package/2006/relationships"
MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
WORDS = ["ID", "Operation sequence", "Length", "Operation 1", "Operation 2", "Operation 3", "Twist count", "Loop count"]
TRIPLES = ["Triple ID", "Piece A ID", "Piece A sequence", "Piece B ID", "Piece B sequence", "Piece C ID", "Piece C sequence", "Closed?"]


def _sheet(rows):
    output = []
    for number, values in rows:
        cells = []
        for index, value in enumerate(values):
            if value is None:
                continue
            address = f"{chr(65 + index)}{number}"
            if isinstance(value, dict):
                cells.append(f'<c r="{address}" t="str"><f>{escape(value["formula"])}</f><v>{escape(value.get("cached", ""))}</v></c>')
            else:
                cells.append(f'<c r="{address}" t="inlineStr"><is><t>{escape(str(value))}</t></is></c>')
        output.append(f'<row r="{number}">{"".join(cells)}</row>')
    return f'<worksheet xmlns="{NS}"><sheetData>{"".join(output)}</sheetData></worksheet>'.encode()


def _package(sheets=None, extra=None, relationships=None, compression=zipfile.ZIP_DEFLATED):
    sheets = sheets or [("Configurations", _sheet([(2, ["Formal candidates"]), (5, WORDS),
        (6, ["P00000", "empty word", 0, "", "", "", 0, 0]),
        (7, ["P00001", "Txy+", 1, "Txy+", "", "", 1, 0])]))]
    workbook = f'<workbook xmlns="{NS}" xmlns:r="{REL}"><sheets>' + ''.join(
        f'<sheet name="{escape(name)}" sheetId="{i}" r:id="rId{i}"/>' for i, (name, _) in enumerate(sheets, 1)) + '</sheets></workbook>'
    rels = relationships or ''.join(f'<Relationship Id="rId{i}" Type="{REL}/worksheet" Target="worksheets/sheet{i}.xml"/>' for i in range(1, len(sheets) + 1))
    files = {'xl/workbook.xml': workbook.encode(), 'xl/_rels/workbook.xml.rels': f'<Relationships xmlns="{PKG}">{rels}</Relationships>'.encode()}
    files.update({f'xl/worksheets/sheet{i}.xml': xml for i, (_, xml) in enumerate(sheets, 1)})
    files.update(extra or {})
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, 'w', compression=compression) as archive:
        for name, content in files.items():
            archive.writestr(name, content)
    return buffer.getvalue()


@pytest.fixture
def client():
    app.config.update(TESTING=True)
    with app.test_client() as client:
        yield client


def test_words_header_at_five_with_excel_provenance_and_pagination():
    raw = _package()
    result = workbook_page(raw, start=1, count=20)
    assert result['sha256'] == sha256(raw).hexdigest()
    assert result['sheet'] == 'Configurations'
    assert result['kind'] == 'words'
    assert result['header_row'] == 5
    assert result['total_rows'] == 2
    assert result['count'] == 1
    assert result['columns'] == WORDS
    assert result['rows'][0] == {'excel_row': '7', 'source_row': '7', 'source_id': 'P00001',
        'cells': ['P00001', 'Txy+', '1', 'Txy+', '', '', '1', '0'],
        'item': {'candidate_id': 'P00001', 'word_rank': '1', 'operations': ['Txy+']}}
    assert workbook_page(raw)['rows'][0]['item']['operations'] == []


def test_triple_source_labels_are_distinct_from_ordered_stable_identity():
    raw = _package([('Triple examples', _sheet([(5, TRIPLES),
        (6, ['C0001', 'P00001', 'Txy+', 'P00013', 'Lx+', 'P00000', 'empty word', 'Passed'])]))])
    result = workbook_page(raw)
    row = result['rows'][0]
    assert result['kind'] == 'triples'
    assert row['source_id'] == 'C0001'
    assert row['item']['candidate_id'] == 'TR-P00001-P00013-P00000'
    assert [p['word_rank'] for p in row['item']['pieces']] == ['1', '13', '0']
    assert not {'geometry', 'result', 'checks', 'status'} & row['item'].keys()


def test_reference_rows_preserve_sparse_coordinates_and_literal_formula():
    raw = _package([('Reference', _sheet([(2, ['Title']), (4, ['', '']),
        (5, [None, 'Heading']), (9, [{'formula': 'HYPERLINK("https://example.com")', 'cached': 'Run me'}])]))])
    result = workbook_page(raw)
    assert result['columns'] == ['A', 'B']
    assert result['kind'] == 'reference' and result['header_row'] is None
    assert result['total_rows'] == 3
    assert [r['excel_row'] for r in result['rows']] == ['2', '5', '9']
    assert result['rows'][1]['cells'] == ['', 'Heading']
    assert result['rows'][2]['cells'][0].startswith('[formula] =HYPERLINK(')
    assert all(r['item'] is None for r in result['rows'])


def test_default_selects_first_candidate_after_reference():
    raw = _package([('Notes', _sheet([(2, ['Reference only'])])),
                    ('My words', _sheet([(5, WORDS[:3]), (6, ['P00000', 'empty word', 0])]))])
    result = workbook_page(raw)
    assert result['sheet'] == 'My words'
    assert [t['kind'] for t in result['sheets']] == ['reference', 'words']


@pytest.mark.parametrize('column,value', [(0, 'P00002'), (2, 2), (3, 'Txy-'), (6, 0), (7, 1)])
def test_conflicting_word_identity_and_counts_rejected_even_outside_page(column, value):
    row = ['P00001', 'Txy+', 1, 'Txy+', '', '', 1, 0]
    row[column] = value
    raw = _package([('Configurations', _sheet([(5, WORDS), (6, ['P00000', 'empty word', 0, '', '', '', 0, 0]), (7, row)]))])
    with pytest.raises(ValueError, match='match'):
        workbook_page(raw, count=1)


def test_conflicting_piece_id_and_long_source_label_rejected():
    row = ['C0001', 'P00002', 'Txy+', 'P00013', 'Lx+', 'P00000', 'empty word', 'Not tested']
    with pytest.raises(ValueError, match='Piece A ID'):
        workbook_page(_package([('Triple examples', _sheet([(5, TRIPLES), (6, row)]))]))
    row[0], row[1] = 'C' * 101, 'P00001'
    with pytest.raises(ValueError, match='source ID'):
        workbook_page(_package([('Triple examples', _sheet([(5, TRIPLES), (6, row)]))]))


@pytest.mark.parametrize('formula_column', [0, 1, 2, 3, 6])
def test_candidate_formulas_rejected_even_with_valid_cached_values(formula_column):
    row = ['P00001', 'Txy+', '1', 'Txy+', '', '', '1', '0']
    row[formula_column] = {'formula': '1+1', 'cached': row[formula_column]}
    with pytest.raises(ValueError, match='Formulas'):
        workbook_page(_package([('Configurations', _sheet([(5, WORDS), (6, row)]))]))


def test_formula_headers_missing_headers_and_duplicate_headers_rejected():
    headers = WORDS[:]
    headers[0] = {'formula': '"ID"', 'cached': 'ID'}
    with pytest.raises(ValueError, match='headers cannot'):
        workbook_page(_package([('Configurations', _sheet([(5, headers)]))]))
    for headers in (['ID', 'Operation sequence'], WORDS + ['ID']):
        with pytest.raises(ValueError, match='headers'):
            workbook_page(_package([('Configurations', _sheet([(5, headers)]))]))


def test_candidate_columns_are_not_silently_discarded():
    raw = _package([('Configurations', _sheet([(5, WORDS[:3]), (6, ['P00000', 'empty word', 0, 'unlabeled data'])]))])
    with pytest.raises(ValueError, match='beyond its table headers'):
        workbook_page(raw)


def test_shared_strings_supported_and_bad_indices_rejected():
    sheet = f'<worksheet xmlns="{NS}"><sheetData><row r="2"><c r="B2" t="s"><v>0</v></c></row></sheetData></worksheet>'.encode()
    rels = f'<Relationship Id="rId1" Type="{REL}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="strings" Type="{REL}/sharedStrings" Target="sharedStrings.xml"/>'
    strings = f'<sst xmlns="{NS}"><si><r><t>Rich</t></r><r><t> text</t></r></si></sst>'.encode()
    raw = _package([('Notes', sheet)], {'xl/sharedStrings.xml': strings}, rels)
    assert workbook_page(raw)['rows'][0]['cells'] == ['', 'Rich text']
    with pytest.raises(ValueError, match='shared string'):
        workbook_page(_package([('Notes', sheet.replace(b'<v>0', b'<v>9'))], {'xl/sharedStrings.xml': strings}, rels))


@pytest.mark.parametrize('encoding', ['utf-8', 'utf-16', 'utf-32'])
def test_dtd_and_entity_declarations_rejected_before_xml_parsing(encoding):
    xml = f'<?xml version="1.0" encoding="{encoding}"?><!DOCTYPE worksheet [<!ENTITY unsafe "expanded">]><worksheet xmlns="{NS}"/>'
    with pytest.raises(ValueError, match='DTD or entity'):
        workbook_page(_package([('Notes', xml.encode(encoding))]))


@pytest.mark.parametrize('name', ['../escape.xml', '/absolute.xml', 'xl/../escape.xml', 'xl\\escape.xml', 'C:escape.xml'])
def test_unsafe_archive_members_rejected(name):
    raw = _package(extra={name.replace('\\', '/'): b'data'})
    # On Windows ZipFile.writestr normalizes backslashes at creation time.
    if '\\' in name:
        raw = raw.replace(name.replace('\\', '/').encode(), name.encode())
    with pytest.raises(ValueError, match='unsafe ZIP'):
        workbook_page(raw)


def test_external_relationships_malformed_xml_and_corrupt_zip_rejected():
    rels = f'<Relationship Id="rId1" Type="{REL}/worksheet" Target="https://example.com/sheet.xml" TargetMode="External"/>'
    with pytest.raises(ValueError, match='External'):
        workbook_page(_package(relationships=rels))
    for raw in (b'not a zip', _package([('Notes', b'<broken>')]), _package(extra={'xl/workbook.xml': b'<broken>'}),
                _package(extra={'xl/workbook.xml': b'<?xml version="1.0" encoding="not-a-codec"?><workbook/>'})):
        with pytest.raises(ValueError):
            workbook_page(raw)


def test_corrupt_deflate_is_a_controlled_invalid_workbook(client):
    raw = bytearray(_package())
    # The first member is workbook.xml. BTYPE=3 is an invalid DEFLATE block.
    filename_length, extra_length = struct.unpack_from('<HH', raw, 26)
    raw[30 + filename_length + extra_length] = 7
    with pytest.raises(ValueError, match='valid'):
        workbook_page(bytes(raw))
    result = client.post('/api/research/workbook', data=bytes(raw), content_type=MIME)
    assert result.status_code == 400
    assert result.get_json()['status'] == 'invalid_input'


@pytest.mark.parametrize('limit,value,match', [
    ('expanded_bytes', 100, 'Expanded'), ('zip_members', 2, 'ZIP members'),
    ('cells', 2, 'cell limit'), ('rows_per_sheet', 2, 'row limit'),
    ('cell_characters', 3, 'character limit'), ('text_characters', 20, 'text exceeds'),
    ('xml_elements', 3, 'element count'), ('xml_depth', 2, 'nesting'),
    ('columns', 2, 'column limit'), ('seconds', -1, 'time budget'),
    ('response_bytes', 100, 'response limit'),
])
def test_resource_limits_are_explicit(monkeypatch, limit, value, match):
    monkeypatch.setitem(WORKBOOK_LIMITS, limit, value)
    with pytest.raises(ResourceLimit, match=match):
        workbook_page(_package())


def test_4096_operation_word_preserves_rank_beyond_python_decimal_limit():
    # All digit-zero labels have rank (32**4096 - 1) / 31. Convert only small
    # chunks independently so the test does not change Python's global limit.
    rank, parts = (32 ** 4096 - 1) // 31, []
    while rank:
        rank, part = divmod(rank, 10**9)
        parts.append(part)
    expected = str(parts[-1]) + ''.join(f'{part:09d}' for part in reversed(parts[:-1]))
    raw = _package([('Configurations', _sheet([(5, WORDS[:3]), (6, ['P' + expected, ' → '.join(['Txy+'] * 4096), 4096])]))])
    item = workbook_page(raw)['rows'][0]['item']
    assert item['word_rank'] == expected
    assert len(item['word_rank']) > 4300
    assert len(item['operations']) == 4096
    raw = _package([('Configurations', _sheet([(5, WORDS[:3]), (6, ['P00000', ' → '.join(['Txy+'] * 4097), 4097])]))])
    with pytest.raises(ResourceLimit, match='4096 operations'):
        workbook_page(raw)


@pytest.mark.parametrize('parameters', [{'count': 0}, {'count': 21}, {'start': -1}, {'start': 2}, {'start': True}, {'sheet': 'Missing'}])
def test_page_boundaries_are_not_silently_coerced(parameters):
    with pytest.raises(ValueError):
        workbook_page(_package(), **parameters)


def test_workbook_http_boundary(client):
    raw = _package()
    result = client.post('/api/research/workbook?start=1&count=1', data=raw, content_type=MIME)
    assert result.status_code == 200
    assert result.headers['Cache-Control'] == 'no-store'
    assert result.get_json()['rows'][0]['source_id'] == 'P00001'
    assert client.post('/api/research/workbook', data=raw, content_type='application/octet-stream').status_code == 200
    assert client.post('/api/research/workbook', data=raw, content_type='text/plain').status_code == 415
    assert client.get('/api/research/workbook').status_code == 405
    for query in ('count=21', 'count=0', 'start=-1', 'count=1.0', 'start=99999999999999999999', 'sheet=Missing'):
        response = client.post('/api/research/workbook?' + query, data=raw, content_type=MIME)
        assert response.status_code == 400
        assert response.get_json()['status'] == 'invalid_input'
        assert response.headers['Cache-Control'] == 'no-store'


def test_http_upload_caps_include_unknown_length_stream(client):
    raw = b' ' * (WORKBOOK_LIMITS['request_bytes'] + 1)
    with patch('src.routes.research_routes.workbook_page') as reader:
        response = client.post('/api/research/workbook', data=raw, content_type=MIME)
        assert response.status_code == 413
        response = client.post('/api/research/workbook', content_type=MIME,
            environ_overrides={'wsgi.input': io.BytesIO(raw), 'wsgi.input_terminated': True, 'CONTENT_LENGTH': ''})
        assert response.status_code == 413
        reader.assert_not_called()


def test_http_resource_limits_return_422_without_partial_rows(client):
    with patch('src.routes.research_routes.workbook_page', side_effect=ResourceLimit('time budget exceeded')):
        result = client.post('/api/research/workbook', data=_package(), content_type=MIME)
    assert result.status_code == 422
    assert result.headers['Cache-Control'] == 'no-store'
    assert result.get_json() == {'error': 'time budget exceeded', 'status': 'resource_limit'}
