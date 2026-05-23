module.exports = function(eleventyConfig) {
  // Pass-through copy
  eleventyConfig.addPassthroughCopy({ "assets": "assets" });

  // Collections
  eleventyConfig.addCollection("articles", c => c.getFilteredByGlob("src/articles/**/*.md"));
  eleventyConfig.addCollection("etiquette", c => c.getFilteredByGlob("src/etiquette/**/*.md"));
  eleventyConfig.addCollection("addenda", c => c.getFilteredByGlob("src/addenda/**/*.md"));
  eleventyConfig.addCollection("interdefinables", c => c.getFilteredByGlob("src/interdefinables/**/*.md"));
  eleventyConfig.addCollection("lab", c => c.getFilteredByGlob("src/lab/**/*.md"));
  eleventyConfig.addCollection("contra", c => c.getFilteredByGlob("src/contra/**/*.md"));

  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "_site"
    },
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk"
  };
};
