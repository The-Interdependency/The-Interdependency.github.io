import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

test('one static-first build owns public routes', async () => {
  const config = await readFile('.eleventy.js', 'utf8');
  assert.match(config, /four-cuts-1\.html.*artifacts\/four-cuts\/index\.html/s);
  assert.match(config, /fallback/);
});

test('base layout remains readable without javascript', async () => {
  const layout = await readFile('src/_includes/layouts/base.njk', 'utf8');
  assert.match(layout, /<noscript>/);
  assert.match(layout, /<main id="content"/);
  assert.doesNotMatch(layout, /fetch\(/);
});

test('emergency static edition has no script or external dependency', async () => {
  const html = await readFile('fallback/index.html', 'utf8');
  assert.doesNotMatch(html, /<script/i);
  assert.doesNotMatch(html, /https:\/\/[^"']+\.(css|js)/i);
  assert.match(html, /Emergency static edition/);
});

test('generated deployment artifact contains the unified routes', async () => {
  await access('_site/index.html');
  await access('_site/artifacts/index.html');
  await access('_site/artifacts/four-cuts/index.html');
  await access('_site/fallback/index.html');
  const home = await readFile('_site/index.html', 'utf8');
  assert.match(home, /A way through complexity/);
});
