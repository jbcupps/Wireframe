// End-to-end research workspace checks. Uses bundled Playwright via NODE_PATH.
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

(async () => {
  const catalog = await import(pathToFileURL(path.join(__dirname, '../../src/static/research/catalog.mjs')));
  const evidence = path.resolve(__dirname, '../../../research-app/evidence');
  await fs.mkdir(evidence, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, acceptDownloads: true });
  const errors = [], outcomes = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    const missingFavicon = message.text().includes('404') && /\/favicon\.ico(?:\?|$)/.test(message.location().url || '');
    if (message.type() === 'error' && !missingFavicon) errors.push(message.text());
  });
  const base = process.env.RESEARCH_BASE_URL || 'http://127.0.0.1:5055';
  const record = name => { outcomes.push(name); console.log(`PASS ${name}`); };
  const waitNotice = text => page.waitForFunction(value => document.querySelector('#message')?.textContent.includes(value), text);
  const readWords = async () => Promise.all(['A', 'B', 'C'].map(piece => page.getByRole('textbox', { name: `Piece ${piece} sequence`, exact: true }).inputValue()));
  async function download(button, filename) {
    const waiting = page.waitForEvent('download'); await page.locator(button).click();
    const item = await waiting, destination = path.join(evidence, filename); await item.saveAs(destination); return destination;
  }
  async function assess() {
    const waiting = page.waitForResponse(response => response.url().endsWith('/api/research/assess') && response.request().method() === 'POST');
    await page.locator('#assess').click(); const response = await waiting;
    assert.equal(response.status(), 200, await response.text()); const report = await response.json();
    await waitNotice('Assessment complete'); return report;
  }
  async function control(id) {
    await page.locator('#control-select').selectOption(id); await page.locator('#load-control').click();
    await waitNotice('Control loaded'); return assess();
  }
  try {
    let connected = false;
    for (let attempt = 0; attempt < 40; attempt++) {
      try { await page.goto(`${base}/research`, { timeout: 2500 }); connected = true; break; }
      catch { await new Promise(resolve => setTimeout(resolve, 750)); }
    }
    assert(connected, 'Research development server did not become available.');
    await page.locator('#control-select option[value="three_piece_s4"]').waitFor({ state: 'attached' });
    assert.equal(await page.locator('#catalog-body tr').count(), 20);
    assert.match(await page.locator('#catalog-summary').innerText(), /33,825/);
    assert.match(await page.locator('#visualization').innerText(), /Geometry not yet defined/);
    record('initial bounded catalog and undefined geometry');

    await page.locator('#catalog-search').fill('Txy+ · Lw− · Pzw+'); await page.locator('#search-word').click();
    assert.equal(await page.locator('#catalog-body tr').count(), 1);
    const searched = catalog.wordId(['Txy+', 'Lw-', 'Pzw+']);
    assert.match(await page.locator('#catalog-body').innerText(), new RegExp(searched));
    await page.getByRole('button', { name: `Use ${searched} for piece A`, exact: true }).click();
    assert.equal((await readWords())[0], 'Txy+ · Lw− · Pzw+');
    await page.locator('#catalog-search').fill('P00000'); await page.locator('#search-word').click();
    assert.match(await page.locator('#catalog-body').innerText(), /∅/);
    record('exact sequence and stable-ID search');

    await page.getByRole('button', { name: 'Clear piece A', exact: true }).click();
    for (const operation of ['Txy+', 'Lw-', 'Pxy+']) {
      await page.getByLabel('Operation for piece A', { exact: true }).selectOption(operation);
      await page.getByRole('button', { name: 'Add operation to piece A', exact: true }).click();
    }
    await page.getByRole('button', { name: 'Repeat A operation 2', exact: true }).click();
    await page.getByRole('button', { name: 'Move A operation 4 up', exact: true }).click();
    await page.getByRole('button', { name: 'Remove A operation 1', exact: true }).click();
    assert.equal((await readWords())[0], 'Lw− · Pxy+ · Lw−');
    await page.getByRole('textbox', { name: 'Piece B sequence', exact: true }).fill('Txy− → Txy+ → Txy−');
    await page.getByRole('button', { name: 'Apply piece B sequence', exact: true }).click();
    assert.equal((await readWords())[1], 'Txy− · Txy+ · Txy−');
    assert.equal(await page.locator('#candidate-id').innerText(), catalog.tripleFromWords([['Lw-', 'Pxy+', 'Lw-'], ['Txy-', 'Txy+', 'Txy-'], []]).candidate_id);
    record('independent A/B/C builder, repeat, reorder, remove and normalization');

    await page.locator('#catalog-kind').selectOption('triples');
    assert.match(await page.locator('#catalog-summary').innerText(), /38,700,218,390,625/);
    await page.locator('#catalog-start').fill('38700218390624'); await page.locator('#catalog-go').click();
    assert.equal(await page.locator('#catalog-body tr').count(), 1);
    await page.getByRole('button', { name: 'Use triple', exact: true }).click();
    assert.deepEqual(await readWords(), Array(3).fill('Pzw− · Pzw− · Pzw−'));
    await page.locator('#catalog-scope').selectOption('unbounded');
    await page.locator('#catalog-start').fill('90071992547409930001'); await page.locator('#catalog-go').click();
    await page.getByRole('button', { name: 'Use triple', exact: true }).first().click();
    assert.equal(await page.locator('#candidate-id').innerText(), catalog.tripleFromWords(catalog.unboundedTripleAt('90071992547409930001')).candidate_id);
    record('bounded last triple and arbitrary-precision unbounded lookup');

    const csv = '\uFEFF"Row","Piece A sequence","Piece B sequence","Piece C sequence","Gluing / closure / smoothness"\r\n"90071992547409930001","Txy+ → Txy+","Lw− · Pxy+","empty word","not tested"';
    await page.locator('#csv-file').setInputFiles({ name: 'unicode-explorer-page.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
    await waitNotice('CSV imported'); assert.equal(await page.locator('#catalog-body tr').count(), 1);
    assert.match(await page.locator('#catalog-body tr').innerText(), /90071992547409930001/);
    await page.getByRole('button', { name: 'Use triple', exact: true }).click();
    assert.deepEqual(await readWords(), ['Txy+ · Txy+', 'Lw− · Pxy+', '∅']);
    const pageCsv = await download('#export-page', 'workflow-page.csv');
    const parsed = catalog.readExplorerCsv(await fs.readFile(pageCsv, 'utf8'));
    assert.equal(parsed.length, 1); assert.equal(parsed[0].source_row, '90071992547409930001');
    const unmodeled = await assess();
    assert.equal(unmodeled.assembled, null); assert(unmodeled.checks.every(check => check.status === 'not_tested'));
    assert.match(await page.locator('#results').innerText(), /Not tested \/ undetermined/);
    record('Unicode explorer CSV page roundtrip to qualified unmodeled assessment');

    const s4 = await control('three_piece_s4');
    assert.equal(s4.assembled.dimension, 4); assert.deepEqual(s4.assembled.betti_numbers_mod2, [1, 0, 0, 0, 1]);
    assert.equal(s4.assembled.boundary_tetrahedra.length, 0);
    assert.equal(s4.checks.find(check => check.id === 'manifold').status, 'not_tested');
    assert.match(await page.locator('#visualization h3').innerText(), /SCHEMATIC/);
    const exportedResult = await download('#export-result', 'workflow-s4-result.json');
    assert.equal(JSON.parse(await fs.readFile(exportedResult, 'utf8')).input_sha256, s4.input_sha256);
    record('4-sphere control exact Betti result and qualified export');

    const branched = await control('branched_tetrahedron');
    assert.deepEqual(branched.assembled.overfull_tetrahedra, [{ facet: [0, 1, 2, 3], incidence: 3 }]);
    assert.equal(branched.checks.find(check => check.id === 'facet_incidence').status, 'failed');
    assert.match(await page.getByLabel('Inspect calculated faces').innerText(), /incidence 3/);
    const singular = await control('singular_vertex');
    assert.equal(singular.checks.find(check => check.id === 'facet_incidence').status, 'passed');
    assert.equal(singular.checks.find(check => check.id === 'vertex_link_connectivity').status, 'failed');
    assert.equal(singular.checks.find(check => check.id === 'manifold').status, 'failed');
    record('branched incidence and singular vertex controls distinguish necessary checks');

    await page.locator('#save-candidate').click();
    await page.getByText('Session notebook & resumable queue', { exact: true }).click();
    const notebook = await download('#export-session', 'workflow-notebook.json');
    const backup = JSON.parse(await fs.readFile(notebook, 'utf8'));
    assert.equal(backup.records.length, 1); assert.equal(backup.records[0].result.input_sha256, singular.input_sha256);
    await page.locator('#session-file').setInputFiles(notebook); await waitNotice('Imported 1 notebook records');
    assert.equal(await page.locator('#notebook .notebook-row').count(), 2);
    await page.locator('#notebook .notebook-row').last().getByRole('button', { name: 'Load', exact: true }).click();
    assert.match(await page.locator('#results').innerText(), /Not tested/);
    assert.equal(await page.getByLabel('Inspect calculated faces').isDisabled(), true);
    assert.equal(await page.locator('#export-result').isDisabled(), true);
    const archivedWaiting = page.waitForEvent('download');
    await page.locator('#notebook .notebook-row').last().getByRole('button', { name: 'Export archived report', exact: true }).click();
    const archivedDownload = await archivedWaiting;
    const archivedPath = path.join(evidence, 'workflow-archived-report.json'); await archivedDownload.saveAs(archivedPath);
    assert.equal(JSON.parse(await fs.readFile(archivedPath, 'utf8')).input_sha256, singular.input_sha256);
    const selectedCsv = await download('#export-selected', 'workflow-selected.csv');
    assert.equal(catalog.readExplorerCsv(await fs.readFile(selectedCsv, 'utf8'))[0].item.candidate_id, backup.records[0].candidate.candidate_id);
    record('notebook save, export, import quarantine, archived report export and selected CSV');

    const mismatched = { ...backup.records[0], geometry: branched.input.geometry, result: s4 };
    await page.locator('#session-file').setInputFiles({ name: 'mismatched-notebook.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ schema_version: '1', records: [mismatched] })) });
    await waitNotice('Imported 1 notebook records');
    await page.locator('#notebook .notebook-row').last().getByRole('button', { name: 'Load', exact: true }).click();
    assert.match(await page.locator('#geometry-json').inputValue(), /branched_tetrahedron/);
    assert.match(await page.locator('#results').innerText(), /Not tested/);
    assert.equal(await page.locator('#results .metric-strip').count(), 0);
    assert.equal(await page.getByLabel('Inspect calculated faces').isDisabled(), true);
    const recomputed = await assess();
    assert.equal(recomputed.checks.find(check => check.id === 'facet_incidence').status, 'failed');
    assert.deepEqual(recomputed.assembled.overfull_tetrahedra, [{ facet: [0, 1, 2, 3], incidence: 3 }]);
    record('S4 report paired with branched geometry quarantined until rerun finds obstruction');

    const oversizedReport = structuredClone(s4);
    oversizedReport.visualization.overfull_faces = [{ facet: Array.from({ length: 10000 }, (_, i) => i), incidence: 3 }];
    const oversizedRecord = { ...mismatched, result: oversizedReport };
    await page.locator('#session-file').setInputFiles({ name: 'oversized-report-notebook.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ schema_version: '1', records: [oversizedRecord] })) });
    await waitNotice('Imported 1 notebook records');
    await page.locator('#notebook .notebook-row').last().getByRole('button', { name: 'Load', exact: true }).click();
    assert.match(await page.locator('#results').innerText(), /Not tested/);
    assert.equal(await page.getByLabel('Inspect calculated faces').isDisabled(), true);
    assert.equal(await page.locator('#visualization svg line').count(), 18);
    assert.equal(await page.locator('#notebook .notebook-row').last().getByRole('button', { name: 'Export archived report', exact: true }).isVisible(), true);
    record('imported 10,000-vertex face remains archived without graph expansion or highlights');

    await page.locator('#clear-geometry').click();
    for (let i = 0; i < 3; i++) await page.locator('#save-candidate').click();
    const slowRoute = async route => { await new Promise(resolve => setTimeout(resolve, 600)); try { await route.continue(); } catch {} };
    await page.route('**/api/research/assess', slowRoute);
    await page.locator('#run-queue').click();
    await page.waitForFunction(() => document.querySelector('#queue-status').textContent.includes('Processing'));
    await page.locator('#stop-queue').click(); await waitNotice('Queue paused');
    assert.equal(await page.locator('#run-queue').isEnabled(), true);
    assert.equal(await page.locator('#notebook .notebook-row').filter({ hasText: 'pending' }).count(), 6);
    await page.unroute('**/api/research/assess', slowRoute);
    await page.locator('#run-queue').click(); await waitNotice('Queue complete');
    assert.equal(await page.locator('#notebook .notebook-row').filter({ hasText: 'pending' }).count(), 0);
    await page.reload(); await page.locator('#control-select option[value="three_piece_s4"]').waitFor({ state: 'attached' });
    assert.equal(await page.locator('#notebook .notebook-row').count(), 7);
    assert.equal(await page.locator('#notebook .notebook-row').filter({ hasText: 'pending' }).count(), 0);
    await page.getByText('Session notebook & resumable queue', { exact: true }).click();
    await page.locator('#notebook .notebook-row').first().getByRole('button', { name: 'Load', exact: true }).click();
    assert.match(await page.locator('#results').innerText(), /disconnected_links/);
    record('bounded queue pause, resume and browser-local persistence');

    await page.evaluate(({ s4Report }) => {
      const key = '4d-nod-research-notebook-v1';
      const stored = JSON.parse(localStorage.getItem(key));
      stored[0].result = s4Report; // Valid result, but for a different geometry.
      stored[3].result.visualization.overfull_faces = [{ facet: Array.from({ length: 10000 }, (_, i) => i), incidence: 3 }];
      localStorage.setItem(key, JSON.stringify(stored));
    }, { s4Report: s4 });
    await page.reload(); await page.locator('#control-select option[value="three_piece_s4"]').waitFor({ state: 'attached' });
    await page.getByText('Session notebook & resumable queue', { exact: true }).click();
    for (const index of [0, 3]) {
      await page.locator('#notebook .notebook-row').nth(index).getByRole('button', { name: 'Load', exact: true }).click();
      assert.match(await page.locator('#results').innerText(), /Not tested/);
      assert.equal(await page.getByLabel('Inspect calculated faces').isDisabled(), true);
    }
    assert.equal(await page.locator('#notebook .notebook-row').filter({ hasText: 'pending' }).count(), 2);
    record('locally restored stale or oversized reports also quarantined without invalidating other records');

    await control('three_piece_s4');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: path.join(evidence, 'workspace-desktop.png'), fullPage: false });
    await page.locator('.visualization-panel').screenshot({ path: path.join(evidence, 'workspace-assembly.png') });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Mobile layout overflows horizontally.');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: path.join(evidence, 'workspace-mobile.png'), fullPage: true });
    record('desktop and mobile screenshots, no horizontal page overflow');
    assert.deepEqual(errors, [], 'Browser console page errors');
    await fs.writeFile(path.join(evidence, 'workflow-checks.json'), JSON.stringify({ base, outcomes, errors, completed: new Date().toISOString() }, null, 2));
    console.log(JSON.stringify({ passed: outcomes.length, errors, evidence }, null, 2));
  } catch (error) {
    await page.screenshot({ path: path.join(evidence, 'workspace-failure.png'), fullPage: true }).catch(() => {});
    console.error('Browser errors:', errors); throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
