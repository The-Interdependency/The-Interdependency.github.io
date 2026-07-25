import temml from 'temml';

// === MODULE_BUILD ===
// id: static_textbook_math_renderer
//   module_name: markdown-math
//   module_kind: adapter
//   summary: Recognizes the textbook's TeX delimiters before Markdown escaping and emits static MathML during the Eleventy build.
//   owner: Erin Spencer
//   public_surface: installMathRenderer(markdownIt)
//   internal_surface: bracket and AMS block rules, inline delimiter rule, fail-closed Temml rendering
//   auth_boundary: none
//   storage_boundary: none
//   network_boundary: none
//   user_data_boundary: none
//   admin_only: false
//   tests: tests/math-rendering.test.mjs, tests/generated-site.test.mjs, tests/site.spec.mjs
//   rollout: installed into the repository-owned markdown-it instance in .eleventy.js
//   rollback: remove installMathRenderer and the Temml dependency; exact chapter Markdown remains available through provenance links
// === END MODULE_BUILD ===
// Usage: call installMathRenderer(md) before rendering source Markdown containing \(...\), \[...\], $$...$$, or supported AMS display environments.
// Limits: renders TeX math syntax only; it does not evaluate equations, validate mathematical claims, or alter owning-repository source text.

// === BOUNDARIES ===
// id: static_textbook_math_rendering_boundary
//   summary: Converts repository-controlled TeX expressions to static MathML with untrusted commands disabled and bounded expansion and size.
//   auth_boundary: none
//   storage_boundary: none
//   network_boundary: none
//   user_data_boundary: none
//   admin_only: false
//   pii: none
//   secrets: none
//   side_effects: build fails when a recognized math expression cannot be parsed
//   owner: Erin Spencer
// === END BOUNDARIES ===

const BRACKET_FENCES = new Map([
  ['\\[', '\\]'],
  ['$$', '$$']
]);

const INLINE_FENCES = [
  { open: '\\(', close: '\\)', displayMode: false },
  { open: '\\[', close: '\\]', displayMode: true },
  { open: '$$', close: '$$', displayMode: true }
];

const AMS_ENVIRONMENT = /^\\begin\{(equation\*?|align\*?|alignat\*?|gather\*?|CD)\}\s*$/;

const TEMML_OPTIONS = Object.freeze({
  annotate: true,
  maxExpand: 1000,
  maxSize: [100, 100],
  strict: false,
  throwOnError: true,
  trust: false,
  xml: true
});

function lineContent(state, line) {
  return state.src.slice(state.bMarks[line] + state.tShift[line], state.eMarks[line]);
}

function locationFor(token) {
  if (!Array.isArray(token.map)) return 'an inline expression';
  const start = token.map[0] + 1;
  const end = token.map[1];
  return start === end ? `source line ${start}` : `source lines ${start}-${end}`;
}

function renderMath(token) {
  const tex = String(token.content || '').trim();
  if (!tex) throw new Error(`empty textbook LaTeX at ${locationFor(token)}`);

  try {
    return temml.renderToString(tex, {
      ...TEMML_OPTIONS,
      displayMode: Boolean(token.meta?.displayMode)
    });
  } catch (error) {
    const excerpt = tex.length > 180 ? `${tex.slice(0, 177)}...` : tex;
    throw new Error(
      `textbook LaTeX failed at ${locationFor(token)}: ${excerpt}\n${String(error?.message || error)}`,
      { cause: error }
    );
  }
}

function mathBlock(state, startLine, endLine, silent) {
  const first = lineContent(state, startLine).trim();
  const bracketClose = BRACKET_FENCES.get(first);
  const environment = first.match(AMS_ENVIRONMENT)?.[1] || null;
  if (!bracketClose && !environment) return false;

  const close = bracketClose || `\\end{${environment}}`;
  const body = [];
  let nextLine = startLine + 1;

  for (; nextLine < endLine; nextLine += 1) {
    const current = lineContent(state, nextLine);
    if (current.trim() === close) break;
    body.push(current);
  }

  if (nextLine >= endLine) {
    if (silent) return true;
    throw new Error(`unclosed textbook LaTeX block beginning at source line ${startLine + 1}`);
  }

  if (silent) return true;

  const token = state.push('math_block', 'math', 0);
  token.block = true;
  token.content = environment
    ? [first, ...body, close].join('\n')
    : body.join('\n');
  token.map = [startLine, nextLine + 1];
  token.meta = { displayMode: true };
  state.line = nextLine + 1;
  return true;
}

function mathInline(state, silent) {
  const fence = INLINE_FENCES.find(candidate => state.src.startsWith(candidate.open, state.pos));
  if (!fence) return false;

  const contentStart = state.pos + fence.open.length;
  const contentEnd = state.src.indexOf(fence.close, contentStart);
  if (contentEnd < 0) return false;

  if (!silent) {
    const token = state.push('math_inline', 'math', 0);
    token.content = state.src.slice(contentStart, contentEnd);
    token.meta = { displayMode: fence.displayMode };
  }

  state.pos = contentEnd + fence.close.length;
  return true;
}

export function installMathRenderer(md) {
  if (!md?.block?.ruler || !md?.inline?.ruler || !md?.renderer?.rules) {
    throw new TypeError('installMathRenderer requires a markdown-it instance');
  }

  md.block.ruler.before('fence', 'math_block', mathBlock, {
    alt: ['paragraph', 'reference', 'blockquote', 'list']
  });
  md.inline.ruler.before('escape', 'math_inline', mathInline);
  md.renderer.rules.math_block = (tokens, index) => `${renderMath(tokens[index])}\n`;
  md.renderer.rules.math_inline = (tokens, index) => renderMath(tokens[index]);
  return md;
}
