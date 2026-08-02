// === MODULE_BUILD ===
// id: public_sitemap
//   module_name: sitemap
//   module_kind: route
//   summary: Publishes stable public page locations plus the collection-excluded AI-context endpoint for machine discovery.
//   owner: Erin Spencer
//   public_surface: /sitemap.xml
//   internal_surface: SitemapTemplate.render, collections.all, site.url
//   auth_boundary: none
//   storage_boundary: none
//   network_boundary: none
//   user_data_boundary: none
//   admin_only: false
//   tests: tests/site-contract.test.mjs, tests/generated-site.test.mjs
//   rollout: emitted by every Eleventy build
//   rollback: remove this template and its discovery checks
// === END MODULE_BUILD ===
// Usage: crawlers read `/sitemap.xml`; ordinary routes come from `collections.all`, while the deliberately collection-excluded AI context and root LLM instructions are listed explicitly.

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export default class SitemapTemplate {
  data() {
    return {
      permalink: 'sitemap.xml',
      eleventyExcludeFromCollections: true
    };
  }

  render({ collections, site }) {
    const routes = (collections?.all || [])
      .map(item => item.url)
      .filter(Boolean);
    routes.push('/eai/aicontext.md', '/llms.txt');
    const uniqueRoutes = [...new Set(routes)].sort();
    const entries = uniqueRoutes
      .map(route => `  <url><loc>${escapeXml(`${site.url}${route}`)}</loc></url>`)
      .join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
  }
}
