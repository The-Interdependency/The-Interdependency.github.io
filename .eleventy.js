import markdownIt from 'markdown-it';
import { installMathRenderer } from './scripts/markdown-math.mjs';

// === MODULE_BUILD ===
// id: eleventy_site_configuration
//   purpose: Build the static-first public knowledge system, render exact distributed-textbook Markdown and LaTeX as static MathML, and copy deliberate fallback artifacts.
//   entrypoint: npm run build
//   tests: tests/site-contract.test.mjs, tests/math-rendering.test.mjs, tests/narratives.test.mjs, tests/generated-site.test.mjs
// === END MODULE_BUILD ===

// === CONTRACTS ===
// id: website_gonol_contract_has_one_exact_public_copy
//   given: the commit-pinned UCNS gonol relationship contract enters the Eleventy data graph
//   then: the same source bytes are copied to the public data route without runtime fetching or schema shadowing
//   class: evidence
//   since: 2026-08-03
//
// id: website_sitrep_has_one_public_projection_copy
//   given: repo-owned plan reports are validated and projected through the pinned skill-lib work-graph instrument
//   then: the website publishes the generated presentation view without becoming a second source of repo canon
//   class: evidence
//   since: 2026-08-14
//
// id: website_org_msdmd_has_one_public_projection_copy
//   given: commit-pinned repo-owned msdmd collections are joined into the generated organization map
//   then: the website publishes that generated evidence artifact unchanged and uses it for the visual map without becoming repository metadata authority
//   class: evidence
//   since: 2026-08-16
// === END CONTRACTS ===
// Usage: run `npm run build`; Eleventy emits the static site, copies root machine instructions, and preserves dependency-free public reading paths.

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderInterdefinables(content) {
  const lines = String(content || '').split(/\r?\n/).slice(1);
  const pairs = [];
  const body = [];

  for (const sourceLine of lines) {
    if (/^\s*---\s*$/.test(sourceLine)) break;
    const cleaned = sourceLine
      .trim()
      .replace(/^#{1,6}\s+/, '')
      .replace(/^[-*]\s+/, '')
      .trim();
    if (!cleaned) continue;

    const pair = /^(One who is\s+.+?)\s*(?::\s*|\s+)(One who is not)\.?$/i.exec(cleaned);
    if (pair) {
      pairs.push([pair[1].replace(/[.:;]\s*$/, ''), pair[2]]);
      continue;
    }
    body.push(cleaned);
  }

  const pairHtml = pairs.length
    ? `<ul class="interdefinables-pairs">${pairs.map(([left, right]) => `<li><span>${escapeHtml(left)}</span><span class="interdefinables-divider" aria-hidden="true">:</span><span>${escapeHtml(right)}</span></li>`).join('')}</ul>`
    : '';

  const bodyHtml = body.map(line => {
    if (line === '...') return '<p class="interdefinables-ellipsis" aria-hidden="true">…</p>';
    if (/^Human consciousness emerges from:?$/i.test(line)) {
      return `<h4 class="interdefinables-major">${escapeHtml(line.replace(/:\s*$/, ''))}</h4>`;
    }
    if (/^Binary essences meaningfully/i.test(line)) {
      return `<h5 class="interdefinables-subhead">${escapeHtml(line)}</h5>`;
    }
    const trinary = /^(Trinary (?:perceptual focal (?:states|constructs) of complex system spirals|states of social perception|social perception focal states)):\s*(.*)$/i.exec(line);
    if (trinary) {
      return `<h5 class="interdefinables-subhead">${escapeHtml(trinary[1])}</h5>${trinary[2] ? `<p>${escapeHtml(trinary[2])}</p>` : ''}`;
    }
    const archetype = /^((?:Five dominant )?Archetype passions of possession)[.:]?\s*(.*)$/i.exec(line);
    if (archetype) {
      return `<h5 class="interdefinables-subhead">${escapeHtml(archetype[1])}</h5>${archetype[2] ? `<p>${escapeHtml(archetype[2])}</p>` : ''}`;
    }
    return `<p>${escapeHtml(line)}</p>`;
  }).join('');

  return `${pairHtml}<div class="interdefinables-structure">${bodyHtml}</div>`;
}

export default function configureEleventy(eleventyConfig) {
  const md = installMathRenderer(markdownIt({ html: false, linkify: true, typographer: true }));
  eleventyConfig.setLibrary('md', md);
  eleventyConfig.addPassthroughCopy({
    'src/assets': 'assets',
    'src/_data/gonol_relationship_display.json': 'assets/data/gonol-relationship-display-v1.json',
    'src/_data/generated/sitrep.json': 'assets/data/sitrep.json',
    'src/_data/generated/orgMsdmd.json': 'assets/data/org-msdmd.json',
    'CNAME': 'CNAME',
    'llms.txt': 'llms.txt',
    'artifacts/four-cuts-1.html': 'artifacts/four-cuts/index.html',
    'fallback': 'fallback'
  });
  eleventyConfig.addFilter('json', value => JSON.stringify(value));
  eleventyConfig.addFilter('dateOnly', value => value ? String(value).slice(0, 10) : 'hmmm');
  eleventyConfig.addFilter('where', (items, key, value) => (items || []).filter(item => item?.[key] === value));
  eleventyConfig.addFilter('statusClass', value => `status-${String(value || 'hmmm').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`);
  eleventyConfig.addFilter('markdown', value => md.render(String(value || '')));
  eleventyConfig.addFilter('edcmMarkdown', value => md.render(String(value || ''))
    .replace(/<pre(?![^>]*\btabindex=)([^>]*)>/g, '<pre tabindex="0"$1>')
    .replace(/<math(?![^>]*\btabindex=)(?=[^>]*\bdisplay="block")/g, '<math tabindex="0"'));
  eleventyConfig.addFilter('canonInterdefinablesHtml', renderInterdefinables);

  // The eight publication Article drafts predate the current human-facing UI.
  // Normalize their repeated presentation at build time so the Article is primary,
  // footnotes are named literally, source/provenance is available on demand, and
  // ordinary previous/next/Way navigation remains visible outside that disclosure.
  // This is a static HTML transform; it does not depend on browser JavaScript.
  eleventyConfig.addTransform('article-reading-hierarchy', function(content) {
    const outputPath = this.page?.outputPath || '';
    if (!/\/articles\/article-(?:one|two|three|four|five|six|seven|eight)\/index\.html$/.test(outputPath)) return content;
    return String(content)
      .replace(
        /<section class="panel">\s*<h2>Source boundary<\/h2>\s*<p>([\s\S]*?)<\/p>\s*<p>([\s\S]*?)<\/p>\s*<\/section>/,
        (_match, boundaryText, linkLine) => {
          const links = [...linkLine.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/g)].map(match => match[0]);
          const sourceLink = links.shift() || '';
          const navigation = links.length
            ? `<nav class="article-context-nav" aria-label="Related Article navigation">${links.join(' · ')}</nav>`
            : '';
          return `<details class="provenance-disclosure"><summary>Source &amp; provenance</summary><h2>Source boundary</h2><p>${boundaryText}</p>${sourceLink ? `<p>${sourceLink}</p>` : ''}</details>${navigation}`;
        }
      )
      .replaceAll('Speaker A · exact canon excerpt', 'Article')
      .replaceAll('Speaker B · footnote conversation', 'Footnotes');
  });

  // Exact canonical body lines of a unit: skip the heading line, stop before
  // footnote lines, notes blocks, separators, and sub-headings. Mirrors the
  // body extraction in scripts/verify-article-canon.mjs; keep the two in step.
  eleventyConfig.addFilter('canonUnitBody', content => {
    const lines = String(content || '').split(/\r?\n/).slice(1);
    const body = [];
    for (const line of lines) {
      if (/^\s*>?\s*(?:\[[^\]]+\]|[⁰¹²³⁴⁵⁶⁷⁸⁹]+|\d+)\s+/.test(line)) break;
      if (/^\s*\*\*\[Notes/.test(line)) break;
      if (/^\s*---\s*$/.test(line)) break;
      if (/^\s*#{2,}\s/.test(line)) break;
      if (line.trim()) body.push(line.trim());
    }
    return body;
  });

  return {
    dir: { input: 'src', output: '_site', includes: '_includes', data: '_data' },
    markdownTemplateEngine: 'njk',
    htmlTemplateEngine: 'njk'
  };
}
