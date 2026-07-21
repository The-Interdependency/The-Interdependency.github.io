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

test('Awakening owns the static public threshold and routes inward', async () => {
  const [layout, splash, home] = await Promise.all([
    readFile('src/_includes/layouts/splash.njk', 'utf8'),
    readFile('src/index.njk', 'utf8'),
    readFile('src/home/index.njk', 'utf8')
  ]);
  assert.match(layout, /class="awakening-body"/);
  assert.match(layout, /class="awakening-splash"/);
  assert.doesNotMatch(layout, /<script/i);
  assert.match(splash, /generated\.canon\.units/);
  assert.match(splash, /<h1>Awakening<\/h1>/);
  assert.match(splash, /href="\/preamble\/"/);
  assert.match(splash, /href="\/home\/"/);
  assert.match(home, /permalink: \/home\//);
  assert.match(home, /Return to Awakening/);
});

test('emergency static edition has no script or external dependency', async () => {
  const html = await readFile('fallback/index.html', 'utf8');
  assert.doesNotMatch(html, /<script/i);
  assert.doesNotMatch(html, /https:\/\/[^"']+\.(css|js)/i);
  assert.match(html, /Emergency static edition/);
});
