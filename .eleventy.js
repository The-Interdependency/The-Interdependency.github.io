import markdownIt from 'markdown-it';

export default function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ 'assets': 'assets' });

  const md = markdownIt({
    html: true,
    linkify: true,
    typographer: true
  });
  eleventyConfig.setLibrary('md', md);

  // Collections
  eleventyConfig.addCollection('articles', col => col.getFilteredByGlob('src/articles/**/*.md'));
  eleventyConfig.addCollection('etiquette', col => col.getFilteredByGlob('src/etiquette/**/*.md'));
  eleventyConfig.addCollection('addenda', col => col.getFilteredByGlob('src/addenda/**/*.md'));
  eleventyConfig.addCollection('interdefinables', col => col.getFilteredByGlob('src/interdefinables/**/*.md'));
  eleventyConfig.addCollection('lab', col => col.getFilteredByGlob('src/lab/**/*.md'));
  eleventyConfig.addCollection('contra', col => col.getFilteredByGlob('src/contra/**/*.md'));
  eleventyConfig.addCollection('glossary', col => col.getFilteredByGlob('src/glossary/**/*.md'));
  eleventyConfig.addCollection('resources', col => col.getFilteredByGlob('src/resources/**/*.md'));
  eleventyConfig.addCollection('changelog', col => col.getFilteredByGlob('src/changelog/**/*.md'));

  return {
    dir: {
      input: 'src',
      includes: '_includes',
      data: '_data',
      output: '_site'
    },
    markdownTemplateEngine: 'njk',
    htmlTemplateEngine: 'njk',
    templateFormats: [ 'md', 'njk', 'html' ]
  };
}
