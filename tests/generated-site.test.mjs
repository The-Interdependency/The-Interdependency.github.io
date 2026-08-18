import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Usage: run with `npm run test:generated` after building `_site`.
// Evidence boundary: these checks verify generated publication structure, not source-repository freshness beyond the build artifacts already selected.

test('generated deployment artifact contains the unified routes', async () => {
  const sitemap = await readFile('_site/sitemap.xml', 'utf8');
  for (const route of ['/home/', '/way/', '/chapters/', '/narratives/', '/projects/', '/sitrep/', '/artifacts/', '/works/', '/research/method/', '/search/', '/eai/aicontext.md']) {
    assert.match(sitemap, new RegExp(route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('distributed textbook displays all eight exact chapter sources', async () => {
  const index = await readFile('_site/chapters/index.html', 'utf8');
  const textbook = JSON.parse(await readFile('src/_data/generated/textbook.json', 'utf8'));
  const contact = [
    /serious trouble/, /automata|finite-state|formal language/i, /morpholog|agglutin|language/i, /quantum|interference|Born rule/i,
    /selection|inherit|evolution/i, /brain|neural|cognitive/i, /measurement|operational|validity/i, /conscious|awareness|mind/i
  ];
  for (const chapter of textbook.chapters) {
    assert.match(index, new RegExp(`href="/chapters/${chapter.slug}/"`));
    assert.match(index, new RegExp(chapter.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    const html = await readFile(`_site/chapters/${chapter.slug}/index.html`, 'utf8');
    assert.match(html, /class="textbook-chapter"/);
    assert.match(html, new RegExp(`<title>Chapter ${chapter.display_number} · ${chapter.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}<\\/title>`));
    assert.match(html, new RegExp(chapter.repository.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(html, new RegExp(chapter.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(html, /Open exact source in GitHub/);
    assert.match(html, /Source evidence/);
    assert.match(html, contact[chapter.number]);
  }
  assert.match(await readFile('_site/chapters/chapter-seven/index.html', 'utf8'), /theory under development/);
});

test('Way map keeps Interdefinables body together and makes Preamble the next tree heading', async () => {
  const way = await readFile('_site/way/index.html', 'utf8');
  const interdefinablesSection = way.indexOf('<strong>The Interdefinables</strong>');
  const humanHeading = way.indexOf('class="interdefinables-major">Human consciousness emerges from');
  const binaryHeading = way.indexOf('class="interdefinables-subhead">Binary essences meaningfully');
  const interdefinablesClose = way.indexOf('</li>', interdefinablesSection);
  const preambleSection = way.indexOf('<strong>Preamble</strong>');

  assert.ok(interdefinablesSection >= 0, 'Interdefinables section missing');
  assert.ok(humanHeading > interdefinablesSection, 'Human consciousness must appear inside Interdefinables');
  assert.ok(binaryHeading > humanHeading, 'Interdefinables body structure must preserve source order');
  assert.ok(interdefinablesClose > binaryHeading, 'Interdefinables body labels must stay inside the Interdefinables tree item');
  assert.ok(preambleSection > interdefinablesClose, 'Preamble must follow the complete Interdefinables tree item');
  assert.doesNotMatch(way, /class="unit-level-[34]"[^>]*>[\s\S]*?<strong>Human consciousness emerges from/);
  assert.doesNotMatch(way, /class="unit-level-[34]"[^>]*>[\s\S]*?<strong>Binary essences meaningfully/);
  assert.match(way, /<ul class="interdefinables-pairs">/);
  assert.match(way, /<details class="canon-unit"/);
  assert.match(way, /<summary class="canon-unit-summary">/);
  assert.match(way, /Open a title to read that unit in source order/);
  assert.equal((way.match(/class="article-lab-box"/g) || []).length, 8);
  assert.equal((way.match(/class="source-disclosure"/g) || []).length, canonUnitCount(way));
  assert.match(way, /Open full Article Lab/);
  assert.doesNotMatch(way, /Open unit page|Enter Lab|Source and provenance|tap to read|text open/);
});

function canonUnitCount(html) {
  return (html.match(/class="canon-unit"/g) || []).length;
}

test('generated deployment artifact contains all rights article vertical slices with research attachment', async () => {
  const pages = [
    ['article-one', /Contribution without contempt/, /From each as they will/],
    ['article-two', /Freedom without abandonment/, /None shall be enslaved/],
    ['article-three', /Reciprocity without retaliation/, /Your speech/],
    ['article-four', /Law without obscurity/, /None shall be left ignorant/],
    ['article-five', /Adulthood without caste/, /There are children/],
    ['article-six', /Authority without worship/, /Violence is the ultimate Authority/],
    ['article-seven', /Definition without closure/, /Where any would converse/],
    ['article-eight', /Rights without abstraction/, /The whole of the law/]
  ];
  for (const [slug, title, canon] of pages) {
    const html = await readFile(`_site/articles/${slug}/index.html`, 'utf8');
    assert.match(html, title);
    assert.match(html, canon);
    assert.match(html, /Research/);
    assert.match(html, /Source &amp; provenance/);
  }
});

test('every Rights Article Lab renders absurd-limit, practice, domain, and research sections', async () => {
  const generated = JSON.parse(await readFile('src/_data/generated/canon.json', 'utf8'));
  const rights = generated.units.filter(unit => unit.section === 'rights-and-definitions-of-the-way' && /^Article (One|Two|Three|Four|Five|Six|Seven|Eight)$/.test(unit.title));
  assert.equal(rights.length, 8);
  for (const unit of rights) {
    const html = await readFile(`_site/lab/${unit.routeSlug}/index.html`, 'utf8');
    assert.match(html, /Ad absurdum/);
    assert.match(html, /Worst practice/);
    assert.match(html, /Best practice/);
    assert.match(html, /Domain applications/);
    assert.match(html, /Research/);
  }
});

test('public Research pages exclude legislation, standards, guidelines, frameworks, and doctrine', async () => {
  const method = await readFile('_site/research/method/index.html', 'utf8');
  for (const excluded of ['legislation', 'standards', 'guidelines', 'frameworks', 'doctrine']) {
    assert.match(method, new RegExp(excluded, 'i'));
  }
  assert.match(method, /Research is study-only/i);
});

test('generated deployment artifact publishes verifiable build identity', async () => {
  const info = JSON.parse(await readFile('_site/assets/data/build-info.json', 'utf8'));
  assert.match(info.commit, /^[a-f0-9]{40}$/);
  assert.equal(info.textbook.chapter_count, 8);
});

test('generated deployment artifact publishes the complete machine-oriented AI context', async () => {
  const context = await readFile('_site/eai/aicontext.md', 'utf8');
  assert.match(context, /Ownership is not authorship/);
  assert.match(context, /hmmm doctrine/);
  assert.match(context, /The Interdependent Way/);
});
