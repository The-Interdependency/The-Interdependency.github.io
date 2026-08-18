import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('human reading surfaces keep provenance collapsed and Article labels literal', async () => {
  const canon = JSON.parse(await readFile('src/_data/generated/canon.json', 'utf8'));
  const articleLab = JSON.parse(await readFile('src/_data/article_lab.json', 'utf8'));
  const firstLabRecord = articleLab[0];
  const firstLabUnit = canon.units.find(unit => unit.id === firstLabRecord.unit_id);
  assert.ok(firstLabUnit, 'first Article Lab must map to a canon unit');

  const [base, preamble, chapterZero, lab, publicationArticle, orientation, gonol, edcm, rhi, orgMap] = await Promise.all([
    readFile('_site/home/index.html', 'utf8'),
    readFile('_site/preamble/index.html', 'utf8'),
    readFile('_site/chapters/chapter-zero/index.html', 'utf8'),
    readFile(`_site/lab/${firstLabUnit.routeSlug}/index.html`, 'utf8'),
    readFile('_site/articles/article-one/index.html', 'utf8'),
    readFile('_site/start/index.html', 'utf8'),
    readFile('_site/artifacts/gonol-relationships/index.html', 'utf8'),
    readFile('_site/artifacts/edcm-mathematics/index.html', 'utf8'),
    readFile('_site/artifacts/recursive-hypertoroidal-interference/index.html', 'utf8'),
    readFile('_site/projects/map/index.html', 'utf8')
  ]);

  assert.match(base, /<a href="\/way\/">The Way<\/a>/);
  assert.doesNotMatch(base, /<a[^>]*>Start<\/a>/);

  assert.match(preamble, /<details class="provenance chapter-provenance">[\s\S]*<summary>Source &amp; provenance<\/summary>/);
  assert.ok(preamble.indexOf('Humanity faces extinction') < preamble.indexOf('Source &amp; provenance'));

  assert.match(chapterZero, /<details class="provenance chapter-provenance">[\s\S]*<summary>Source &amp; provenance<\/summary>/);
  assert.ok(chapterZero.indexOf('Zero is not nothing') < chapterZero.indexOf('Source &amp; provenance'));

  assert.match(lab, />Article<\/span>/);
  assert.match(lab, />Footnotes<\/span>/);
  assert.doesNotMatch(lab, /Speaker A|Speaker B/);
  assert.match(lab, /<details class="provenance-disclosure">[\s\S]*<summary>Source &amp; provenance<\/summary>/);

  assert.match(publicationArticle, />Article<\/p>/);
  assert.match(publicationArticle, />Footnotes<\/p>/);
  assert.doesNotMatch(publicationArticle, /Speaker A|Speaker B/);
  assert.match(publicationArticle, /<details class="provenance-disclosure">[\s\S]*<summary>Source &amp; provenance<\/summary>/);

  for (const html of [gonol, edcm, orgMap]) {
    assert.match(html, /<details class="provenance provenance-disclosure">[\s\S]*?<summary>Provenance<\/summary>/);
    assert.doesNotMatch(html, /<details class="provenance provenance-disclosure"[^>]*\bopen\b/);
  }
  assert.match(rhi, /<details class="rhi-provenance provenance-disclosure">[\s\S]*?<summary>Provenance<\/summary>/);
  assert.doesNotMatch(rhi, /<details class="rhi-provenance provenance-disclosure"[^>]*\bopen\b/);

  assert.match(orientation, /<h1>Site orientation<\/h1>/);
  assert.doesNotMatch(orientation, /Start here|separate speakers/);
});
