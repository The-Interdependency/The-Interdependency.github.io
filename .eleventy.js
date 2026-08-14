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
// === END CONTRACTS ===
// Usage: run `npm run build`; Eleventy emits the static site, copies root machine instructions, and preserves dependency-free public reading paths.

export default function configureEleventy(eleventyConfig) {
  const md = installMathRenderer(markdownIt({ html: false, linkify: true, typographer: true }));
  eleventyConfig.setLibrary('md', md);
  eleventyConfig.addPassthroughCopy({
    'src/assets': 'assets',
    'src/_data/gonol_relationship_display.json': 'assets/data/gonol-relationship-display-v1.json',
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

  // The eight publication Article drafts predate the current human-facing UI.
  // Normalize their repeated presentation at build time so the Article is primary,
  // footnotes are named literally, and source/provenance is available on demand.
  // This is a static HTML transform; it does not depend on browser JavaScript.
  eleventyConfig.addTransform('article-reading-hierarchy', function(content) {
    const outputPath = this.page?.outputPath || '';
    if (!/\/articles\/article-(?:one|two|three|four|five|six|seven|eight)\/index\.html$/.test(outputPath)) return content;
    return String(content)
      .replace(/<section class="panel">\s*<h2>Source boundary<\/h2>([\s\S]*?)<\/section>/, '<details class="provenance-disclosure"><summary>Source &amp; provenance</summary><h2>Source boundary</h2>$1</details>')
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
