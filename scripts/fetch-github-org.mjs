import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import yaml from 'js-yaml';

// === MODULE_BUILD ===
// id: organization_project_map
//   purpose: Build public project pages from GitHub facts plus reviewed repository manifests or central overrides.
//   entrypoint: npm run refresh:github
//   tests: tests/repo-coverage.test.mjs
// === END MODULE_BUILD ===
// === BOUNDARIES ===
// id: github_public_metadata
//   network: reads public GitHub REST endpoints; optional token raises rate limits
//   storage: writes generated and last-known-good JSON snapshots
//   failure: preserves last-known-good data with fallback=true
// === END BOUNDARIES ===

const org = 'The-Interdependency';
const headers = ['-H', 'Accept: application/vnd.github+json', '-H', 'X-GitHub-Api-Version: 2022-11-28'];
if (process.env.GITHUB_TOKEN) headers.push('-H', `Authorization: Bearer ${process.env.GITHUB_TOKEN}`);

function getJson(url) {
  return JSON.parse(execFileSync('curl', ['-fsSL', '--retry', '2', '--max-time', '30', ...headers, url], { encoding: 'utf8' }));
}
function getManifest(repo) {
  try {
    const response = getJson(`https://api.github.com/repos/${org}/${repo}/contents/.interdependency/project.yml`);
    return yaml.load(Buffer.from(response.content || '', 'base64').toString('utf8')) || null;
  } catch {
    return null;
  }
}
function categoryFor(repo, editorial) {
  if (editorial?.category) return editorial.category;
  const text = `${repo.name} ${repo.description || ''} ${(repo.topics || []).join(' ')}`.toLowerCase();
  if (/way|canon|article|publication|website/.test(text)) return 'Public doctrine & publishing';
  if (/ucns|math|theorem|lean|gonal/.test(text)) return 'Mathematics & verification';
  if (/edcm|measure|evaluation|metric/.test(text)) return 'Measurement & evaluation';
  if (/a0|agent|zfae|aimmh|replit/.test(text)) return 'Agent infrastructure';
  if (/skill|msdmd|tool/.test(text)) return 'Skills & tooling';
  return 'Frontier projects';
}

let fallback = false;
let rawRepos = [];
let overrides = {};
try { overrides = yaml.load(await readFile('src/_data/project-overrides.yml', 'utf8')) || {}; } catch {}
try {
  if (process.env.OFFLINE === '1') throw new Error('offline requested');
  for (let page = 1; ; page += 1) {
    const batch = getJson(`https://api.github.com/orgs/${org}/repos?type=public&sort=updated&per_page=100&page=${page}`);
    rawRepos.push(...batch);
    if (batch.length < 100) break;
  }
} catch {
  fallback = true;
  try { rawRepos = JSON.parse(await readFile('src/_data/snapshots/repos.last-known-good.json', 'utf8')).repositories; }
  catch { rawRepos = []; }
}

const repositories = rawRepos.map(repo => {
  const githubShape = repo.html_url ? repo : { ...repo, html_url: repo.html_url || `https://github.com/${org}/${repo.name}` };
  const manifest = fallback ? null : getManifest(repo.name);
  const editorial = { ...(overrides[repo.name] || {}), ...(manifest || {}) };
  const hmmm = [];
  if (!manifest && !overrides[repo.name]) hmmm.push('Editorial project role is inferred from public GitHub metadata until a reviewed .interdependency/project.yml is added.');
  if (!editorial.status) hmmm.push('Project maturity has not been explicitly declared.');
  return {
    name: repo.name,
    slug: repo.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    html_url: githubShape.html_url,
    description: editorial.summary || repo.description || null,
    purpose: editorial.purpose || null,
    status: editorial.status || 'frontier',
    category: categoryFor(repo, editorial),
    relationships: editorial.relationships || [],
    primary_artifact: editorial.primary_artifact || repo.homepage || null,
    docs: editorial.docs || null,
    archived: Boolean(repo.archived),
    fork: Boolean(repo.fork),
    default_branch: repo.default_branch || null,
    topics: repo.topics || [],
    license: repo.license?.spdx_id || repo.license || null,
    language: repo.language || null,
    homepage: repo.homepage || null,
    pushed_at: repo.pushed_at || null,
    visibility: repo.visibility || 'public',
    hmmm
  };
});
const categories = [...new Set(repositories.map(repo => repo.category))].sort();
const data = {
  organization: org,
  snapshotAt: new Date().toISOString(),
  fallback,
  publicRepoCount: repositories.length,
  generatedRouteCount: repositories.length,
  categories,
  repositories
};
await mkdir('src/_data/generated', { recursive: true });
await mkdir('src/_data/snapshots', { recursive: true });
await writeFile('src/_data/generated/repos.json', JSON.stringify(data, null, 2));
if (!fallback) await writeFile('src/_data/snapshots/repos.last-known-good.json', JSON.stringify(data, null, 2));
console.log(`repos ${repositories.length}${fallback ? ' fallback' : ''}`);
