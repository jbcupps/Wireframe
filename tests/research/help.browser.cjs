// Research help: reachable explanations without losing in-progress workspace data.
// Use the bundled Playwright via NODE_PATH; RESEARCH_BASE_URL defaults to port 5055.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

(async () => {
  const base = process.env.BASE_URL || process.env.RESEARCH_BASE_URL || 'http://127.0.0.1:5055';
  const evidence = path.resolve(__dirname, '../../../research-app/evidence');
  await fs.mkdir(evidence, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const page = await desktop.newPage();
  const errors = [], outcomes = [];
  const observe = target => {
    target.on('pageerror', error => errors.push(error.message));
    target.on('console', message => {
      const favicon = message.text().includes('404') && /\/favicon\.ico(?:\?|$)/.test(message.location().url || '');
      if (message.type() === 'error' && !favicon) errors.push(message.text());
    });
  };
  observe(page);
  const pass = name => { outcomes.push(name); console.log(`PASS ${name}`); };
  const visibleCard = target => target.locator('.help-card:visible');
  const snapshot = () => page.evaluate(() => ({
    url: location.href,
    notebook: localStorage.getItem('4d-nod-research-notebook-v1'),
    sequence: document.querySelector('[aria-label="Piece A sequence"]').value,
    batchStart: document.querySelector('#batch-start').value,
    batchCount: document.querySelector('#batch-count').value,
    candidate: document.querySelector('#candidate-id').textContent,
  }));
  async function inViewport(target, card) {
    const box = await card.boundingBox(), size = target.viewportSize();
    assert(box, 'The open explanation must have a visible box.');
    assert(box.x >= -1 && box.y >= -1, `Explanation starts outside viewport: ${JSON.stringify(box)}`);
    assert(box.x + box.width <= size.width + 1 && box.y + box.height <= size.height + 1,
      `Explanation extends outside viewport: ${JSON.stringify(box)} in ${JSON.stringify(size)}`);
  }
  try {
    await page.goto(`${base}/research`);
    await page.locator('#control-select option[value="three_piece_s4"]').waitFor({ state: 'attached' });
    for (const [label, id] of [
      ['Catalog scope', 'catalog-scope'], ['Maximum operations', 'catalog-bound'], ['Zero-based row rank', 'catalog-start'],
      ['Indexing scope', 'batch-scope'], ['Maximum operations per piece', 'batch-bound'], ['Starting triple rank (zero-based)', 'batch-start'],
      ['Number of triples', 'batch-count'], ['Geometry source', 'batch-geometry'], ['Prepared batches', 'batch-select'],
    ]) {
      assert.equal(await page.getByLabel(label, { exact: true }).getAttribute('id'), id, `Help must preserve the field label: ${label}`);
    }
    for (const section of ['catalog', 'workbook', 'batch', 'builder', 'geometry', 'evidence']) {
      assert(await page.locator(`#${section} [data-help] .help-trigger`).count(), `${section} needs contextual help.`);
    }
    const links = await page.locator('[data-help]').evaluateAll(items => items.map(item => {
      const button = item.querySelector('.help-trigger'), card = item.querySelector('.help-card'), link = card.querySelector('a');
      return {
        label: button.getAttribute('aria-label'), controls: button.getAttribute('aria-controls'), expanded: button.getAttribute('aria-expanded'),
        id: card.id, role: card.getAttribute('role'), href: link.href, target: link.target, rel: link.rel,
      };
    }));
    assert.equal(new Set(links.map(link => link.id)).size, links.length, 'Every help card needs a unique ID.');
    for (const link of links) {
      assert(link.label && link.label.length > 3); assert.equal(link.controls, link.id); assert.equal(link.expanded, 'false');
      assert.equal(link.role, 'region'); assert.equal(link.target, '_blank'); assert(link.rel.split(/\s+/).includes('noopener'));
      const url = new URL(link.href); assert.equal(url.origin, new URL(base).origin); assert.equal(url.pathname.replace(/\/$/, ''), '/research/guide'); assert(url.hash);
    }
    const guide = await desktop.newPage(); observe(guide);
    const guideResponse = await guide.goto(`${base}/research/guide`);
    assert.equal(guideResponse.status(), 200); assert.match(guideResponse.headers()['cache-control'], /no-store/);
    for (const href of new Set(links.map(link => link.href))) {
      const anchor = decodeURIComponent(new URL(href).hash.slice(1));
      assert.equal(await guide.locator(`[id="${anchor}"]`).count(), 1, `Guide target ${anchor} must resolve exactly once.`);
    }
    assert.equal(await guide.locator('h1').count(), 1);
    await guide.close();
    pass('all research sections have named help controls and every explanatory link resolves to a guide section');

    await page.locator('#save-candidate').click();
    await page.getByRole('textbox', { name: 'Piece A sequence', exact: true }).fill('Txy+ · Lw-');
    await page.locator('#batch-start').fill('12'); await page.locator('#batch-count').fill('7');
    const before = await snapshot();
    const first = page.locator('[data-help] .help-trigger:visible').first();
    await first.scrollIntoViewIfNeeded(); await page.mouse.move(1, 1); await first.focus();
    const firstId = await first.getAttribute('aria-controls');
    const card = page.locator(`[id="${firstId}"]`);
    await card.waitFor({ state: 'visible' }); assert.equal(await first.getAttribute('aria-expanded'), 'true');
    await inViewport(page, card);
    await page.keyboard.press('Tab');
    assert.equal(await card.locator('a').evaluate(link => link === document.activeElement), true, 'Keyboard users must reach the guide link.');
    assert.equal(await card.isVisible(), true, 'Moving focus into the card must keep it open.');
    const popupWaiting = page.waitForEvent('popup'); await page.keyboard.press('Enter');
    const popup = await popupWaiting; observe(popup); await popup.waitForLoadState();
    assert.equal(new URL(popup.url()).pathname.replace(/\/$/, ''), '/research/guide'); assert(new URL(popup.url()).hash);
    assert.equal(await popup.locator(`[id="${decodeURIComponent(new URL(popup.url()).hash.slice(1))}"]`).count(), 1);
    await popup.close(); await page.bringToFront();
    assert.deepEqual(await snapshot(), before, 'Opening explanations must preserve saved notebook and unsaved form input.');
    await page.keyboard.press('Escape'); await card.waitFor({ state: 'hidden' });
    assert.equal(await first.getAttribute('aria-expanded'), 'false');
    assert.equal(await first.evaluate(button => button === document.activeElement), true, 'Escape should return focus from card to its trigger.');
    pass('keyboard help and its new-tab guide preserve the notebook and unsaved research input; Escape restores focus');

    await page.locator('#catalog-search').focus(); await first.scrollIntoViewIfNeeded();
    await first.hover(); await card.waitFor({ state: 'visible' });
    await card.locator('a').hover();
    await page.waitForTimeout(400);
    assert.equal(await card.isVisible(), true, 'An explanation must stay open while the pointer is inside it.');
    await page.mouse.click(1, 1); await card.waitFor({ state: 'hidden' });
    await first.click(); await card.waitFor({ state: 'visible' });
    const second = page.locator('[data-help] .help-trigger:visible').nth(1);
    await second.focus();
    await page.waitForFunction(() => document.querySelectorAll('.help-card:not([hidden])').length === 1);
    assert.equal(await first.getAttribute('aria-expanded'), 'false');
    assert.equal(await second.getAttribute('aria-expanded'), 'true');
    await page.keyboard.press('Escape');
    assert.equal(await visibleCard(page).count(), 0);
    assert.deepEqual(await snapshot(), before);
    pass('hover cards remain usable, outside clicks dismiss them, and only one explanation opens at a time');

    const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
    const mobile = await mobileContext.newPage(); observe(mobile);
    await mobile.goto(`${base}/research`);
    await mobile.locator('#control-select option[value="three_piece_s4"]').waitFor({ state: 'attached' });
    for (const section of ['catalog', 'batch', 'geometry', 'evidence']) {
      const trigger = mobile.locator(`#${section} [data-help] .help-trigger:visible`).last();
      await trigger.scrollIntoViewIfNeeded(); await trigger.tap();
      const mobileCard = mobile.locator(`[id="${await trigger.getAttribute('aria-controls')}"]`);
      await mobileCard.waitFor({ state: 'visible' }); await inViewport(mobile, mobileCard);
      assert.equal(await mobileCard.locator('a').isVisible(), true);
      await mobile.touchscreen.tap(1, 1); await mobileCard.waitFor({ state: 'hidden' });
    }
    assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, 'Help must not add horizontal overflow on mobile.');
    await mobile.screenshot({ path: path.join(evidence, 'research-help-mobile.png'), fullPage: true });
    await mobileContext.close();
    pass('touch users can open and dismiss explanations across the page without viewport clipping or horizontal overflow');
    assert.deepEqual(errors, []);
    const report = { base, helpLinks: links.length, outcomes, errors, completed: new Date().toISOString() };
    await fs.writeFile(path.join(evidence, 'research-help-browser-checks.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ passed: outcomes.length, helpLinks: links.length, errors, evidence }, null, 2));
  } catch (error) {
    await page.screenshot({ path: path.join(evidence, 'research-help-failure.png'), fullPage: true }).catch(() => {});
    throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
