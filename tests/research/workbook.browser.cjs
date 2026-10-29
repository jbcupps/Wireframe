// Run against the supplied workbook using RESEARCH_WORKBOOK_PATH; do not commit that file.
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const { createHash } = require('node:crypto');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

(async () => {
  assert(process.env.RESEARCH_WORKBOOK_PATH, 'Set RESEARCH_WORKBOOK_PATH to the existing 4D-NOD .xlsx workbook.');
  const workbookPath = path.resolve(process.env.RESEARCH_WORKBOOK_PATH);
  const workbookBytes = await fs.readFile(workbookPath);
  const sha256 = createHash('sha256').update(workbookBytes).digest('hex');
  const catalog = await import(pathToFileURL(path.join(__dirname, '../../src/static/research/catalog.mjs')));
  const evidence = path.resolve(__dirname, '../../../research-app/evidence');
  await fs.mkdir(evidence, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, acceptDownloads: true });
  // Edge can evict response bodies from its inspector after a binary upload.
  // Observe a cloned fetch response without changing the real request or response.
  await page.addInitScript(() => {
    const originalFetch = window.fetch;
    window.__workbookResponses = [];
    window.fetch = async function (...args) {
      const response = await originalFetch.apply(this, args);
      if (new URL(response.url).pathname === '/api/research/workbook') {
        response.clone().json().then(body => window.__workbookResponses.push({ status: response.status, body }));
      }
      return response;
    };
  });
  const base = process.env.RESEARCH_BASE_URL || 'http://127.0.0.1:5055';
  const key = '4d-nod-research-notebook-v1';
  const errors = [], outcomes = [], assessments = [];
  let expectedWorkbookError = false, workbookRequests = 0;
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    const url = message.location().url || '';
    const favicon = message.text().includes('404') && /\/favicon\.ico(?:\?|$)/.test(url);
    const plannedFailure = expectedWorkbookError && url.includes('/api/research/workbook');
    if (message.type() === 'error' && !favicon && !plannedFailure) errors.push(message.text());
  });
  page.on('request', request => {
    const pathname = new URL(request.url()).pathname;
    if (request.method() === 'POST' && pathname === '/api/research/workbook') workbookRequests++;
    if (request.method() === 'POST' && pathname === '/api/research/assess') assessments.push(JSON.parse(request.postData()));
  });
  const pass = name => { outcomes.push(name); console.log(`PASS ${name}`); };
  const stored = () => page.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]'), key);
  const readWords = () => Promise.all(['A', 'B', 'C'].map(piece => page.getByRole('textbox', { name: `Piece ${piece} sequence`, exact: true }).inputValue()));
  async function workbookRequest(action, success = true) {
    const before = await page.evaluate(() => window.__workbookResponses.length);
    await action();
    await page.waitForFunction(count => window.__workbookResponses.length > count, before);
    const { status, body } = await page.evaluate(() => window.__workbookResponses.at(-1));
    if (success) {
      assert.equal(status, 200, body.error || 'Workbook request failed.');
      await page.waitForFunction(() => !document.querySelector('#workbook-go').disabled && document.querySelector('#workbook-status').textContent.startsWith('Workbook loaded.'));
    } else {
      assert(status >= 400, 'Malformed workbook must be rejected.');
      await page.waitForFunction(() => document.querySelector('#message').classList.contains('error') && !document.querySelector('#workbook-go').disabled);
    }
    return body;
  }
  async function download(button, filename) {
    const waiting = page.waitForEvent('download'); await page.locator(button).click();
    const item = await waiting, file = path.join(evidence, filename); await item.saveAs(file); return file;
  }
  try {
    await page.goto(`${base}/research`); await page.evaluate(() => localStorage.clear()); await page.reload();
    await page.locator('#workbook-file').waitFor({ state: 'attached' });
    const initial = await workbookRequest(() => page.locator('#workbook-file').setInputFiles(workbookPath));
    assert.equal(initial.sha256, sha256);
    assert.equal(initial.sheet, 'Configurations'); assert.equal(initial.kind, 'words');
    assert.equal(initial.total_rows, 33825); assert.equal(initial.rows.length, 20);
    assert.deepEqual(initial.sheets.map(sheet => sheet.name), ['Scope and schema', 'Operation inventory', 'Configurations', 'Triple examples']);
    const sheets = Object.fromEntries(initial.sheets.map(sheet => [sheet.name, sheet.total_rows]));
    assert.equal(sheets.Configurations, 33825); assert.equal(sheets['Triple examples'], 216);
    assert.equal(initial.rows[0].excel_row, '6'); assert.equal(initial.rows[0].item.candidate_id, 'P00000');
    assert.deepEqual(initial.rows[0].item.operations, []);
    assert.equal(await page.locator('#workbook-body tr').count(), 20);
    assert.equal(await page.locator('#workbook-prev').isDisabled(), true);
    assert.equal(await page.locator('#workbook-save').isDisabled(), true);
    assert.match(await page.locator('#workbook-summary').innerText(), /33,825/);
    assert.match(await page.locator('#workbook-status').innerText(), /No geometry or assessment results were imported/);
    pass('actual workbook upload validates digest, worksheet inventory and first configuration');

    for (const [index, piece] of ['A', 'B', 'C'].entries()) {
      await page.locator('#workbook-body tr').nth(index + 1).getByRole('button', { name: piece, exact: true }).click();
    }
    assert.equal(await page.locator('#candidate-id').innerText(), catalog.tripleFromWords(initial.rows.slice(1, 4).map(row => row.item.operations)).candidate_id);
    assert((await readWords()).every(word => word.length > 0));
    assert.equal(await page.locator('#geometry-json').inputValue(), '');
    await page.locator('#workbook-catalog').click();
    assert.equal(await page.locator('#catalog-body tr').count(), 20);
    assert.match(await page.locator('#catalog-summary').innerText(), /Configurations/);
    assert.equal(await page.locator('#catalog-body tr').first().locator('td').first().innerText(), '6');
    let data = await workbookRequest(() => page.locator('#workbook-next').click());
    assert.equal(data.start, 20); assert.equal(data.rows[0].excel_row, '26');
    data = await workbookRequest(() => page.locator('#workbook-prev').click()); assert.equal(data.start, 0);
    await page.locator('#workbook-start').fill('33825');
    data = await workbookRequest(() => page.locator('#workbook-go').click());
    assert.equal(data.rows.length, 1); assert.equal(data.rows[0].excel_row, '33830');
    assert.equal(data.rows[0].item.candidate_id, 'P33824'); assert.deepEqual(data.rows[0].item.operations, ['Pzw-', 'Pzw-', 'Pzw-']);
    assert.equal(await page.locator('#workbook-next').isDisabled(), true);
    pass('configuration rows populate independent pieces and catalog with exact first/last pagination');

    const scope = await workbookRequest(() => page.locator('#workbook-sheet').selectOption('Scope and schema'));
    assert.equal(scope.kind, 'reference'); assert.equal(scope.total_rows, 17);
    assert.equal(await page.locator('#workbook-body tr').count(), scope.rows.length);
    assert.equal(await page.locator('#workbook-catalog').isDisabled(), true);
    assert.equal(await page.locator('#workbook-save').isDisabled(), true);
    assert.equal(await page.locator('#workbook-body button').count(), 0);
    const referenceText = scope.rows.flatMap(row => row.cells).find(value => typeof value === 'string' && value.trim().length > 10);
    assert(referenceText, 'Reference sheet must expose its original explanatory cells.');
    assert((await page.locator('#workbook-body').innerText()).includes(referenceText));
    const inventory = await workbookRequest(() => page.locator('#workbook-sheet').selectOption('Operation inventory'));
    assert.equal(inventory.kind, 'reference'); assert.equal(inventory.total_rows, 35);
    assert.match(await page.locator('#workbook-body').innerText(), /Txy\+/);
    pass('reference worksheets preserve source text without candidate or evidence actions');

    const triples = await workbookRequest(() => page.locator('#workbook-sheet').selectOption('Triple examples'));
    assert.equal(triples.kind, 'triples'); assert.equal(triples.total_rows, 216); assert.equal(triples.rows.length, 20);
    assert.equal(triples.rows[0].source_id, 'C0001'); assert.equal(triples.rows[0].excel_row, '6');
    assert.equal(triples.rows[0].item.candidate_id, 'TR-P00001-P00001-P00001');
    assert.equal(await page.locator('#workbook-save').isDisabled(), false);
    await page.locator('#workbook-body tr').first().getByRole('button', { name: 'Use triple', exact: true }).click();
    assert.equal(await page.locator('#candidate-id').innerText(), 'TR-P00001-P00001-P00001');
    assert.deepEqual(await readWords(), ['Txy+', 'Txy+', 'Txy+']);
    assert.equal(await page.locator('#geometry-json').inputValue(), '');
    await page.locator('#workbook-catalog').click();
    assert.equal(await page.locator('#catalog-body tr').count(), 20);
    await page.locator('#workbook-save').click();
    await page.waitForFunction(k => JSON.parse(localStorage.getItem(k) || '[]').length === 20, key);
    let saved = await stored();
    assert.deepEqual(saved.map(record => record.candidate.candidate_id), triples.rows.map(row => row.item.candidate_id));
    assert(saved.every(record => record.geometry === null && record.result === null));
    saved.forEach((record, index) => assert.deepEqual(record.source, { type: 'xlsx', filename: path.basename(workbookPath), sha256, sheet: 'Triple examples', excel_row: triples.rows[index].excel_row, source_id: triples.rows[index].source_id }));
    pass('selected triple page saves canonical candidates and complete workbook provenance');

    const previewBeforeFailure = await page.locator('#workbook-body').innerText();
    const goodSummary = await page.locator('#workbook-summary').innerText();
    expectedWorkbookError = true;
    await workbookRequest(() => page.locator('#workbook-file').setInputFiles({ name: 'malformed.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from('This is not an XLSX archive.') }), false);
    expectedWorkbookError = false;
    assert.equal(await page.locator('#workbook-body').innerText(), previewBeforeFailure);
    assert.equal(await page.locator('#workbook-summary').innerText(), goodSummary);
    assert.equal(await page.locator('#workbook-sheet').inputValue(), 'Triple examples');
    const requestCountBeforeOversize = workbookRequests;
    await page.locator('#workbook-file').setInputFiles({ name: 'oversize.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.alloc(3000001) });
    await page.waitForFunction(() => /3 MB upload limit/.test(document.querySelector('#workbook-status').textContent));
    assert.equal(workbookRequests, requestCountBeforeOversize);
    assert.equal(await page.locator('#workbook-body').innerText(), previewBeforeFailure);
    await page.locator('#workbook-file').setInputFiles({ name: 'old-format.xls', mimeType: 'application/vnd.ms-excel', buffer: Buffer.from('not supported') });
    await page.waitForFunction(() => /Choose an .xlsx/.test(document.querySelector('#workbook-status').textContent));
    assert.equal(workbookRequests, requestCountBeforeOversize);
    assert.equal((await stored()).length, 20);
    await page.locator('#workbook-start').fill('216');
    data = await workbookRequest(() => page.locator('#workbook-go').click());
    assert.equal(data.rows.length, 1); assert.equal(data.rows[0].source_id, 'C0216'); assert.equal(data.rows[0].excel_row, '221');
    assert.equal(data.rows[0].item.candidate_id, 'TR-P15334-P15334-P15334');
    await page.locator('#workbook-start').fill('1');
    await workbookRequest(() => page.locator('#workbook-go').click());
    pass('malformed, oversized and unsupported uploads retain the previous valid workbook preview');

    let releaseQueue, startedQueue;
    const queueGate = new Promise(resolve => { releaseQueue = resolve; });
    const queueStarted = new Promise(resolve => { startedQueue = resolve; });
    let firstAssessment = true;
    const gated = async route => {
      if (firstAssessment) { firstAssessment = false; startedQueue(); await queueGate; }
      await route.continue();
    };
    await page.route('**/api/research/assess', gated);
    await page.locator('#workbook-notebook').click();
    assert.equal(await page.locator('#notebook-section').evaluate(node => node.open), true);
    await page.locator('#run-queue').click(); await queueStarted;
    assert.equal(await page.locator('#workbook-save').isDisabled(), true);
    await page.locator('#workbook-save').dispatchEvent('click');
    await page.waitForFunction(() => /Pause the queue before adding spreadsheet triples/.test(document.querySelector('#message').textContent));
    assert.equal((await stored()).length, 20, 'An already running queue must reject spreadsheet additions.');
    releaseQueue();
    await page.waitForFunction(k => {
      const records = JSON.parse(localStorage.getItem(k) || '[]');
      return records.length === 20 && records.every(record => record.result) && document.querySelector('#stop-queue').disabled;
    }, key);
    await page.unroute('**/api/research/assess', gated);
    saved = await stored();
    assert.equal(assessments.length, 20);
    assert(assessments.every(payload => payload.geometry === null));
    assert(saved.every(record => record.result.status === 'not_tested' && record.result.checks.every(check => check.status === 'not_tested')));
    assert.equal(await page.locator('#workbook-save').isDisabled(), false);
    pass('saved spreadsheet rows run through the guarded notebook queue without inferred geometry');

    const notebookFile = await download('#export-session', 'workbook-notebook-checkpoint.json');
    const notebookExport = JSON.parse(await fs.readFile(notebookFile, 'utf8'));
    assert.equal(notebookExport.schema_version, '1'); assert.equal(notebookExport.records.length, 20);
    assert.deepEqual(notebookExport.records.map(record => record.source), saved.map(record => record.source));
    await page.reload(); await page.locator('#control-select option[value="three_piece_s4"]').waitFor({ state: 'attached' });
    const restored = await stored();
    assert.deepEqual(restored.map(record => record.source), saved.map(record => record.source));
    assert.deepEqual(restored.map(record => record.result.input_sha256), saved.map(record => record.result.input_sha256));
    assert.equal(await page.locator('#workbook-controls').isHidden(), true);
    await page.evaluate(() => localStorage.clear()); await page.reload();
    await page.locator('#notebook-section summary').click();
    await page.locator('#session-file').setInputFiles(notebookFile);
    await page.waitForFunction(k => JSON.parse(localStorage.getItem(k) || '[]').length === 20, key);
    const imported = await stored();
    assert.deepEqual(imported.map(record => record.source), saved.map(record => record.source));
    assert(imported.every(record => record.result === null && record.archived_result));
    pass('JSON export, local restore and portable import preserve workbook provenance and evidence rules');

    await workbookRequest(() => page.locator('#workbook-file').setInputFiles(workbookPath));
    await workbookRequest(() => page.locator('#workbook-sheet').selectOption('Triple examples'));
    await page.locator('#workbook').evaluate(node => window.scrollTo({ top: node.getBoundingClientRect().top + window.scrollY - 125, behavior: 'instant' }));
    await page.screenshot({ path: path.join(evidence, 'workbook-desktop.png'), fullPage: false });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.locator('#workbook').evaluate(node => window.scrollTo({ top: node.getBoundingClientRect().top + window.scrollY - 125, behavior: 'instant' }));
    await page.screenshot({ path: path.join(evidence, 'workbook-mobile.png'), fullPage: false });
    assert.deepEqual(errors, []);
    pass('workbook import remains usable on desktop and 390-pixel mobile screens');
    await fs.writeFile(path.join(evidence, 'workbook-browser-checks.json'), JSON.stringify({ base, outcomes, errors, completed: new Date().toISOString() }, null, 2));
    console.log(JSON.stringify({ passed: outcomes.length, errors, evidence }, null, 2));
  } catch (error) {
    await page.screenshot({ path: path.join(evidence, 'workbook-failure.png'), fullPage: true }).catch(() => {});
    console.error('Application errors:', errors); throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
