import markdownIt from 'markdown-it';

export default function(eleventyConfig) {
  const md = markdownIt({ html: false, linkify: true, typographer: true });
  eleventyConfig.setLibrary('md', md);
  eleventyConfig.addPassthroughCopy({ 'src/assets': 'assets', CNAME: 'CNAME' });
  eleventyConfig.addFilter('json', v => JSON.stringify(v));
  eleventyConfig.addFilter('dateOnly', v => v ? String(v).slice(0,10) : 'hmmm');
  eleventyConfig.addFilter('where', (arr, key, val) => (arr || []).filter(item => item?.[key] === val));
  return { dir: { input: 'src', output: '_site', includes: '_includes', data: '_data' }, markdownTemplateEngine: 'njk', htmlTemplateEngine: 'njk' };
}
