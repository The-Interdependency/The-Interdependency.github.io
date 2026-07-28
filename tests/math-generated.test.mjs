// Usage: run after `npm run build`; proves the public Chapter One artifact contains static MathML rather than escaped or visibly raw TeX delimiters.
// Evidence boundary: verifies rendering fidelity and no-JavaScript delivery, not the truth of the chapter's mathematics.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Chapter One publishes its source LaTeX as static annotated MathML', async () => {
  const [textbook, html, mathCss] = await Promise.all([
    readFile('src/_data/generated/textbook.json', 'utf8').then(JSON.parse),
    readFile('_site/chapters/chapter-one/index.html', 'utf8'),
    readFile('_site/assets/css/math.css', 'utf8')
  ]);
  const chapter = textbook.chapters.find(candidate => candidate.number === 1);

  assert.ok(chapter?.content, 'generated Chapter One source is missing');
  assert.match(chapter.content, /\\\(/, 'source fixture must retain inline TeX delimiters');
  assert.match(chapter.content, /\\\[/, 'source fixture must retain display TeX delimiters');

  const mathCount = (html.match(/<math\b/g) || []).length;
  assert.ok(mathCount >= 10, `expected substantial MathML coverage, found ${mathCount} math elements`);
  assert.match(html, /<link rel="stylesheet" href="\/assets\/css\/math\.css">/);
  assert.match(html, /xmlns="http:\/\/www\.w3\.org\/1998\/Math\/MathML"/);
  assert.match(html, /class="tml-display"/);
  assert.match(html, /<annotation encoding="application\/x-tex">/);
  assert.doesNotMatch(html, /\\\(|\\\)|\\\[|\\\]/, 'recognized TeX delimiters must not leak into rendered prose');
  assert.doesNotMatch(html, /temml(?:\.min)?\.js|cdn\.jsdelivr|unpkg/i, 'math must not depend on runtime third-party JavaScript');

  assert.match(mathCss, /math\.tml-display/);
  assert.match(mathCss, /overflow-x:\s*auto/);
});
