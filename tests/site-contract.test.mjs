import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Usage: run with `npm test`; source-level checks verify that machine discovery remains wired while the visible interface stays human-first.

test('one static-first build owns public routes and exact Markdown rendering', async () => {
  const config = await readFile('.eleventy.js', 'utf8');
  assert.match(config, /artifacts\/four-cuts-1\.html.*artifacts\/four-cuts\/index\.html/s);
  assert.match(config, /fallback/);
  assert.match(config, /'llms\.txt': 'llms\.txt'/);
  assert.match(config, /addFilter\('markdown'/);
  assert.match(config, /html: false/);
});

test('machine discovery remains wired without occupying the human homepage', async () => {
  const [home, base, splash, sitemap] = await Promise.all([
    readFile('src/home/index.njk', 'utf8'),
    readFile('src/_includes/layouts/base.njk', 'utf8'),
    readFile('src/_includes/layouts/splash.njk', 'utf8'),
    readFile('src/sitemap.11ty.js', 'utf8')
  ]);
  assert.doesNotMatch(home, /href="\/eai\/aicontext\.md"/);
  assert.doesNotMatch(home, /href="\/llms\.txt"/);
  assert.match(base, /rel="alternate" type="text\/markdown" href="\/eai\/aicontext\.md"/);
  assert.match(splash, /rel="alternate" type="text\/markdown" href="\/eai\/aicontext\.md"/);
  assert.match(sitemap, /routes\.push\('\/eai\/aicontext\.md', '\/llms\.txt'\)/);
  assert.match(sitemap, /permalink: 'sitemap\.xml'/);
});

test('base layout remains readable without javascript and presents a human-first navigation', async () => {
  const layout = await readFile('src/_includes/layouts/base.njk', 'utf8');
  assert.match(layout, /<noscript>/);
  assert.match(layout, /<main id="content"/);
  assert.match(layout, /href="\/chapters\/"/);
  assert.match(layout, /href="\/narratives\/"/);
  assert.match(layout, /<a href="\/way\/">The Way<\/a>/);
  assert.doesNotMatch(layout, />Awakening<\/a>/);
  assert.doesNotMatch(layout, />Preamble<\/a>/);
  assert.doesNotMatch(layout, />Article Lab<\/a>/);
  assert.doesNotMatch(layout, /footer-provenance/);
  assert.doesNotMatch(layout, /fetch\(/);
});

test('Way tree presents human reading first, nested Article Labs second, and exact source on demand', async () => {
  const way = await readFile('src/way/index.njk', 'utf8');
  assert.match(way, /<details class="canon-unit"/);
  assert.match(way, /<summary class="canon-unit-summary"><strong>{{ unit\.title }}<\/strong>/);
  assert.match(way, /unit\.content \| canonUnitBody/);
  assert.match(way, /article_lab \| where\("unit_id", unit\.id\)/);
  assert.match(way, /<details class="article-lab-box">/);
  assert.match(way, /Working boundary:/);
  assert.match(way, /href="\/lab\/{{ unit\.routeSlug }}\/">Open full Article Lab<\/a>/);
  assert.match(way, /<details class="source-disclosure">/);
  assert.match(way, /<pre class="source-block">{{ unit\.content }}<\/pre>/);
  assert.doesNotMatch(way, /Open unit page|Enter Lab|Source and provenance|tap to read|text open/);
  assert.doesNotMatch(way, /<script/i);
});

test('Awakening owns one human continuation into the Way tree', async () => {
  const [layout, splash, home] = await Promise.all([
    readFile('src/_includes/layouts/splash.njk', 'utf8'),
    readFile('src/index.njk', 'utf8'),
    readFile('src/home/index.njk', 'utf8')
  ]);
  assert.match(layout, /class="awakening-body"/);
  assert.match(layout, /class="awakening-splash"/);
  assert.match(layout, /<script src="\/assets\/js\/site\.js" defer><\/script>/);
  assert.match(splash, /generated\.canon\.units/);
  assert.match(splash, /<h1>Awakening<\/h1>/);
  assert.match(splash, /href="\/way\/"[^>]*>Enter The Way<\/a>/);
  assert.doesNotMatch(splash, /href="\/preamble\/"/);
  assert.doesNotMatch(splash, /href="\/home\/"/);
  assert.doesNotMatch(splash, /Exact source and provenance/);
  assert.match(home, /permalink: \/home\//);
  assert.match(home, /href="\/way\/"/);
  assert.doesNotMatch(home, /href="\/lab\/"/);
  assert.doesNotMatch(home, /href="\/eai\/aicontext\.md"/);
  assert.doesNotMatch(home, /href="\/llms\.txt"/);
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
  assert.ok(fetcher.includes("const apiOrigin = 'https://api.github.com';"));
  assert.ok(fetcher.includes("const rawOrigin = 'https://raw.githubusercontent.com';"));
  assert.match(fetcher, /refusing non-allowlisted textbook target/);
  assert.match(fetcher, /contentSha256/);
});

test('emergency static edition has no script or external dependency', async () => {
  const html = await readFile('fallback/index.html', 'utf8');
  assert.doesNotMatch(html, /<script/i);
  assert.doesNotMatch(html, /https:\/\/[^"']+\.(css|js)/i);
  assert.match(html, /Emergency static edition/);
});
