import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('one static-first build owns public routes', async () => {
  const config = await readFile('.eleventy.js', 'utf8');
  assert.match(config, /artifacts\/four-cuts-1\.html.*artifacts\/four-cuts\/index\.html/s);
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
