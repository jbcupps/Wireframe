// Run with NODE_PATH pointing to the bundled Playwright installation.
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

(async () => {
  const moduleSource = fs.readFileSync(path.join(__dirname, '../../src/static/research/visualization.mjs'), 'utf8');
  const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', req.url === '/visualization.mjs' ? 'text/javascript' : 'text/html');
    res.end(req.url === '/visualization.mjs' ? moduleSource : '<!doctype html><meta charset="utf-8"><title>Visualization test</title><div id="view"></div>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true, executablePath: process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
  try {
    const page = await browser.newPage({ viewport: { width: 900, height: 1100 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.evaluate(async () => {
      const { mountVisualization } = await import('/visualization.mjs');
      window.view = mountVisualization(document.querySelector('#view'), { candidate: { pieces: [{ operations: ['Txy+'] }, { operations: [] }, { operations: ['Pzw+'] }] } });
    });
    assert.match(await page.locator('#view').innerText(), /Geometry not yet defined/);
    assert.equal(await page.getByRole('button', { name: 'Reset camera' }).count(), 0);
    await page.evaluate(() => {
      window.geometry = { pieces: [
        { name: 'A', maximal_simplices: [[0, 1, 2, 3, 4]] },
        { name: 'B', maximal_simplices: [[0, 1, 2, 3, 5]] },
        { name: 'C', maximal_simplices: [[0, 1, 2, 3, 6]] },
      ] };
      window.view.update({ geometry: window.geometry, result: { assembled: { overfull_tetrahedra: [{ facet: [0, 1, 2, 3], incidence: 3 }] } } });
    });
    assert.match(await page.locator('#view h3').innerText(), /SCHEMATIC/);
    assert.equal(await page.locator('svg circle').count(), 22);
    assert.equal(await page.getByRole('button', { name: 'Play supplied frames' }).count(), 0);
    await page.getByLabel('Inspect calculated faces').selectOption('0');
    assert.match(await page.locator('.viz-inspection [role=status]').innerText(), /incidence 3/);
    const before = await page.locator('svg line').first().getAttribute('x1');
    await page.getByRole('button', { name: 'Orbit left' }).click();
    assert.notEqual(await page.locator('svg line').first().getAttribute('x1'), before);
    await page.getByRole('button', { name: 'Reset camera' }).click();
    assert.equal(await page.locator('svg line').first().getAttribute('x1'), before);
    await page.locator('svg').focus(); await page.keyboard.press('+');
    assert.notEqual(await page.locator('svg line').first().getAttribute('x1'), before);
    await page.keyboard.press('0');
    assert.equal(await page.locator('svg line').first().getAttribute('x1'), before);
    await page.evaluate(() => {
      const coordinates = Array.from({ length: 7 }, (_, vertex) => ({ vertex, position: [vertex, vertex % 2, vertex % 3, vertex / 2] }));
      const moved = coordinates.map(entry => ({ ...entry, position: [entry.position[0], entry.position[1] + entry.vertex % 2, entry.position[2], 1] }));
      window.geometry.embedding = { coordinates, animation_kind: 'fourth_coordinate_slice', description: 'Test supplied slices', frames: [{ value: 0, coordinates }, { value: 1, coordinates: moved }] };
      window.view.update({ geometry: window.geometry });
    });
    assert.match(await page.locator('#view h3').innerText(), /supplied coordinates/);
    await page.getByRole('button', { name: 'Play supplied frames' }).click();
    await page.waitForFunction(() => document.querySelector('output').textContent.includes('Frame 2'));
    await page.getByRole('button', { name: 'Pause supplied frames' }).click();
    await page.getByLabel('Supplied phase or slice frame').fill('0');
    assert.match(await page.locator('output').innerText(), /Frame 1/);
    await page.evaluate(() => {
      window.geometry.embedding = { coordinates: Array.from({ length: 7 }, (_, vertex) => ({ vertex, position: [vertex * 1e10, (vertex % 2) * 1e10, (vertex % 3) * 1e10, 1e10] })) };
      window.view.update({ geometry: window.geometry });
    });
    assert.match(await page.locator('#view h3').innerText(), /supplied coordinates/);
    assert.equal(await page.locator('svg line').evaluateAll(lines => lines.every(line => ['x1', 'y1', 'x2', 'y2'].every(name => Number.isFinite(Number(line.getAttribute(name)))))), true);
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= 390), true);
    await page.evaluate(() => window.view.destroy());
    assert.equal(await page.locator('#view').innerText(), '');
    assert.deepEqual(errors, []);
    console.log('Visualization browser checks passed: states, labels, camera, keyboard, computed-face inspection, animation, 1e10 coordinates, mobile fit, cleanup.');
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });

