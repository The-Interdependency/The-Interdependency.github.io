// Usage: run through `npm run test:generated` after a complete site build.
// Evidence boundary: verifies generated artifact contracts, not the remote Pages environment.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Usage: run only after Eleventy has generated _site, normally through npm run test:generated or npm run check.
test('generated deployment artifact contains the unified routes', async () => {
  const [splash, home, preamble, artifacts, fourCuts, fallback, articles] = await Promise.all([
    readFile('_site/index.html', 'utf8'),
    readFile('_site/home/index.html', 'utf8'),
    readFile('_site/preamble/index.html', 'utf8'),
    readFile('_site/artifacts/index.html', 'utf8'),
    readFile('_site/artifacts/four-cuts/index.html', 'utf8'),
    readFile('_site/fallback/index.html', 'utf8'),
    readFile('_site/articles/index.html', 'utf8')
  ]);

  assert.match(splash, /class="awakening-splash"/);
  assert.match(splash, /<h1>Awakening<\/h1>/);
  assert.match(splash, /5d explodes out of 4d/);
  assert.match(splash, /You are not alone/);
  assert.match(splash, /href="\/preamble\/"[^>]*>Read the Preamble/);
  assert.match(splash, /href="\/home\/"[^>]*>Enter the living system/);
  assert.doesNotMatch(splash, /primary-nav/);
  assert.match(home, /A way through complexity/);
  assert.match(home, /href="\/preamble\/"[^>]*>Read the Preamble/);
  assert.match(home, /href="\/"/);
  assert.match(home, /Return to Awakening/);
  assert.match(preamble, /One-click canon entrance/);
  assert.match(preamble, /Humanity faces extinction/);
  assert.match(preamble, /Canonical repository/);
  assert.match(artifacts, /Artifacts/);
  assert.match(fourCuts, /Wealth and tax/);
  assert.match(fallback, /Emergency static edition/);
  assert.match(articles, /Publication drafts/);
  for (const title of [
    'Article One: Contribution without contempt',
    'Article Two: Freedom without abandonment',
    'Article Three: Speech as demonstrated consent',
    'Article Four: Law as teachable duty',
    'Article Five: Adulthood as demonstrated competence',
    'Article Six: Authority as burden',
    'Article Seven: Definitions before governance',
    'Article Eight: Rights with living limits'
  ]) assert.match(articles, new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('Way map renders Human consciousness beneath Interdefinables and before Preamble', async () => {
  const way = await readFile('_site/way/index.html', 'utf8');
  const interdefinablesSection = way.indexOf('<h2>The Interdefinables</h2>');
  const humanHeading = way.indexOf('Human consciousness emerges from');
  const binaryHeading = way.indexOf('Binary essences meaningfully');
  const preambleSection = way.indexOf('<h2>Preamble</h2>');

  assert.ok(interdefinablesSection >= 0, 'Interdefinables section missing');
  assert.ok(humanHeading > interdefinablesSection, 'Human consciousness must appear inside Interdefinables');
  assert.ok(binaryHeading > humanHeading, 'Human consciousness child headings must follow their parent');
  assert.ok(preambleSection > binaryHeading, 'Preamble must be the next major section after Interdefinables');
  assert.match(way, /class="unit-level-3"[^>]*>[\s\S]*?Human consciousness emerges from/);
  assert.match(way, /class="unit-level-4"[^>]*>[\s\S]*?Binary essences meaningfully/);
  assert.doesNotMatch(way, /<h2>Human consciousness emerges from:?<\/h2>/);
});

test('generated deployment artifact contains all rights article vertical slices', async () => {
  const pages = [
    ['article-one', /Contribution without contempt/, /From each as they will/],
    ['article-two', /Freedom without abandonment/, /None shall be enslaved/],
    ['article-three', /Speech as demonstrated consent/, /Your speech/],
    ['article-four', /Law as teachable duty/, /None shall be left ignorant/],
    ['article-five', /Adulthood as demonstrated competence/, /Political Adulthood/],
    ['article-six', /Authority as burden/, /Violence is the ultimate Authority/],
    ['article-seven', /Definitions before governance/, /Where any would converse/],
    ['article-eight', /Rights with living limits/, /The whole of the law/]
  ];

  for (const [slug, titlePattern, canonPattern] of pages) {
    const html = await readFile(`_site/articles/${slug}/index.html`, 'utf8');
    assert.match(html, titlePattern);
    assert.match(html, canonPattern);
    assert.match(html, /60–90 second script/);
    assert.match(html, /hmmm/);
  }
});

test('every Rights Article Lab renders absurd-limit, practice, domain, and research sections', async () => {
  const canon = JSON.parse(await readFile('src/_data/generated/canon.json', 'utf8'));
  const articleLab = JSON.parse(await readFile('src/_data/article_lab.json', 'utf8'));
  const requiredDomains = [
    'Medical', 'Construction', 'Engineering', 'Agriculture', 'Jurisprudence',
    'Transportation and distribution', 'Child craft', 'Information systems',
    'Emergency response', 'Hospitality and sanitation', 'Community governance'
  ];

  for (const record of articleLab) {
    const unit = canon.units.find(candidate => candidate.id === record.unit_id);
    assert.ok(unit, `missing canon unit ${record.unit_id}`);
    const html = await readFile(`_site/lab/${unit.routeSlug}/index.html`, 'utf8');
    assert.match(html, /Reductio ad absurdum/);
    assert.match(html, /Worst practices and best practices/);
    assert.match(html, /Applications by domain/);
    assert.match(html, /Research field/);
    assert.match(html, /Evidence boundary/);
    assert.match(html, /href="https?:\/\//);
    for (const domain of requiredDomains) assert.match(html, new RegExp(domain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('generated deployment artifact publishes verifiable build identity', async () => {
  const build = JSON.parse(await readFile('_site/build.json', 'utf8'));
  assert.equal(build.repository, 'The-Interdependency/The-Interdependency.github.io');
  assert.ok(build.commit);
  assert.match(build.generatedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(build.canonicalSource.repository, 'wayseer00/main');
  assert.equal(build.canonicalSource.path, 'canon/INTERDEPENDENT_WAY.txt');
  assert.match(build.canonicalSource.contentSha256, /^[a-f0-9]{64}$/);
});
