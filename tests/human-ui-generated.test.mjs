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
    readFile('_site/about-the-site/index.html', 'utf8'),
    readFile('_site/artifacts/gonol-relationships/index.html', 'utf8'),
    readFile('_site/artifacts/edcm-mathematics/index.html', 'utf8'),
    readFile('_site/artifacts/recursive-hypertoroidal-interference/index.html', 'utf8'),
    readFile('_site/projects/map/index.html', 'utf8')
  ]);

  assert.match(base, /<a href="\/way\/"[^>]*><span>The Way<\/span><small>Core text and Article Labs<\/small><\/a>/);
  assert.match(base, /<a href="\/home\/" aria-current="page"><span>Start Here<\/span>/);

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

  assert.match(orientation, /<h1>About the site<\/h1>/);
  assert.doesNotMatch(orientation, /Start here|separate speakers/);
});

// Usage: after `npm run build`, run `npm run test:generated`.
// Check rendered primary reading, not raw-source duplicates or a single Lab.
// The parser owns note extraction; this gate protects presentation only.
test('The Way exposes every unit footnote with its canon body, outside nested disclosures', async () => {
  const canon = JSON.parse(await readFile('src/_data/generated/canon.json', 'utf8'));
  const html = await readFile('_site/way/index.html', 'utf8');
  const escapeHtml = value => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
  const units = html.split('<details class="canon-unit" id="').slice(1);
  assert.ok(canon.units.length > 0, 'the gate must inspect actual canon units');
  assert.equal(units.length, canon.units.length, 'every canon unit must have one reading surface');
  assert.ok(canon.units.some(unit => unit.notes.length), 'the gate must exercise footnotes');

  for (const [index, unit] of canon.units.entries()) {
    const rendered = units[index];
    assert.ok(rendered.startsWith(`${escapeHtml(unit.routeSlug)}">`), `${unit.id}: source order and unit identity`);
    const readingMatch = /<blockquote\b[^>]*\bclass="[^"]*\bcanon-reading\b[^"]*"[^>]*>([\s\S]*?)<\/blockquote>/.exec(rendered);
    assert.ok(readingMatch, `${unit.id}: primary canon reading exists`);
    const reading = readingMatch[1];
    assert.doesNotMatch(reading, /<details\b/i, `${unit.id}: notes must not require another disclosure`);
    const noteBlocks = [...reading.matchAll(/<div class="canon-footnotes" role="note">([\s\S]*?)<\/div>/g)];
    assert.equal(noteBlocks.length, unit.notes.length ? 1 : 0, `${unit.id}: one visible note group when needed`);
    if (!unit.notes.length) continue;
    const noteBlock = noteBlocks[0];
    assert.ok(noteBlock.index > reading.indexOf('class="canon-unit-body"'), `${unit.id}: article precedes its notes`);
    assert.match(noteBlock[1], /<p class="eyebrow">Footnotes<\/p>/, `${unit.id}: literal footnote label`);
    assert.doesNotMatch(noteBlock[1], /status-interpretation/, `${unit.id}: source notes are canon, not editorial interpretation`);
    const notes = [...noteBlock[1].matchAll(/<p class="canon-footnote"><strong>([\s\S]*?)<\/strong> ([\s\S]*?)<\/p>/g)]
      .map(match => ({ marker: match[1], text: match[2] }));
    assert.deepEqual(notes, unit.notes.map(note => ({
      marker: escapeHtml(note.marker),
      text: escapeHtml(note.text)
    })), `${unit.id}: every marker and complete note remains separate, exact, ordered, and attached to its own article`);
  }
});
