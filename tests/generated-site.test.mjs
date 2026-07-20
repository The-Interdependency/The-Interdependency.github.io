import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Usage: run only after Eleventy has generated _site, normally through npm run test:generated or npm run check.
test('generated deployment artifact contains the unified routes', async () => {
  const [home, artifacts, fourCuts, fallback, articles, articleTwo] = await Promise.all([
    readFile('_site/index.html', 'utf8'),
    readFile('_site/artifacts/index.html', 'utf8'),
    readFile('_site/artifacts/four-cuts/index.html', 'utf8'),
    readFile('_site/fallback/index.html', 'utf8'),
    readFile('_site/articles/index.html', 'utf8'),
    readFile('_site/articles/article-two/index.html', 'utf8')
  ]);

  assert.match(home, /A way through complexity/);
  assert.match(home, /Article Two: Freedom without abandonment/);
  assert.match(artifacts, /Four Cuts of the Same Country/);
  assert.match(fourCuts, /Wealth and tax/);
  assert.match(fallback, /Emergency static edition/);
  assert.match(articles, /Publication drafts/);
  assert.match(articleTwo, /Freedom without abandonment/);
  assert.match(articleTwo, /None shall be enslaved/);
  assert.match(articleTwo, /60–90 second script/);
});
