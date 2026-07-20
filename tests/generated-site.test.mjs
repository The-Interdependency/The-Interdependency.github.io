import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Usage: run only after Eleventy has generated _site, normally through npm run test:generated or npm run check.
test('generated deployment artifact contains the unified routes', async () => {
  const [home, artifacts, fourCuts, fallback, articles] = await Promise.all([
    readFile('_site/index.html', 'utf8'),
    readFile('_site/artifacts/index.html', 'utf8'),
    readFile('_site/artifacts/four-cuts/index.html', 'utf8'),
    readFile('_site/fallback/index.html', 'utf8'),
    readFile('_site/articles/index.html', 'utf8')
  ]);

  assert.match(home, /A way through complexity/);
  assert.match(home, /Article Two: Freedom without abandonment/);
  assert.match(artifacts, /Four Cuts of the Same Country/);
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
