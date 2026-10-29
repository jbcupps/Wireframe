// Browser regression for bounded research batches. Use bundled Playwright via NODE_PATH.
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

(async () => {
  const catalog = await import(pathToFileURL(path.join(__dirname, '../../src/static/research/catalog.mjs')));
  const notebook = await import(pathToFileURL(path.join(__dirname, '../../src/static/research/notebook.mjs')));
  const evidence = path.resolve(__dirname, '../../../research-app/evidence');
  await fs.mkdir(evidence, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, acceptDownloads: true });
  const base = process.env.RESEARCH_BASE_URL || 'http://127.0.0.1:5055';
  const key = '4d-nod-research-notebook-v1';
  const errors = [], outcomes = [], requests = [];
  let expectApiError = false;
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    const url = message.location().url || '';
    const favicon = message.text().includes('404') && /\/favicon\.ico(?:\?|$)/.test(url);
    const plannedFailure = expectApiError && url.includes('/api/research/assess');
    if (message.type() === 'error' && !favicon && !plannedFailure) errors.push(message.text());
  });
  page.on('request', request => {
    if (request.method() === 'POST' && request.url().endsWith('/api/research/assess')) requests.push(JSON.parse(request.postData()));
  });
  const pass = name => { outcomes.push(name); console.log(`PASS ${name}`); };
  const stored = () => page.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]'), key);
  const batchRecords = async () => (await stored()).filter(record => record.batch);
  async function ready() {
    await page.locator('#batch-run').waitFor();
    await page.locator('#control-select option[value="three_piece_s4"]').waitFor({ state: 'attached' });
  }
  async function reset() {
    await page.goto(`${base}/research`);
    await page.evaluate(() => localStorage.clear());
    await page.reload(); await ready(); requests.length = 0;
  }
  async function configure({ start = '0', count = 3, bound = 1, scope = 'bounded', geometry = 'symbolic', auto = false } = {}) {
    await page.locator('#batch-scope').selectOption(scope);
    await page.locator('#batch-start').fill(start);
    await page.locator('#batch-count').fill(String(count));
    if (scope === 'bounded') await page.locator('#batch-bound').fill(String(bound));
    await page.locator('#batch-geometry').selectOption(geometry);
    await page.locator('#batch-auto-export').setChecked(auto);
  }
  async function waitCompleted(count) {
    await page.waitForFunction(({ k, n }) => {
      const rows = JSON.parse(localStorage.getItem(k) || '[]').filter(record => record.batch);
      return rows.length === n && rows.every(record => record.result) && document.querySelector('#batch-pause').disabled;
    }, { k: key, n: count });
  }
  async function notebookOpen() {
    const summary = page.getByText('Session notebook & resumable queue', { exact: true });
    if (!(await summary.evaluate(node => node.parentElement.open))) await summary.click();
  }
  async function download(button, filename) {
    const waiting = page.waitForEvent('download'); await page.locator(button).click();
    const item = await waiting, file = path.join(evidence, filename); await item.saveAs(file); return file;
  }
  async function saveControl(id) {
    await page.locator('#control-select').selectOption(id); await page.locator('#load-control').click();
    await page.locator('#save-candidate').click();
  }
  async function loadAtByteBudget(record, scenario, previousError = null) {
    const fixture = notebook.validateNotebook({ schema_version: '1', records: [record] }, { restore: true });
    fixture[0].result = null;
    if (previousError) fixture[0].error = previousError;
    else delete fixture[0].error;
    fixture[0].archived_result = '';
    fixture[0].archived_result = 'x'.repeat(notebook.NOTEBOOK_LIMITS.bytes - Buffer.byteLength(JSON.stringify(fixture)));
    assert.equal(notebook.assertNotebookBudget(fixture), notebook.NOTEBOOK_LIMITS.bytes);
    assert.equal(notebook.assertNotebookBudget(notebook.validateNotebook({ schema_version: '1', records: fixture }, { restore: true })), notebook.NOTEBOOK_LIMITS.bytes);
    // Isolate the notebook byte budget from the browser's smaller localStorage quota.
    // The override only applies to this fixture URL and disappears on a normal reset.
    await page.addInitScript(({ k, serialized, token }) => {
      if (new URL(location.href).searchParams.get('byte-budget-fixture') !== token) return;
      const values = new Map([[k, serialized]]);
      Storage.prototype.getItem = name => values.get(String(name)) ?? null;
      Storage.prototype.setItem = (name, value) => { values.set(String(name), String(value)); };
      Storage.prototype.removeItem = name => { values.delete(String(name)); };
      Storage.prototype.clear = () => { values.clear(); };
    }, { k: key, serialized: JSON.stringify(fixture), token: scenario });
    await page.goto(`${base}/research?byte-budget-fixture=${scenario}`); await ready();
    await page.locator('#batch-auto-export').uncheck(); requests.length = 0;
    assert.equal(await page.locator('#batch-results tr').count(), 1);
    return fixture;
  }
  try {
    await reset();
    assert.equal(await page.locator('#batch-auto-export').isChecked(), true);
    await configure(); await page.locator('#batch-generate').click();
    await page.waitForFunction(k => JSON.parse(localStorage.getItem(k) || '[]').filter(record => record.batch).length === 3, key);
    let rows = await batchRecords();
    assert.equal(requests.length, 0, 'Prepare must not silently start server work.');
    assert.deepEqual(rows.map(row => row.candidate.candidate_id), [0, 1, 2].map(rank => catalog.tripleFromWords(catalog.boundedTripleAt(rank, 1)).candidate_id));
    assert.deepEqual(rows.map(row => row.batch.row_rank), ['0', '1', '2']);
    assert(rows.every(row => row.geometry === null && row.result === null));
    assert.equal(await page.locator('#batch-results tr').count(), 3);
    pass('prepare exact bounded triples without geometry inference or server work');

    await page.locator('#batch-resume').click(); await waitCompleted(3);
    rows = await batchRecords();
    assert.equal(requests.length, 3);
    assert(rows.every(row => row.result.status === 'not_tested' && row.result.checks.every(check => check.status === 'not_tested')));
    assert.equal(Number(await page.locator('#batch-progress').getAttribute('value')), 3);
    assert.equal(Number(await page.locator('#batch-progress').getAttribute('max')), 3);
    pass('symbolic batches complete with explicitly untested geometric results');

    await reset(); await saveControl('three_piece_s4');
    await configure({ geometry: 'notebook', auto: true });
    const autoDownload = page.waitForEvent('download');
    await page.locator('#batch-run').click(); await waitCompleted(3);
    const automatic = await autoDownload, autoFile = path.join(evidence, 'batch-auto-checkpoint.json'); await automatic.saveAs(autoFile);
    const autoData = JSON.parse(await fs.readFile(autoFile, 'utf8'));
    rows = await batchRecords();
    assert.equal(autoData.schema_version, '1'); assert.equal(autoData.records.length, 3);
    assert.equal(rows[0].geometry.model.id, 'three_piece_s4');
    assert.deepEqual(rows[0].result.assembled.betti_numbers_mod2, [1, 0, 0, 0, 1]);
    assert(rows.slice(1).every(row => row.geometry === null && row.result.status === 'not_tested'));
    assert(rows.every(row => row.result.checks.find(check => check.id === 'physical_identity').status === 'not_tested'));
    assert.equal(requests.length, 3, 'Saved source entry must not be silently included in the batch run.');
    const csvFile = await download('#batch-export-csv', 'batch-qualified-results.csv');
    const csv = catalog.parseCsv(await fs.readFile(csvFile, 'utf8'));
    const field = name => csv[0].indexOf(name);
    assert.equal(csv.length, 4); assert(field('Qualification') >= 0);
    assert.equal(csv[1][field('Candidate ID')], rows[0].candidate.candidate_id);
    assert.equal(csv[1][field('Model ID')], 'three_piece_s4');
    assert.equal(csv[2][field('Assessment state')], 'not_tested');
    assert.match(csv[1][field('Qualification')], /physical|particle/i);
    pass('exact candidate-ID geometry assignment, qualified CSV and automatic JSON export');

    await reset(); await notebookOpen();
    await page.locator('#session-file').setInputFiles(autoFile);
    await page.waitForFunction(k => JSON.parse(localStorage.getItem(k) || '[]').filter(record => record.batch).length === 3, key);
    rows = await batchRecords();
    assert(rows.every(row => row.result === null && row.archived_result));
    assert.deepEqual(rows.map(row => row.batch.row_rank), ['0', '1', '2']);
    assert.equal(await page.locator('#batch-results tr').count(), 3);
    await page.locator('#batch-auto-export').uncheck();
    await page.locator('#batch-resume').click(); await waitCompleted(3);
    assert.equal(requests.length, 3);
    assert.deepEqual((await batchRecords())[0].result.assembled.betti_numbers_mod2, [1, 0, 0, 0, 1]);
    pass('portable checkpoint import retains metadata and requires report recomputation');

    await reset(); await configure(); await page.locator('#batch-generate').click(); await notebookOpen();
    const beforeImport = await batchRecords(), selectedBeforeImport = await page.locator('#batch-select').inputValue();
    await page.evaluate(() => {
      const original = File.prototype.text;
      File.prototype.text = function () {
        const file = this;
        window.__batchImportWaiting = true;
        return new Promise((resolve, reject) => {
          window.__releaseBatchImport = () => original.call(file).then(resolve, reject);
        });
      };
    });
    await page.locator('#session-file').setInputFiles(autoFile);
    await page.waitForFunction(() => window.__batchImportWaiting === true);
    let releaseImportApi, importApiStarted, firstImportApi = true;
    const importApiGate = new Promise(resolve => { releaseImportApi = resolve; });
    const importApiRequest = new Promise(resolve => { importApiStarted = resolve; });
    const gatedImportApi = async route => {
      if (firstImportApi) { firstImportApi = false; importApiStarted(); await importApiGate; }
      try { await route.continue(); } catch {}
    };
    await page.route('**/api/research/assess', gatedImportApi);
    await page.locator('#batch-resume').click(); await importApiRequest;
    assert.equal(await page.locator('#session-file').isDisabled(), true);
    await page.evaluate(() => window.__releaseBatchImport());
    await page.waitForFunction(() => document.querySelector('#message').classList.contains('error') && /pause|running|active|finish/i.test(document.querySelector('#message').textContent));
    const afterImport = await batchRecords();
    assert.equal(afterImport.length, beforeImport.length, 'A delayed import must not append records while a batch is running.');
    assert.deepEqual(afterImport.map(record => record.id), beforeImport.map(record => record.id));
    assert.equal(await page.locator('#batch-select').inputValue(), selectedBeforeImport, 'A delayed import must not replace the active batch.');
    assert.equal(await page.locator('#batch-pause').isDisabled(), false);
    releaseImportApi(); await waitCompleted(3);
    await page.unroute('**/api/research/assess', gatedImportApi);
    assert.equal(requests.length, 3);
    pass('delayed notebook import is rejected if a batch starts while the file is being read');

    await reset(); await saveControl('three_piece_s4'); await saveControl('branched_tetrahedron');
    await configure({ count: 1, geometry: 'notebook' });
    const sourceCount = (await stored()).length;
    await page.locator('#batch-generate').click();
    await page.waitForFunction(() => document.querySelector('#message').classList.contains('error'));
    assert.match(await page.locator('#message').innerText(), /ambig|different|multiple/i);
    assert.equal((await stored()).length, sourceCount); assert.equal(requests.length, 0);
    pass('ambiguous candidate geometry assignments reject the batch atomically');

    await reset(); await configure({ count: 101 }); await page.locator('#batch-generate').click();
    await page.waitForFunction(() => document.querySelector('#message').classList.contains('error'));
    assert.equal((await stored()).length, 0);
    await configure({ count: 2, bound: 0 }); await page.locator('#batch-generate').click();
    await page.waitForFunction(() => /range|bound|slice|catalog|outside/i.test(document.querySelector('#message').textContent));
    assert.equal((await stored()).length, 0, 'Finite batch must not silently truncate.');
    await configure({ scope: 'unbounded', start: '90071992547409930001', count: 1 }); await page.locator('#batch-generate').click();
    await page.waitForFunction(k => JSON.parse(localStorage.getItem(k) || '[]').length === 1, key);
    rows = await batchRecords();
    assert.equal(rows[0].batch.row_rank, '90071992547409930001');
    assert.equal(rows[0].candidate.candidate_id, catalog.tripleFromWords(catalog.unboundedTripleAt('90071992547409930001')).candidate_id);
    pass('resource bounds and finite range rejection preserve exact large ranks');

    await reset(); await configure(); await page.locator('#batch-generate').click();
    let pauseCalls = 0, secondStarted;
    const secondRequest = new Promise(resolve => { secondStarted = resolve; });
    const delayed = async route => {
      pauseCalls++;
      if (pauseCalls === 2) { secondStarted(); await new Promise(resolve => setTimeout(resolve, 1000)); }
      try { await route.continue(); } catch {}
    };
    await page.route('**/api/research/assess', delayed);
    await page.locator('#batch-resume').click(); await secondRequest;
    assert.equal(await page.locator('#run-queue').isDisabled(), true);
    assert.equal(await page.locator('#assess').isDisabled(), true);
    assert.equal(await page.locator('#save-candidate').isDisabled(), true);
    await page.locator('#batch-pause').click();
    await page.waitForFunction(() => document.querySelector('#batch-pause').disabled);
    rows = await batchRecords(); assert.equal(rows.filter(row => row.result).length, 1);
    const firstId = rows[0].candidate.candidate_id, firstHash = rows[0].result.input_sha256;
    const checkpointFile = await download('#batch-export-json', 'batch-paused-checkpoint.json');
    assert.equal(JSON.parse(await fs.readFile(checkpointFile, 'utf8')).records.filter(row => row.result).length, 1);
    await page.unroute('**/api/research/assess', delayed);
    await page.reload(); await ready(); requests.length = 0;
    rows = await batchRecords(); assert.equal(rows[0].result.input_sha256, firstHash);
    await page.locator('#batch-auto-export').uncheck();
    await page.locator('#batch-resume').click(); await waitCompleted(3);
    assert.equal(requests.length, 2); assert(requests.every(request => request.candidate.candidate_id !== firstId));
    pass('pause checkpoints, mutual exclusion, reload and resume skip completed inputs');

    await reset(); await configure(); await page.locator('#batch-generate').click();
    let errorCalls = 0;
    const limited = async route => {
      errorCalls++;
      if (errorCalls === 2) await route.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({ error: 'Resource limit from test fixture', status: 'resource_limit' }) });
      else await route.continue();
    };
    expectApiError = true; await page.route('**/api/research/assess', limited);
    await page.locator('#batch-resume').click();
    await page.waitForFunction(k => JSON.parse(localStorage.getItem(k) || '[]').some(record => record.error) && document.querySelector('#batch-pause').disabled, key);
    rows = await batchRecords(); assert.equal(errorCalls, 2); assert.equal(rows.filter(row => row.result).length, 1);
    assert.match(rows[1].error, /Resource limit/); assert.equal(rows[2].result, null);
    assert.match(await page.locator('#batch-summary').innerText() + await page.locator('#batch-results').innerText(), /Resource limit|error|failed/i);
    await page.unroute('**/api/research/assess', limited); expectApiError = false; requests.length = 0;
    await page.locator('#batch-resume').click(); await waitCompleted(3);
    assert.equal(requests.length, 2);
    pass('resource-limit failures stop the batch and retain completed evidence for retry');

    await reset(); await configure({ count: 2 }); await page.locator('#batch-generate').click();
    const quotaRoute = async route => {
      // Preflight persistence succeeds; simulate the disk filling during the request.
      await page.evaluate(() => { Storage.prototype.setItem = function () { throw new DOMException('Storage quota fixture', 'QuotaExceededError'); }; });
      await route.continue();
    };
    await page.route('**/api/research/assess', quotaRoute);
    await page.locator('#batch-resume').click();
    await page.waitForFunction(() => document.querySelector('#batch-pause').disabled && /storage|checkpoint|quota/i.test(document.querySelector('#message').textContent));
    assert.equal(requests.length, 1, 'Quota failure must stop before requesting the next item.');
    const quotaFile = await download('#batch-export-json', 'batch-quota-recovery.json');
    const quotaData = JSON.parse(await fs.readFile(quotaFile, 'utf8'));
    assert.equal(quotaData.records.length, 2); assert.equal(quotaData.records.filter(record => record.result).length, 1);
    await page.unroute('**/api/research/assess', quotaRoute);
    pass('storage failure stops work while retaining an exportable in-memory result');

    await reset(); await configure({ count: 1 }); await page.locator('#batch-generate').click();
    const budgetSeed = (await batchRecords())[0];
    const fullNotebook = await loadAtByteBudget(budgetSeed, 'failure');
    const budgetFailure = route => route.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({ error: 'Resource limit at the notebook byte budget', status: 'resource_limit' }) });
    expectApiError = true; await page.route('**/api/research/assess', budgetFailure);
    await page.locator('#batch-resume').click();
    await page.waitForFunction(() => document.querySelector('#batch-pause').disabled && /Resource limit at the notebook byte budget/.test(document.querySelector('#message').textContent));
    const afterBudgetFailure = await stored();
    assert.equal(requests.length, 1);
    assert.equal(JSON.stringify(afterBudgetFailure) === JSON.stringify(fullNotebook), true, 'An error that cannot fit must leave the saved record unchanged.');
    assert.equal(afterBudgetFailure[0].result, null);
    const budgetFailureFile = await download('#batch-export-json', 'batch-byte-budget-failure.json');
    const budgetFailureExport = JSON.parse(await fs.readFile(budgetFailureFile, 'utf8'));
    assert.equal(notebook.assertNotebookBudget(budgetFailureExport.records), notebook.NOTEBOOK_LIMITS.bytes);
    assert.equal(budgetFailureExport.records[0].result, null);
    assert.equal(Object.hasOwn(budgetFailureExport.records[0], 'error'), false);
    assert.equal(JSON.stringify(budgetFailureExport.records) === JSON.stringify(fullNotebook), true, 'An unsuccessful assessment must not mutate the exported checkpoint.');
    await page.unroute('**/api/research/assess', budgetFailure); expectApiError = false;
    pass('queue failure at the notebook byte limit preserves saved and exported inputs');

    const retryNotebook = await loadAtByteBudget(budgetSeed, 'retry', 'Previous request failed. '.padEnd(8000, 'x'));
    await page.locator('#batch-resume').click(); await waitCompleted(1);
    const afterBudgetRetry = await batchRecords();
    assert.equal(requests.length, 1);
    assert.equal(afterBudgetRetry[0].result.status, 'not_tested');
    assert.equal(Object.hasOwn(afterBudgetRetry[0], 'error'), false);
    assert.equal(afterBudgetRetry[0].archived_result.length, retryNotebook[0].archived_result.length);
    assert(notebook.assertNotebookBudget(afterBudgetRetry) < notebook.NOTEBOOK_LIMITS.bytes, 'Replacing the prior error should free enough space for the report.');
    assert(Buffer.byteLength(JSON.stringify([{ ...afterBudgetRetry[0], error: retryNotebook[0].error }])) > notebook.NOTEBOOK_LIMITS.bytes, 'The fixture must require clearing the prior error before checking the report budget.');
    const budgetRetryFile = await download('#batch-export-json', 'batch-byte-budget-retry.json');
    const budgetRetryExport = JSON.parse(await fs.readFile(budgetRetryFile, 'utf8'));
    notebook.assertNotebookBudget(budgetRetryExport.records);
    assert.equal(budgetRetryExport.records[0].result.input_sha256, afterBudgetRetry[0].result.input_sha256);
    assert.equal(Object.hasOwn(budgetRetryExport.records[0], 'error'), false);
    pass('retry replaces a prior error with current evidence within the notebook byte limit');

    await reset(); await configure({ count: 3, auto: false }); await page.locator('#batch-run').click(); await waitCompleted(3);
    await page.locator('#batch-results').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(evidence, 'batch-desktop.png'), fullPage: false });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.locator('#batch-start').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(evidence, 'batch-mobile.png'), fullPage: false });
    assert.deepEqual(errors, []);
    pass('desktop and mobile batch workspace render without application errors');
    await fs.writeFile(path.join(evidence, 'batch-browser-checks.json'), JSON.stringify({ base, outcomes, errors, completed: new Date().toISOString() }, null, 2));
    console.log(JSON.stringify({ passed: outcomes.length, errors, evidence }, null, 2));
  } catch (error) {
    await page.screenshot({ path: path.join(evidence, 'batch-failure.png'), fullPage: true }).catch(() => {});
    console.error('Application errors:', errors); throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
