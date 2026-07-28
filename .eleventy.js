import markdownIt from 'markdown-it';
import { installMathRenderer } from './scripts/markdown-math.mjs';

// === MODULE_BUILD ===
// id: eleventy_site_configuration
//   purpose: Build the static-first public knowledge system, render exact distributed-textbook Markdown and LaTeX as static MathML, and copy deliberate fallback artifacts.
//   entrypoint: npm run build
//   tests: tests/site-contract.test.mjs, tests/math-rendering.test.mjs, tests/generated-site.test.mjs
// === END MODULE_BUILD ===

export default function configureEleventy(eleventyConfig) {
  const md = installMathRenderer(markdownIt({ html: false, linkify: true, typographer: true }));
  eleventyConfig.setLibrary('md', md);
  eleventyConfig.addPassthroughCopy({
    'src/assets': 'assets',
    'CNAME': 'CNAME',
    'artifacts/four-cuts-1.html': 'artifacts/four-cuts/index.html',
    'fallback': 'fallback'
  });
  eleventyConfig.addFilter('json', value => JSON.stringify(value));
  eleventyConfig.addFilter('dateOnly', value => value ? String(value).slice(0, 10) : 'hmmm');
  eleventyConfig.addFilter('where', (items, key, value) => (items || []).filter(item => item?.[key] === value));
  eleventyConfig.addFilter('statusClass', value => `status-${String(value || 'hmmm').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`);
  eleventyConfig.addFilter('markdown', value => md.render(String(value || '')));
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
