import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import yaml from 'js-yaml';

// === MODULE_BUILD ===
// id: organization_project_map
//   purpose: Build public project pages from GitHub facts plus reviewed repository manifests or central overrides.
//   entrypoint: npm run refresh:github
//   tests: tests/repo-coverage.test.mjs, tests/offline-project-snapshot.test.mjs
// === END MODULE_BUILD ===
// === BOUNDARIES ===
// id: github_public_metadata
//   network: reads only allowlisted HTTPS GitHub API endpoints; optional token raises rate limits
//   storage: writes generated and last-known-good JSON snapshots
//   failure: preserves last-known-good data with fallback=true, including reviewed editorial fields
// === END BOUNDARIES ===

const org = 'The-Interdependency';
const githubApiOrigin = 'https://api.github.com';
const headers = ['-H', 'Accept: application/vnd.github+json', '-H', 'X-GitHub-Api-Version: 2022-11-28'];
if (process.env.GITHUB_TOKEN) headers.push('-H', `Authorization: Bearer ${process.env.GITHUB_TOKEN}`);

function githubApiUrl(pathname, search = {}) {
  const url = new URL(pathname, githubApiOrigin);
  for (const [key, value] of Object.entries(search)) url.searchParams.set(key, String(value));
  return url;
}

function getJson(target) {
  const url = target instanceof URL ? target : new URL(target);
  if (url.protocol !== 'https:' || url.origin !== githubApiOrigin) {
    throw new Error(`refusing non-GitHub API target: ${url.origin}`);
  }
  return JSON.parse(execFileSync(
    'curl',
    ['-fsSL', '--retry', '2', '--max-time', '30', ...headers, url.href],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
  ));
}

function normalizeRepoName(value) {
  const name = String(value || '');
  if (!/^[A-Za-z0-9_.-]{1,100}$/.test(name)) throw new Error(`invalid GitHub repository name: ${name}`);
  return name;
}

function getManifest(repoName) {
  try {
    const safeRepo = normalizeRepoName(repoName);
    const response = getJson(githubApiUrl(
      `/repos/${encodeURIComponent(org)}/${encodeURIComponent(safeRepo)}/contents/.interdependency/project.yml`
    ));
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
    const batch = getJson(githubApiUrl(`/orgs/${encodeURIComponent(org)}/repos`, {
      type: 'public',
      sort: 'updated',
      per_page: 100,
      page
    }));
    rawRepos.push(...batch);
    if (batch.length < 100) break;
  }
} catch {
  fallback = true;
  try { rawRepos = JSON.parse(await readFile('src/_data/snapshots/repos.last-known-good.json', 'utf8')).repositories; }
  catch { rawRepos = []; }
}

const repositories = rawRepos.map(repo => {
  const repoName = normalizeRepoName(repo.name);
  const manifest = fallback ? null : getManifest(repoName);
  const inheritedEditorial = fallback ? {
    category: repo.category,
    status: repo.status,
    summary: repo.description,
    purpose: repo.purpose,
    relationships: repo.relationships,
    primary_artifact: repo.primary_artifact,
    docs: repo.docs
  } : {};
  const editorial = {
    ...inheritedEditorial,
    ...(overrides[repoName] || {}),
    ...(manifest || {})
  };
  const hmmm = fallback && Array.isArray(repo.hmmm) ? [...repo.hmmm] : [];
  if (!fallback && !manifest && !overrides[repoName]) {
    hmmm.push('Editorial project role is inferred from public GitHub metadata until a reviewed .interdependency/project.yml is added.');
  }
  if (!editorial.status && !hmmm.includes('Project maturity has not been explicitly declared.')) {
    hmmm.push('Project maturity has not been explicitly declared.');
  }
  return {
    name: repoName,
    slug: repoName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    html_url: repo.html_url || `https://github.com/${org}/${repoName}`,
    description: editorial.summary || repo.description || null,
    purpose: editorial.purpose || null,
    status: editorial.status || 'frontier',
    category: categoryFor(repo, editorial),
    relationships: Array.isArray(editorial.relationships) ? editorial.relationships : [],
    primary_artifact: editorial.primary_artifact || repo.homepage || null,
    docs: editorial.docs || null,
    archived: Boolean(repo.archived),
    fork: Boolean(repo.fork),
    default_branch: repo.default_branch || null,
    topics: Array.isArray(repo.topics) ? repo.topics : [],
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
