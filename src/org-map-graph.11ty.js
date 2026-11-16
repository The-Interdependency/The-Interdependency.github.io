// Only repository nodes and their links are needed to draw the interactive graph.
export default class {
  data() { return { permalink: '/assets/data/org-msdmd-graph.json', eleventyExcludeFromCollections: true }; }
  render({ generated }) {
    const { repositories, repositoryEdges } = generated.orgMsdmd;
    return JSON.stringify({
      repositories: repositories.map(({ name, slug, archived, counts, collection: { status, readerPath } }) =>
        ({ name, slug, archived, counts, collection: { status, readerPath } })),
      repositoryEdges
    });
  }
}
