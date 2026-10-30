// Verify generated prepared batches against the original workbook, then run them.
// Set RESEARCH_WORKBOOK_PATH and BATCH_DIR; all browser state is isolated.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

(async () => {
  assert(process.env.RESEARCH_WORKBOOK_PATH, 'Set RESEARCH_WORKBOOK_PATH to the original 4D-NOD workbook.');
  assert(process.env.BATCH_DIR, 'Set BATCH_DIR to the directory containing the three prepared batch JSON files.');
  const workbookPath = path.resolve(process.env.RESEARCH_WORKBOOK_PATH);
  const batchDirectory = path.resolve(process.env.BATCH_DIR);
  const catalog = await import(pathToFileURL(path.join(__dirname, '../../src/static/research/catalog.mjs')));
  const notebook = await import(pathToFileURL(path.join(__dirname, '../../src/static/research/notebook.mjs')));
  // Read the supplied XLSX independently of the app's XLSX parser or export code.
  const readWorkbook = String.raw`
import hashlib,json,posixpath,re,sys,xml.etree.ElementTree as ET
from pathlib import Path
from zipfile import ZipFile
source=Path(sys.argv[1]); ns={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
with ZipFile(source) as archive:
    rels={r.attrib['Id']:r.attrib['Target'] for r in ET.fromstring(archive.read('xl/_rels/workbook.xml.rels'))}
    sheet=next(s for s in ET.fromstring(archive.read('xl/workbook.xml')).find('s:sheets',ns) if s.attrib['name']=='Triple examples')
    target=rels[sheet.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']]
    member=target.lstrip('/') if target.startswith('/') else posixpath.normpath(posixpath.join('xl',target))
    shared=[]
    if 'xl/sharedStrings.xml' in archive.namelist():
        shared=[''.join(t.text or '' for t in item.findall('.//s:t',ns)) for item in ET.fromstring(archive.read('xl/sharedStrings.xml'))]
    headers={}; results=[]
    for row in ET.fromstring(archive.read(member)).find('s:sheetData',ns):
        number=int(row.attrib['r']); cells={}
        for cell in row:
            assert cell.find('s:f',ns) is None, 'Source fixture unexpectedly contains a formula.'
            column=re.match(r'[A-Z]+',cell.attrib['r']).group(); kind=cell.attrib.get('t'); value=cell.find('s:v',ns)
            if kind=='inlineStr': value=''.join(t.text or '' for t in cell.findall('.//s:t',ns))
            elif kind=='s': value=shared[int(value.text)]
            else: value='' if value is None else value.text or ''
            cells[column]=value
        if number==5: headers=cells
        elif number>=6 and any(cells.values()):
            fields={name:cells.get(column,'') for column,name in headers.items()}
            results.append({'excel_row':str(number),'source_id':fields['Triple ID'],
                'piece_ids':[fields['Piece '+label+' ID'] for label in 'ABC'],
                'sequences':[fields['Piece '+label+' sequence'] for label in 'ABC']})
print(json.dumps({'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'rows':results}))
`;
  const original = JSON.parse(execFileSync(process.env.PYTHON_PATH || 'python', ['-c', readWorkbook, workbookPath], { encoding: 'utf8', maxBuffer: 2000000 }));
  assert.equal(original.rows.length, 216);
  const expected = original.rows.map((row, index) => {
    assert.equal(row.excel_row, String(index + 6));
    assert.equal(row.source_id, `C${String(index + 1).padStart(4, '0')}`);
    const candidate = catalog.tripleFromWords(row.sequences);
    assert.deepEqual(candidate.pieces.map(piece => piece.candidate_id), row.piece_ids);
    return { candidate, source: { type: 'xlsx', filename: path.basename(workbookPath), sha256: original.sha256, sheet: 'Triple examples', excel_row: row.excel_row, source_id: row.source_id } };
  });
  const files = [];
  for (const filename of (await fs.readdir(batchDirectory)).filter(name => /^4D_NOD_workbook_batch_\d+_.+\.json$/.test(name))) {
    const absolute = path.join(batchDirectory, filename), data = JSON.parse(await fs.readFile(absolute, 'utf8'));
    if (data.schema_version === '1' && Array.isArray(data.records)) files.push({ path: absolute, filename, data });
  }
  files.sort((a, b) => Number(a.data.records[0].source.excel_row) - Number(b.data.records[0].source.excel_row));
  assert.equal(files.length, 3);
  assert.deepEqual(files.map(file => file.data.records.length), [100, 100, 16]);
  let offset = 0;
  for (const file of files) {
    const rows = file.data.records, ids = expected.slice(offset, offset + rows.length).map(row => row.candidate.candidate_id);
    const batchIds = new Set(rows.map(row => row.batch.id)); assert.equal(batchIds.size, 1);
    rows.forEach((record, index) => {
      assert.equal(record.candidate.candidate_id, ids[index]);
      assert.deepEqual(record.candidate.pieces.map(piece => piece.operations), expected[offset + index].candidate.pieces.map(piece => piece.operations));
      assert.deepEqual(record.source, expected[offset + index].source);
      assert.equal(record.geometry, null); assert.equal(record.result, null); assert.equal(record.archived_result ?? null, null);
      assert.equal(record.batch.indexing, 'explicit-list'); assert.equal(record.batch.geometry_source, 'none');
      assert.equal(record.batch.max_operations, null); assert.equal(record.batch.start, String(offset));
      assert.equal(record.batch.count, rows.length); assert.equal(record.batch.row_rank, String(offset + index));
      assert.deepEqual(record.batch.candidate_ids, ids);
    });
    assert.equal(notebook.validateNotebook(file.data).length, rows.length);
    offset += rows.length;
  }
  assert.equal(new Set(files.flatMap(file => file.data.records.map(record => record.candidate.candidate_id))).size, 216);
  const base = process.env.BASE_URL || process.env.RESEARCH_BASE_URL || 'http://127.0.0.1:5055';
  const evidence = path.resolve(__dirname, '../../../research-app/evidence'); await fs.mkdir(evidence, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, acceptDownloads: true });
  const key = '4d-nod-research-notebook-v1';
  const errors = [], outcomes = [], requests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    const favicon = message.text().includes('404') && /\/favicon\.ico(?:\?|$)/.test(message.location().url || '');
    if (message.type() === 'error' && !favicon) errors.push(message.text());
  });
  page.on('request', request => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/research/assess') requests.push(JSON.parse(request.postData()));
  });
  const pass = name => { outcomes.push(name); console.log(`PASS ${name}`); };
  const stored = () => page.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]'), key);
  async function download(button, filename, target = page) {
    const waiting = target.waitForEvent('download'); await target.locator(button).click();
    const item = await waiting, output = path.join(evidence, filename); await item.saveAs(output); return output;
  }
  async function removeBatch(accept) {
    const waiting = page.waitForEvent('dialog').then(async dialog => {
      assert.equal(dialog.type(), 'confirm'); assert.match(dialog.message(), /remove|delete/i);
      if (accept) await dialog.accept(); else await dialog.dismiss();
    });
    await page.locator('#batch-remove').click(); await waiting;
  }
  try {
    pass('three prepared files exactly match all 216 original workbook examples and provenance');
    await page.goto(`${base}/research`);
    await page.locator('#control-select option[value="three_piece_s4"]').waitFor({ state: 'attached' });
    await page.locator('#batch-auto-export').uncheck();
    let unrelated = null, globalOffset = 0;
    for (const [part, file] of files.entries()) {
      const count = file.data.records.length;
      if (part === 2) {
        await page.locator('#save-candidate').click();
        unrelated = (await stored())[0];
        assert.equal(unrelated.candidate.candidate_id, 'TR-P00000-P00000-P00000');
        assert.equal(unrelated.batch, undefined);
      }
      // Exercise the visible prepared-batch import control and its existing picker.
      const picker = page.waitForEvent('filechooser'); await page.locator('#batch-import').click();
      await (await picker).setFiles(file.path);
      await page.waitForFunction(({ k, n }) => JSON.parse(localStorage.getItem(k) || '[]').filter(record => record.batch).length === n, { k: key, n: count });
      let records = await stored(), selected = await page.locator('#batch-select').inputValue();
      const imported = records.filter(record => record.batch?.id === selected);
      assert.equal(imported.length, count); assert.equal(await page.locator('#batch-results tr').count(), count);
      assert(imported.every(record => record.geometry === null && record.result === null));
      assert.notEqual(selected, file.data.records[0].batch.id, 'Import must allocate a separate local batch identity.');
      const label = (await page.locator('#batch-select option:checked').innerText()).replace(/[–—]/g, '-').replace(/\s+/g, '');
      assert.match(label, /workbook/i); assert(label.includes(`${globalOffset + 1}-${globalOffset + count}`));
      assert.equal(await page.locator('#batch-resume').isEnabled(), true);
      const beforeRequests = requests.length;
      let queueRoute;
      if (part === 0) {
        let release, started;
        const gate = new Promise(resolve => { release = resolve; });
        const underway = new Promise(resolve => { started = resolve; });
        let first = true;
        queueRoute = async route => { if (first) { first = false; started(); await gate; } await route.continue(); };
        await page.route('**/api/research/assess', queueRoute);
        await page.locator('#batch-resume').click(); await underway;
        assert.equal(await page.locator('#batch-remove').isDisabled(), true);
        release();
      } else await page.locator('#batch-resume').click();
      await page.waitForFunction(({ k, id, n }) => {
        const rows = JSON.parse(localStorage.getItem(k) || '[]').filter(record => record.batch?.id === id);
        return rows.length === n && rows.every(record => record.result) && document.querySelector('#batch-pause').disabled;
      }, { k: key, id: selected, n: count }, { timeout: 180000 });
      if (queueRoute) await page.unroute('**/api/research/assess', queueRoute);
      records = await stored(); const completed = records.filter(record => record.batch?.id === selected);
      assert.equal(requests.length - beforeRequests, count);
      assert.deepEqual(requests.slice(beforeRequests).map(payload => payload.candidate.candidate_id), expected.slice(globalOffset, globalOffset + count).map(row => row.candidate.candidate_id));
      assert(requests.slice(beforeRequests).every(payload => payload.geometry === null));
      completed.forEach((record, index) => {
        assert.equal(record.result.status, 'not_tested'); assert(record.result.checks.every(check => check.status === 'not_tested'));
        assert.equal(record.result.candidate.candidate_id, expected[globalOffset + index].candidate.candidate_id);
        assert.deepEqual(record.source, expected[globalOffset + index].source);
      });
      const checkpointPath = await download('#batch-export-json', `prepared-workbook-part-${part + 1}-checkpoint.json`);
      const checkpoint = JSON.parse(await fs.readFile(checkpointPath, 'utf8'));
      assert.deepEqual(checkpoint.records, completed);
      assert.equal(notebook.validateNotebook(checkpoint, { restore: true }).filter(record => record.result).length, count);
      const csvPath = await download('#batch-export-csv', `prepared-workbook-part-${part + 1}-results.csv`);
      const csv = catalog.parseCsv(await fs.readFile(csvPath, 'utf8')), header = csv[0];
      assert.equal(csv.length, count + 1);
      assert.deepEqual(csv.slice(1).map(row => row[header.indexOf('Candidate ID')]), completed.map(record => record.candidate.candidate_id));
      assert(csv.slice(1).every(row => row[header.indexOf('Assessment state')] === 'not_tested'));
      assert(csv.slice(1).every(row => row[header.indexOf('Geometry source')] === 'none'));
      assert(csv.slice(1).every(row => row[header.indexOf('Indexing')] === 'explicit-list'));
      assert.deepEqual(csv.slice(1).map(row => row[header.indexOf('Source ID')]), completed.map(record => record.source.source_id));
      assert.deepEqual(csv.slice(1).map(row => row[header.indexOf('Excel row')]), completed.map(record => record.source.excel_row));
      if (part === 0) {
        const beforeRejected = JSON.stringify(records);
        await page.locator('#session-file').setInputFiles(files[1].path);
        await page.waitForFunction(() => document.querySelector('#message').classList.contains('error') && /100|limit/i.test(document.querySelector('#message').textContent));
        assert.equal(JSON.stringify(await stored()), beforeRejected, 'An over-capacity next batch must not mutate completed evidence.');
        await removeBatch(false);
        assert.equal(JSON.stringify(await stored()), beforeRejected, 'Dismissing removal confirmation must preserve the batch.');
      }
      await removeBatch(true);
      await page.waitForFunction(k => JSON.parse(localStorage.getItem(k) || '[]').every(record => !record.batch), key);
      assert.deepEqual(await stored(), unrelated ? [unrelated] : []);
      assert.equal(await page.locator('#batch-remove').isDisabled(), true);
      pass(`workbook examples ${globalOffset + 1}-${globalOffset + count} import as a named batch, run exact inputs, export evidence and remove safely`);
      globalOffset += count;
    }
    assert.equal(requests.length, 216); assert.equal(new Set(requests.map(payload => payload.candidate.candidate_id)).size, 216);
    assert.deepEqual(await stored(), [unrelated]);
    assert.equal(createHash('sha256').update(await fs.readFile(workbookPath)).digest('hex'), original.sha256);
    pass('all 216 examples were assessed once while the unrelated notebook record and source workbook stayed unchanged');

    const shuffledPage = await browser.newPage({ viewport: { width: 1440, height: 1100 }, acceptDownloads: true });
    const shuffledRequests = [];
    shuffledPage.on('pageerror', error => errors.push(error.message));
    shuffledPage.on('console', message => {
      const favicon = message.text().includes('404') && /\/favicon\.ico(?:\?|$)/.test(message.location().url || '');
      if (message.type() === 'error' && !favicon) errors.push(message.text());
    });
    shuffledPage.on('request', request => {
      if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/research/assess') shuffledRequests.push(JSON.parse(request.postData()));
    });
    await shuffledPage.goto(`${base}/research`);
    await shuffledPage.locator('#control-select option[value="three_piece_s4"]').waitFor({ state: 'attached' });
    await shuffledPage.locator('#batch-auto-export').uncheck();
    const reversed = { ...files[2].data, records: [...files[2].data.records].reverse() };
    await shuffledPage.locator('#session-file').setInputFiles({ name: 'shuffled-workbook-batch.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(reversed)) });
    await shuffledPage.waitForFunction(() => document.querySelectorAll('#batch-results tr').length === 16);
    const finalIds = expected.slice(200).map(row => row.candidate.candidate_id);
    assert.deepEqual(await shuffledPage.locator('#batch-results tr').evaluateAll(rows => rows.map(row => row.cells[1].querySelector('code').textContent)), finalIds);
    await shuffledPage.locator('#batch-resume').click();
    await shuffledPage.waitForFunction(k => {
      const rows = JSON.parse(localStorage.getItem(k) || '[]');
      return rows.length === 16 && rows.every(record => record.result) && document.querySelector('#batch-pause').disabled;
    }, key, { timeout: 180000 });
    assert.deepEqual(shuffledRequests.map(payload => payload.candidate.candidate_id), finalIds);
    const shuffledExport = JSON.parse(await fs.readFile(await download('#batch-export-json', 'prepared-workbook-shuffled-checkpoint.json', shuffledPage), 'utf8'));
    assert.deepEqual(shuffledExport.records.map(record => record.candidate.candidate_id), finalIds);
    assert.deepEqual(shuffledExport.records.map(record => record.batch.row_rank), Array.from({ length: 16 }, (_, index) => String(index + 200)));
    const shuffledCsv = catalog.parseCsv(await fs.readFile(await download('#batch-export-csv', 'prepared-workbook-shuffled-results.csv', shuffledPage), 'utf8'));
    assert.deepEqual(shuffledCsv.slice(1).map(row => row[shuffledCsv[0].indexOf('Candidate ID')]), finalIds);
    await shuffledPage.context().close();
    assert.deepEqual(errors, []);
    pass('shuffled explicit-list records display, run and export in validated manifest order');
    const report = { base, counts: files.map(file => file.data.records.length), source_sha256: original.sha256, outcomes, requests: requests.length, shuffledRequests: shuffledRequests.length, errors, completed: new Date().toISOString() };
    await fs.writeFile(path.join(evidence, 'prepared-workbook-batches-browser-checks.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ passed: outcomes.length, requests: requests.length, errors, evidence }, null, 2));
  } catch (error) {
    await page.screenshot({ path: path.join(evidence, 'prepared-workbook-batches-failure.png'), fullPage: true }).catch(() => {});
    console.error('Application errors:', errors); throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
