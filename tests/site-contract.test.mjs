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
  assert.match(config, /addTransform\('article-reading-hierarchy'/);
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
  assert.doesNotMatch(layout, />Start<\/a>/);
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

test('Article Lab uses literal Article and Footnotes labels and collapses provenance', async () => {
  const [lab, labIndex, preamble, chapter, orientation, config] = await Promise.all([
    readFile('src/lab/unit.njk', 'utf8'),
    readFile('src/lab/index.njk', 'utf8'),
    readFile('src/preamble/index.njk', 'utf8'),
    readFile('src/chapters/chapter.njk', 'utf8'),
    readFile('src/start.njk', 'utf8'),
    readFile('.eleventy.js', 'utf8')
  ]);
  assert.match(lab, />Article<\/span>/);
  assert.match(lab, />Footnotes<\/span>/);
  assert.doesNotMatch(lab, /Speaker A|Speaker B/);
  assert.doesNotMatch(labIndex, /distinct speakers/);
  assert.match(lab, /<details class="provenance-disclosure"><summary>Source &amp; provenance<\/summary>/);
  assert.match(preamble, /<pre class="source-block">{{ preamble\.content }}<\/pre>[\s\S]*<details class="provenance chapter-provenance">/);
  assert.match(chapter, /<article class="textbook-chapter"[\s\S]*<details class="provenance chapter-provenance">/);
  assert.match(config, /Speaker A · exact canon excerpt', 'Article'/);
  assert.match(config, /Speaker B · footnote conversation', 'Footnotes'/);
  assert.match(config, /<summary>Source &amp; provenance<\/summary>/);
  assert.match(orientation, /<h1>Site orientation<\/h1>/);
  assert.doesNotMatch(orientation, /Start here|separate speakers/);
});

test('technical provenance is opt-in rather than primary reading content', async () => {
  const [gonol, edcm, orgMap] = await Promise.all([
    readFile('src/artifacts/gonol-relationships.njk', 'utf8'),
    readFile('src/artifacts/edcm-mathematics.njk', 'utf8'),
    readFile('src/projects/map/index.njk', 'utf8')
  ]);
  for (const source of [gonol, edcm, orgMap]) {
    assert.match(source, /<details class="provenance provenance-disclosure">\s*<summary>Provenance<\/summary>/);
    assert.doesNotMatch(source, /<details class="provenance provenance-disclosure"\s+open/);
  }
  assert.doesNotMatch(gonol, /<section class="panel" aria-labelledby="source-identity-heading">/);
  assert.doesNotMatch(edcm, /<section class="panel" aria-labelledby="source-identity">/);
  assert.doesNotMatch(orgMap, /<section aria-labelledby="provenance-title">/);
});

test('founder-authored origin text owns the public threshold and one continuation into the Way tree', async () => {
  const [layout, splash, home] = await Promise.all([
    readFile('src/_includes/layouts/splash.njk', 'utf8'),
    readFile('src/index.njk', 'utf8'),
    readFile('src/home/index.njk', 'utf8')
  ]);
  assert.match(layout, /class="awakening-body"/);
  assert.match(layout, /class="awakening-splash"/);
  assert.match(layout, /founder-authored public threshold/);
  assert.match(layout, /<script src="\/assets\/js\/site\.js" defer><\/script>/);
  assert.match(splash, /<h1>In Service to Love<\/h1>/);
  assert.match(splash, /this is interdependence\. this is the way\./);
  assert.match(splash, /til shade is gone,[\s\S]*til water is dry,[\s\S]*in service to love,/);
  assert.match(splash, /href="\/way\/"[^>]*>Enter The Way<\/a>/);
  assert.doesNotMatch(splash, /generated\.canon\.units/);
  assert.doesNotMatch(splash, /href="\/preamble\/"/);
  assert.doesNotMatch(splash, /href="\/home\/"/);
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
  assert.match(chapter, /chapter \| textbookMarkdown \| safe/);
  assert.doesNotMatch(chapter, /chapter\.content \| markdown \| safe/);
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
