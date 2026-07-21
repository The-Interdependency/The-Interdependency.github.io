import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('one static-first build owns public routes and exact Markdown rendering', async () => {
  const config = await readFile('.eleventy.js', 'utf8');
  assert.match(config, /artifacts\/four-cuts-1\.html.*artifacts\/four-cuts\/index\.html/s);
  assert.match(config, /fallback/);
  assert.match(config, /addFilter\('markdown'/);
  assert.match(config, /html: false/);
});

test('base layout remains readable without javascript and exposes the textbook', async () => {
  const layout = await readFile('src/_includes/layouts/base.njk', 'utf8');
  assert.match(layout, /<noscript>/);
  assert.match(layout, /<main id="content"/);
  assert.match(layout, /href="\/chapters\/"/);
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
  assert.match(home, /href="\/chapters\/"/);
});

test('distributed textbook routes are data-backed and source-bound', async () => {
  const [manifest, index, chapter, fetcher] = await Promise.all([
    readFile('src/_data/textbook_sources.json', 'utf8'),
    readFile('src/chapters/index.njk', 'utf8'),
    readFile('src/chapters/chapter.njk', 'utf8'),
    readFile('scripts/fetch-textbook.mjs', 'utf8')
  ]);
  const sources = JSON.parse(manifest);
  assert.equal(sources.length, 8);
  assert.deepEqual(sources.map(source => source.number), [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.match(index, /generated\.textbook\.chapters/);
  assert.match(chapter, /pagination:[\s\S]*generated\.textbook\.chapters/);
  assert.match(chapter, /chapter\.content \| markdown \| safe/);
  assert.match(chapter, /Open exact source in GitHub/);
  assert.match(fetcher, /api\.github\.com/);
  assert.match(fetcher, /raw\.githubusercontent\.com/);
  assert.match(fetcher, /refusing non-allowlisted textbook target/);
  assert.match(fetcher, /contentSha256/);
});

test('emergency static edition has no script or external dependency', async () => {
  const html = await readFile('fallback/index.html', 'utf8');
  assert.doesNotMatch(html, /<script/i);
  assert.doesNotMatch(html, /https:\/\/[^"']+\.(css|js)/i);
  assert.match(html, /Emergency static edition/);
});
