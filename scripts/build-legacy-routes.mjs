import { readdir, writeFile, mkdir } from 'node:fs/promises';
import { join, relative, extname } from 'node:path';

const ignoredDirs = new Set(['.git', 'node_modules', '_site', 'src']);
const legacyRoots = ['.', 'canon', 'pages'];

function targetFor(path) {
  const lower = path.toLowerCase();
  if (lower === 'index.html' || lower === '404.html') return null;
  if (lower.includes('article-lab') || /^canon\/article-\d+\.html$/.test(lower) || lower.includes('article-research')) return '/lab/';
  if (lower.includes('project')) return '/projects/';
  if (lower.includes('support') || lower.includes('about')) return '/about/';
  if (lower.includes('search')) return '/search/';
  if (lower.includes('accessibility')) return '/accessibility/';
  if (lower.startsWith('canon/') || lower.includes('interdependent_way') || lower.includes('articles-explained')) return '/way/';
  if (lower.startsWith('pages/')) return '/start/';
  return '/start/';
}

async function collectHtml(root) {
  const routes = [];
  async function walk(dir) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (ignoredDirs.has(entry.name)) continue;
        await walk(full);
        continue;
      }
      if (!entry.isFile() || extname(entry.name).toLowerCase() !== '.html') continue;
      const file = relative('.', full);
      const target = targetFor(file);
      if (!target) continue;
      routes.push({
        source: `/${file}`,
        file,
        target,
        status: 'deprecated',
        hmmm: 'Legacy standalone page preserved as a redirect into the unified navigation system.'
      });
    }
  }
  await walk(root);
  return routes;
}

const seen = new Map();
for (const root of legacyRoots) {
  for (const route of await collectHtml(root)) seen.set(route.source, route);
}
const routes = [...seen.values()].sort((a, b) => a.source.localeCompare(b.source));
const data = {
  generatedAt: new Date().toISOString(),
  count: routes.length,
  routes,
  hmmm: routes.length ? [] : ['No legacy HTML pages were discovered to deprecate. A broom found no dust and is trying not to look smug.']
};
await mkdir('src/_data/generated', { recursive: true });
await writeFile('src/_data/generated/legacyRoutes.json', `${JSON.stringify(data, null, 2)}\n`);
console.log(`legacy routes ${routes.length}`);
