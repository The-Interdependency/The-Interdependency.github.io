import markdownIt from 'markdown-it';

// === MODULE_BUILD ===
// id: eleventy_site_configuration
//   purpose: Build the static-first public knowledge system, render exact distributed-textbook Markdown, and copy deliberate fallback artifacts.
//   entrypoint: npm run build
//   tests: tests/site-contract.test.mjs, tests/generated-site.test.mjs
// === END MODULE_BUILD ===

export default function configureEleventy(eleventyConfig) {
  const md = markdownIt({ html: false, linkify: true, typographer: true });
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

  return {
    dir: { input: 'src', output: '_site', includes: '_includes', data: '_data' },
    markdownTemplateEngine: 'njk',
    htmlTemplateEngine: 'njk'
  };
}
