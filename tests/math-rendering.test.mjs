// Usage: run through `npm test`; verifies that textbook TeX is intercepted before Markdown escaping and rendered to static MathML.
// Evidence boundary: confirms syntax rendering and fail-closed behavior, not the mathematical truth of any expression.
import test from 'node:test';
import assert from 'node:assert/strict';
import MarkdownIt from 'markdown-it';
import { installMathRenderer } from '../scripts/markdown-math.mjs';

function renderer() {
  return installMathRenderer(new MarkdownIt({ html: false, linkify: true, typographer: true }));
}

test('renders inline and display textbook LaTeX as annotated static MathML', () => {
  const html = renderer().render(String.raw`Let \(A \in \mathcal{O}\) retain faithful breadth.

\[
\bigl|p^{-1}(x)\bigr| =
\begin{cases}
1, & x = 0, \\
2, & x \ne 0.
\end{cases}
\]
`);

  assert.equal((html.match(/<math\b/g) || []).length, 2);
  assert.match(html, /xmlns="http:\/\/www\.w3\.org\/1998\/Math\/MathML"/);
  assert.match(html, /display="block"/);
  assert.match(html, /class="tml-display"/);
  assert.match(html, /<annotation encoding="application\/x-tex">/);
  assert.doesNotMatch(html, /\\\(|\\\)|\\\[|\\\]/);
});

test('renders supported AMS display environments', () => {
  const html = renderer().render(String.raw`\begin{align}
a &= b \\
c &= d
\end{align}
`);

  assert.match(html, /<math\b/);
  assert.match(html, /display="block"/);
  assert.match(html, /begin\{align\}/);
});

test('does not interpret TeX delimiters inside fenced code', () => {
  const source = ['```', '\\[', 'x = 1', '\\]', '```', ''].join('\n');
  const html = renderer().render(source);

  assert.doesNotMatch(html, /<math\b/);
  assert.match(html, /<pre><code>/);
  assert.match(html, /\\\[/);
});

test('fails the build on invalid recognized LaTeX', () => {
  assert.throws(
    () => renderer().render(String.raw`\[
\frac{a}{
\]
`),
    /textbook LaTeX failed/
  );
});
