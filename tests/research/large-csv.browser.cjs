// Streaming CSV regression. Fixtures are generated in a private temporary folder.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

(async () => {
  const catalog = await import(pathToFileURL(path.join(__dirname, '../../src/static/research/catalog.mjs')));
  const base = process.env.BASE_URL || process.env.RESEARCH_BASE_URL || 'http://127.0.0.1:5055';
  const evidence = path.resolve(__dirname, '../../../research-app/evidence');
  await fs.mkdir(evidence, { recursive: true });
  const fixtureDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'research-large-csv-'));
  const stressRows = Number(process.env.CSV_STRESS_ROWS || 1000000);
  assert(Number.isSafeInteger(stressRows) && stressRows >= 100000 && stressRows <= 2000000);
  const firstSourceRow = 6000001;
  const quote = value => `"${String(value).replaceAll('"', '""')}"`;
  const note = 'Synthetic "catalog", UTF-8 μ; browser regression only, without geometry or physical evidence. '.padEnd(100, 'x');
  const tails = Array.from({ length: 33825 }, (_, rank) => {
    const operations = catalog.wordAt(rank);
    return ',' + [catalog.formatWord(operations), `P${String(rank).padStart(5, '0')}`, operations.length, note].map(quote).join(',') + '\r\n';
  });
  async function fixture(name, rows) {
    const filename = path.join(fixtureDirectory, name), handle = await fs.open(filename, 'w');
    try {
      await handle.write('\uFEFF"Row","Ordered operation sequence","ID","Length","Source note"\r\n');
      for (let start = 0; start < rows; start += 4096) {
        let chunk = '';
        for (let index = start; index < Math.min(start + 4096, rows); index++) chunk += quote(firstSourceRow + index) + tails[index % tails.length];
        await handle.write(chunk);
      }
    } finally { await handle.close(); }
    return { path: filename, name, rows, bytes: (await fs.stat(filename)).size };
  }
  const large = await fixture('large-100000.csv', 100000);
  const stress = await fixture(`stress-${stressRows}.csv`, stressRows);
  assert(large.bytes > 8000000 && large.bytes < 250000000);
  assert(stress.bytes < 250000000);
  if (stressRows >= 1000000) assert(stress.bytes > 100000000);
  const lateInvalidPath = path.join(fixtureDirectory, 'late-invalid.csv');
  await fs.copyFile(large.path, lateInvalidPath);
  await fs.appendFile(lateInvalidPath, '"6100001","not-an-operation","P00001","1","Invalid final record"\r\n');
  const browser = await chromium.launch({ headless: true, executablePath: process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, acceptDownloads: true });
  page.setDefaultTimeout(30000);
  // Forward real workers unchanged, with deterministic gates for already produced
  // responses. This tests stale-result handling without replacing the parser.
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    const probe = window.__csvProbe = { workers: [], events: [], held: [], holdTypes: [], failNextOpen: false };
    probe.release = ({ type, start, worker } = {}) => {
      const index = probe.held.findIndex(item => (!type || item.data.type === type) && (start === undefined || String(item.data.page?.start) === String(start)) && (worker === undefined || item.worker.testId === worker));
      if (index < 0) throw Error('No matching worker response is held.');
      const [item] = probe.held.splice(index, 1); item.worker.deliver(item.data);
    };
    window.Worker = class ObservedWorker extends EventTarget {
      constructor(url, options) {
        super(); this.native = new NativeWorker(url, options); this.url = String(url);
        this.testId = probe.workers.length; this.terminated = false;
        this.onmessage = null; this.onerror = null; this.onmessageerror = null;
        probe.workers.push(this);
        this.native.onmessage = event => {
          const data = event.data;
          probe.events.push({ worker: this.testId, type: data.type, id: data.id, bytes: data.bytes, totalBytes: data.totalBytes, rows: data.rows, start: data.page?.start });
          if (probe.holdTypes.includes(data.type)) probe.held.push({ worker: this, data });
          else this.deliver(data);
        };
        this.native.onerror = event => { event.preventDefault(); this.fail(event.message); };
        this.native.onmessageerror = () => {
          const event = new MessageEvent('messageerror'); this.dispatchEvent(event); this.onmessageerror?.call(this, event);
        };
      }
      deliver(data) {
        const event = new MessageEvent('message', { data }); this.dispatchEvent(event); this.onmessage?.call(this, event);
      }
      fail(message = 'Synthetic worker failure') {
        const event = new ErrorEvent('error', { message, cancelable: true }); this.dispatchEvent(event); this.onerror?.call(this, event);
      }
      postMessage(...args) {
        if (args[0]?.type === 'open' && probe.failNextOpen) {
          probe.failNextOpen = false; queueMicrotask(() => this.fail()); return;
        }
        this.native.postMessage(...args);
      }
      terminate() { this.terminated = true; this.native.terminate(); }
    };
  });
  const errors = [], outcomes = [], assetUrls = new Set();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    const favicon = message.text().includes('404') && /\/favicon\.ico(?:\?|$)/.test(message.location().url || '');
    if (message.type() === 'error' && !favicon) errors.push(message.text());
  });
  page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/research-assets/')) assetUrls.add(request.url()); });
  const pass = name => { outcomes.push(name); console.log(`PASS ${name}`); };
  const snapshot = async () => ({ body: await page.locator('#catalog-body').innerText(), summary: await page.locator('#catalog-summary').innerText(), start: await page.locator('#catalog-start').inputValue() });
  async function unchanged(previous) { assert.deepEqual(await snapshot(), previous); }
  async function imported(name, total, firstRow) {
    await page.waitForFunction(({ name, total, firstRow }) => {
      const summary = document.querySelector('#catalog-summary').textContent;
      return summary.includes(name) && summary.includes(Number(total).toLocaleString()) && document.querySelector('#catalog-body tr')?.cells[0].textContent === String(firstRow) && document.querySelector('#csv-progress-panel').hidden;
    }, { name, total, firstRow }, { timeout: 180000 });
  }
  async function uploadSmall(name, sourceStart, wordStart, count = 40) {
    const rows = Array.from({ length: count }, (_, index) => ({ source_row: String(sourceStart + index), item: catalog.candidateFromWord(catalog.wordAt(wordStart + index)) }));
    await page.locator('#csv-file').setInputFiles({ name, mimeType: 'text/csv', buffer: Buffer.from(catalog.exportExplorerCsv(rows, 'words')) });
    await imported(name, count, sourceStart); return rows;
  }
  async function jump(start, firstRow, count) {
    await page.locator('#catalog-start').fill(String(start)); await page.locator('#catalog-go').click();
    await page.waitForFunction(({ firstRow, count }) => {
      const rows = document.querySelectorAll('#catalog-body tr');
      return rows.length === count && rows[0]?.cells[0].textContent === String(firstRow);
    }, { firstRow, count });
  }
  async function errorNotice(pattern) {
    await page.waitForFunction(pattern => {
      const message = document.querySelector('#message');
      return message.classList.contains('error') && new RegExp(pattern, 'i').test(message.textContent) && document.querySelector('#csv-progress-panel').hidden;
    }, pattern, { timeout: 180000 });
  }
  try {
    const navigation = await page.goto(`${base}/research`);
    const version = navigation.headers()['x-research-version']; assert.match(version, /^[a-f0-9]{64}$/);
    await page.locator('#control-select option[value="three_piece_s4"]').waitFor({ state: 'attached' });
    assert.equal(await page.locator('[data-research-version]').getAttribute('data-research-version'), version);
    const liveVersion = await page.request.get(`${base}/api/research/version`);
    assert.equal((await liveVersion.json()).version, version);
    await page.locator('#save-candidate').click();
    const notebookBefore = await page.evaluate(() => localStorage.getItem('4d-nod-research-notebook-v1'));
    await uploadSmall('baseline.csv', 90001, 0);
    await page.locator('#csv-file').setInputFiles(large.path); await imported(large.name, large.rows, firstSourceRow);
    assert.equal(await page.locator('#catalog-body tr').count(), 20);
    await jump(99995, firstSourceRow + 99995, 5);
    const expectedFinal = Array.from({ length: 5 }, (_, index) => [String(firstSourceRow + 99995 + index), `P${String((99995 + index) % 33825).padStart(5, '0')}`]);
    assert.deepEqual(await page.locator('#catalog-body tr').evaluateAll(rows => rows.map(row => [row.cells[0].textContent, row.cells[1].textContent])), expectedFinal);
    pass('100,000-row file beyond the old 8 MB limit imports completely with bounded DOM pages');

    const beforeCancel = await snapshot();
    await page.evaluate(() => { window.__csvProbe.holdTypes = ['ready']; });
    await page.locator('#csv-file').setInputFiles(large.path);
    await page.waitForFunction(() => window.__csvProbe.held.some(item => item.data.type === 'ready'));
    assert.equal(await page.locator('#csv-progress-panel').isVisible(), true);
    await page.locator('#csv-cancel').click();
    await page.waitForFunction(() => document.querySelector('#csv-progress-panel').hidden && /cancel/i.test(document.querySelector('#message').textContent));
    await page.evaluate(() => { window.__csvProbe.holdTypes = []; window.__csvProbe.release({ type: 'ready' }); });
    await unchanged(beforeCancel);
    await jump(0, firstSourceRow, 20);
    pass('cancelling an in-flight replacement preserves the previous worker catalog and its navigation');

    await page.evaluate(() => { window.__csvProbe.holdTypes = ['ready']; });
    await page.locator('#csv-file').setInputFiles(large.path);
    await page.waitForFunction(() => window.__csvProbe.held.some(item => item.data.type === 'ready'));
    await page.evaluate(() => { window.__csvProbe.holdTypes = []; });
    await uploadSmall('newest-replacement.csv', 80001, 100);
    const newest = await snapshot();
    await page.evaluate(() => window.__csvProbe.release({ type: 'ready' }));
    await unchanged(newest);
    pass('a replaced import cannot commit a delayed ready message over the newer catalog');

    await page.evaluate(() => { window.__csvProbe.holdTypes = ['page']; });
    await page.locator('#catalog-start').fill('5'); await page.locator('#catalog-go').click();
    await page.waitForFunction(() => window.__csvProbe.held.some(item => String(item.data.page?.start) === '5'));
    await page.locator('#catalog-start').fill('10'); await page.locator('#catalog-go').click();
    await page.waitForFunction(() => window.__csvProbe.held.some(item => String(item.data.page?.start) === '10'));
    await page.evaluate(() => { window.__csvProbe.holdTypes = []; window.__csvProbe.release({ type: 'page', start: 10 }); });
    await page.waitForFunction(() => document.querySelector('#catalog-body tr')?.cells[0].textContent === '80011');
    const latestPage = await snapshot();
    await page.evaluate(() => window.__csvProbe.release({ type: 'page', start: 5 }));
    await unchanged(latestPage);
    pass('out-of-order page responses respect the most recent requested offset');

    const beforeInvalid = await snapshot();
    await page.locator('#csv-file').setInputFiles(lateInvalidPath); await errorNotice('Invalid operation|100002');
    await unchanged(beforeInvalid);
    const invalidProgress = await page.evaluate(() => {
      const worker = window.__csvProbe.workers.length - 1;
      return window.__csvProbe.events.filter(event => event.worker === worker && event.type === 'progress');
    });
    assert(invalidProgress.some(event => event.rows > 50000), 'Late rejection must validate substantial input before failing atomically.');
    await page.evaluate(() => { window.__csvProbe.failNextOpen = true; });
    await page.locator('#csv-file').setInputFiles(large.path); await errorNotice('worker');
    await unchanged(beforeInvalid);
    pass('late invalid records and worker failures leave the prior catalog intact');

    const workersBeforeOversize = await page.evaluate(() => window.__csvProbe.workers.length);
    await page.evaluate(() => {
      const file = new File(['Row,Ordered operation sequence\n1,Txy+'], 'oversized.csv', { type: 'text/csv' });
      const transfer = new DataTransfer(); transfer.items.add(file);
      const input = document.querySelector('#csv-file'); input.files = transfer.files;
      const selected = input.files[0]; window.__oversizeReads = 0;
      Object.defineProperty(selected, 'size', { value: 250000001 });
      for (const method of ['text', 'arrayBuffer', 'slice', 'stream']) Object.defineProperty(selected, method, { value() { window.__oversizeReads++; throw Error('Oversize file was read.'); } });
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await errorNotice('250,000,000|250 MB'); await unchanged(beforeInvalid);
    assert.equal(await page.evaluate(() => window.__oversizeReads), 0);
    assert.equal(await page.evaluate(() => window.__csvProbe.workers.length), workersBeforeOversize);
    pass('files over 250 MB are rejected before a worker is created or file data is read');

    await page.evaluate(() => {
      window.__heartbeat = { ticks: 0, maxGap: 0, last: performance.now() };
      window.__heartbeatTimer = setInterval(() => {
        const now = performance.now(), beat = window.__heartbeat;
        beat.maxGap = Math.max(beat.maxGap, now - beat.last); beat.last = now; beat.ticks++;
      }, 20);
    });
    const started = Date.now();
    await page.locator('#csv-file').setInputFiles(stress.path);
    await page.waitForFunction(() => {
      const worker = window.__csvProbe.workers.length - 1;
      return window.__csvProbe.events.some(event => event.worker === worker && event.type === 'progress' && event.rows > 0);
    }, null, { timeout: 180000 });
    assert.equal(await page.locator('#csv-progress-panel').isVisible(), true);
    assert.match(await page.locator('#csv-progress-text').innerText(), /rows validated|MB/);
    await page.locator('#notebook-section summary').click({ timeout: 5000 });
    assert.equal(await page.locator('#notebook-section').evaluate(node => node.open), true);
    await imported(stress.name, stress.rows, firstSourceRow);
    const durationMs = Date.now() - started;
    const responsiveness = await page.evaluate(() => { clearInterval(window.__heartbeatTimer); return window.__heartbeat; });
    assert(responsiveness.ticks >= 5, 'The main-thread timer must run while the worker validates the file.');
    assert(responsiveness.maxGap < 1500, `Main-thread heartbeat stalled for ${Math.round(responsiveness.maxGap)} ms.`);
    const progress = await page.evaluate(() => {
      const worker = window.__csvProbe.workers.length - 1;
      return window.__csvProbe.events.filter(event => event.worker === worker && event.type === 'progress');
    });
    assert(progress.length >= 2);
    assert(progress.every((event, index) => event.bytes <= stress.bytes && (index === 0 || event.bytes >= progress[index - 1].bytes)));
    assert.equal(await page.locator('#catalog-body tr').count(), 20);
    pass(`${stress.rows.toLocaleString()} rows (${(stress.bytes / 1000000).toFixed(1)} MB) index with progress and a responsive main thread`);

    const finalStart = stress.rows - 5;
    await jump(finalStart, firstSourceRow + finalStart, 5);
    const finalRank = (stress.rows - 1) % 33825;
    const finalId = `P${String(finalRank).padStart(5, '0')}`;
    await page.getByRole('button', { name: `Use ${finalId} for piece A`, exact: true }).click();
    assert.equal(await page.getByRole('textbox', { name: 'Piece A sequence', exact: true }).inputValue(), catalog.formatWord(catalog.wordAt(finalRank)));
    const waiting = page.waitForEvent('download'); await page.locator('#export-page').click();
    const downloaded = await waiting, exportPath = path.join(evidence, 'large-csv-final-page.csv'); await downloaded.saveAs(exportPath);
    const finalRows = catalog.readExplorerCsv(await fs.readFile(exportPath, 'utf8'));
    assert.equal(finalRows.length, 5);
    assert.deepEqual(finalRows.map(row => row.source_row), Array.from({ length: 5 }, (_, index) => String(firstSourceRow + finalStart + index)));
    assert.equal(finalRows.at(-1).item.candidate_id, finalId);
    assert.equal(await page.evaluate(() => localStorage.getItem('4d-nod-research-notebook-v1')), notebookBefore);
    pass('the final indexed page selects and exports exact candidates without modifying saved notebook data');

    const workerUrls = await page.evaluate(() => window.__csvProbe.workers.map(worker => worker.url));
    const prefix = `/research-assets/${version}/`;
    assert(assetUrls.size > 0 && workerUrls.length > 0);
    assert([...assetUrls, ...workerUrls].every(url => new URL(url).pathname.startsWith(prefix)), 'All page and worker assets must share the served release version.');
    await page.locator('#catalog').evaluate(node => window.scrollTo({ top: node.getBoundingClientRect().top + window.scrollY - 125, behavior: 'instant' }));
    await page.screenshot({ path: path.join(evidence, 'large-csv-desktop.png'), fullPage: false });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.locator('#catalog').evaluate(node => window.scrollTo({ top: node.getBoundingClientRect().top + window.scrollY - 125, behavior: 'instant' }));
    await page.screenshot({ path: path.join(evidence, 'large-csv-mobile.png'), fullPage: false });
    await page.locator('#catalog-generated').click();
    await page.waitForFunction(() => document.querySelector('#catalog-body tr')?.cells[0].textContent === '1');
    assert.equal(await page.evaluate(() => window.__csvProbe.workers.filter(worker => !worker.terminated).length), 0);
    assert.deepEqual(errors, []);
    pass('versioned assets, mobile layout and worker cleanup remain coherent after returning to generated mode');
    const report = { base, version, outcomes, errors, fixtures: { large: { rows: large.rows, bytes: large.bytes }, stress: { rows: stress.rows, bytes: stress.bytes } }, durationMs, responsiveness, completed: new Date().toISOString() };
    await fs.writeFile(path.join(evidence, 'large-csv-browser-checks.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ passed: outcomes.length, errors, durationMs, maxMainThreadGapMs: responsiveness.maxGap, evidence }, null, 2));
  } catch (error) {
    await page.screenshot({ path: path.join(evidence, 'large-csv-failure.png'), fullPage: true }).catch(() => {});
    console.error('Application errors:', errors); throw error;
  } finally {
    await browser.close();
    const resolved = path.resolve(fixtureDirectory), temporaryRoot = path.resolve(os.tmpdir()) + path.sep;
    assert(resolved.startsWith(temporaryRoot) && path.basename(resolved).startsWith('research-large-csv-'));
    await fs.rm(resolved, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
