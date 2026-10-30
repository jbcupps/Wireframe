// Full-workbook CSV regression. Set CSV_PATH to the exported 33,825-row CSV.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

(async () => {
  assert(process.env.CSV_PATH, 'Set CSV_PATH to the complete workbook configuration CSV.');
  const csvPath = path.resolve(process.env.CSV_PATH);
  const catalog = await import(pathToFileURL(path.join(__dirname, '../../src/static/research/catalog.mjs')));
  const source = catalog.readExplorerCsv(await fs.readFile(csvPath, 'utf8'));
  assert.equal(source.length, 33825, 'This regression requires the complete configuration export.');
  source.forEach((row, rank) => {
    assert.equal(row.source_row, String(rank + 6));
    assert.equal(row.item.candidate_id, `P${String(rank).padStart(5, '0')}`);
  });
  const base = process.env.BASE_URL || process.env.RESEARCH_BASE_URL || 'http://127.0.0.1:5055';
  const evidence = path.resolve(__dirname, '../../../research-app/evidence');
  await fs.mkdir(evidence, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, acceptDownloads: true });
  const errors = [], outcomes = [], serverWork = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    const favicon = message.text().includes('404') && /\/favicon\.ico(?:\?|$)/.test(message.location().url || '');
    if (message.type() === 'error' && !favicon) errors.push(message.text());
  });
  page.on('request', request => {
    if (request.method() === 'POST' && /\/api\/research\/(assess|workbook)(?:\?|$)/.test(request.url())) serverWork.push(request.url());
  });
  const pass = name => { outcomes.push(name); console.log(`PASS ${name}`); };
  async function assertImportedPage(start, count) {
    const expected = source.slice(start, start + count).map(row => [row.source_row, row.item.candidate_id]);
    await page.waitForFunction(({ first, n }) => {
      const rows = [...document.querySelectorAll('#catalog-body tr')];
      return rows.length === n && rows[0]?.cells[0].textContent === first;
    }, { first: expected[0][0], n: expected.length });
    const rendered = await page.locator('#catalog-body tr').evaluateAll(rows => rows.map(row => [row.cells[0].textContent, row.cells[1].textContent]));
    assert.deepEqual(rendered, expected);
    assert.equal(await page.locator('#catalog-start').inputValue(), String(start));
    const summary = await page.locator('#catalog-summary').innerText();
    assert.match(summary, /33,825|33825/);
    assert.match(summary, /import|csv/i);
  }
  async function jump(start) {
    await page.locator('#catalog-start').fill(String(start));
    await page.locator('#catalog-go').click();
  }
  async function download(button, filename) {
    const waiting = page.waitForEvent('download'); await page.locator(button).click();
    const item = await waiting, destination = path.join(evidence, filename);
    await item.saveAs(destination); return destination;
  }
  async function rejectedFile(name, buffer, messagePattern) {
    const before = {
      body: await page.locator('#catalog-body').innerText(),
      summary: await page.locator('#catalog-summary').innerText(),
      start: await page.locator('#catalog-start').inputValue(),
      previous: await page.locator('#catalog-prev').isDisabled(),
      next: await page.locator('#catalog-next').isDisabled(),
    };
    await page.locator('#csv-file').setInputFiles({ name, mimeType: 'text/csv', buffer });
    await page.waitForFunction(pattern => {
      const message = document.querySelector('#message');
      return message.classList.contains('error') && new RegExp(pattern, 'i').test(message.textContent);
    }, messagePattern);
    assert.equal(await page.locator('#catalog-body').innerText(), before.body);
    assert.equal(await page.locator('#catalog-summary').innerText(), before.summary);
    assert.equal(await page.locator('#catalog-start').inputValue(), before.start);
    assert.equal(await page.locator('#catalog-prev').isDisabled(), before.previous);
    assert.equal(await page.locator('#catalog-next').isDisabled(), before.next);
  }
  try {
    await page.goto(`${base}/research`);
    await page.locator('#control-select option[value="three_piece_s4"]').waitFor({ state: 'attached' });
    assert.equal(await page.locator('#page-size').inputValue(), '20');
    await page.locator('#csv-file').setInputFiles(csvPath);
    await assertImportedPage(0, 20);
    assert.equal(await page.locator('#catalog-prev').isDisabled(), true);
    assert.equal(await page.locator('#catalog-next').isDisabled(), false);
    pass('complete 33,825-row CSV imports while rendering only the first 20 rows');

    await page.locator('#catalog-next').click(); await assertImportedPage(20, 20);
    await page.locator('#catalog-prev').click(); await assertImportedPage(0, 20);
    await jump(33820); await assertImportedPage(33820, 5);
    assert.equal(await page.locator('#catalog-next').isDisabled(), true);
    assert.equal(await page.locator('#catalog-prev').isDisabled(), false);
    assert.deepEqual(await page.locator('#catalog-body tr td:first-child').allTextContents(), ['33826', '33827', '33828', '33829', '33830']);
    await page.getByRole('button', { name: 'Use P33824 for piece A', exact: true }).click();
    assert.equal(await page.getByRole('textbox', { name: 'Piece A sequence', exact: true }).inputValue(), 'Pzw− · Pzw− · Pzw−');
    assert.equal(await page.locator('#candidate-id').innerText(), 'TR-P33824-P00000-P00000');
    assert.equal(await page.locator('#geometry-json').inputValue(), '');
    pass('next, previous and zero-based jump preserve original Excel rows and exact final identity');

    const exported = await download('#export-page', 'csv-import-final-page.csv');
    const exportedRows = catalog.readExplorerCsv(await fs.readFile(exported, 'utf8'));
    assert.deepEqual(exportedRows, source.slice(33820));
    pass('current-page CSV export contains exactly the five visible final rows');

    await page.locator('#page-size').selectOption('5'); await assertImportedPage(33820, 5);
    await jump(0); await assertImportedPage(0, 5);
    await page.locator('#catalog-next').click(); await assertImportedPage(5, 5);
    await page.locator('#page-size').selectOption('1'); await assertImportedPage(5, 1);
    await page.locator('#catalog-next').click(); await assertImportedPage(6, 1);
    await page.locator('#page-size').selectOption('20'); await assertImportedPage(6, 20);
    pass('changing page size retains the imported catalog and its current offset');

    await rejectedFile('malformed.csv', Buffer.from('Row,Ordered operation sequence\n6,"Txy+'), 'Unterminated CSV quote');
    await rejectedFile('invalid-sequence.csv', Buffer.from('Row,Ordered operation sequence\n6,not-an-operation'), 'Invalid operation');
    await rejectedFile('oversize.csv', Buffer.alloc(8000001, 'x'), '8,000,000.*byte|8000000.*byte');
    const tooManyRows = ['Row,Ordered operation sequence', ...Array.from({ length: 50001 }, (_, index) => `${index + 1},Txy+`)].join('\n');
    await rejectedFile('too-many-rows.csv', Buffer.from(tooManyRows), '50,000|50000');
    await assertImportedPage(6, 20);
    await page.locator('#catalog-next').click(); await assertImportedPage(26, 20);
    pass('malformed and resource-limited uploads leave the prior imported view usable');

    await page.locator('#catalog').evaluate(node => window.scrollTo({ top: node.getBoundingClientRect().top + window.scrollY - 125, behavior: 'instant' }));
    await page.screenshot({ path: path.join(evidence, 'csv-import-desktop.png'), fullPage: false });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.locator('#catalog').evaluate(node => window.scrollTo({ top: node.getBoundingClientRect().top + window.scrollY - 125, behavior: 'instant' }));
    await page.screenshot({ path: path.join(evidence, 'csv-import-mobile.png'), fullPage: false });
    pass('full CSV pagination controls fit desktop and 390-pixel mobile screens');

    await page.locator('#catalog-generated').click();
    await page.waitForFunction(() => document.querySelector('#catalog-body tr')?.cells[0].textContent === '1');
    assert.equal(await page.locator('#catalog-body tr').count(), 20);
    assert.equal(await page.locator('#catalog-body tr').first().locator('td').nth(1).innerText(), 'P00000');
    assert.match(await page.locator('#catalog-summary').innerText(), /formal descriptions|generated/i);
    await page.locator('#catalog-next').click();
    await page.waitForFunction(() => document.querySelector('#catalog-body tr')?.cells[0].textContent === '21');
    assert.equal(await page.locator('#catalog-body tr').first().locator('td').nth(1).innerText(), 'P00020');
    assert.equal(serverWork.length, 0, 'CSV browsing must not silently launch workbook or assessment requests.');
    assert.deepEqual(errors, []);
    pass('return-to-generated restores generated ranks and existing pagination without application errors');

    await fs.writeFile(path.join(evidence, 'csv-browser-checks.json'), JSON.stringify({ base, source: path.basename(csvPath), outcomes, errors, completed: new Date().toISOString() }, null, 2));
    console.log(JSON.stringify({ passed: outcomes.length, errors, evidence }, null, 2));
  } catch (error) {
    await page.screenshot({ path: path.join(evidence, 'csv-import-failure.png'), fullPage: true }).catch(() => {});
    console.error('Application errors:', errors); throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
