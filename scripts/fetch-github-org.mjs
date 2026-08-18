import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import yaml from 'js-yaml';

// === MODULE_BUILD ===
// id: organization_project_map
//   purpose: Build active public project pages from GitHub facts plus reviewed repository manifests or central overrides, recording exact default-branch heads for reproducible downstream consumers.
//   entrypoint: npm run refresh:github
//   tests: tests/repo-coverage.test.mjs, tests/offline-project-snapshot.test.mjs
// === END MODULE_BUILD ===
// === BOUNDARIES ===
// id: github_public_metadata
//   network: reads only allowlisted HTTPS GitHub API and raw.githubusercontent.com endpoints; optional token raises API rate limits
//   storage: writes generated and last-known-good JSON snapshots for active public repositories only
//   failure: preserves last-known-good active-project data with fallback=true, including reviewed editorial fields
// === END BOUNDARIES ===
// Usage: run `npm run refresh:github`; the generated repo snapshot records each active public repository's exact default-branch head so later collectors can fetch commit-pinned source without repeating GitHub API lookups. GitHub-archived repositories are deliberately excluded from public website data, routes, counts, and downstream maps.

const org = 'The-Interdependency';
const githubApiOrigin = 'https://api.github.com';
const rawGithubOrigin = 'https://raw.githubusercontent.com';
const headers = ['-H', 'Accept: application/vnd.github+json', '-H', 'X-GitHub-Api-Version: 2022-11-28'];
if (process.env.GITHUB_TOKEN) headers.push('-H', `Authorization: Bearer ${process.env.GITHUB_TOKEN}`);

function githubApiUrl(pathname, search = {}) {
  const url = new URL(pathname, githubApiOrigin);
  for (const [key, value] of Object.entries(search)) url.searchParams.set(key, String(value));
  return url;
}

function rawGithubUrl(repoName, commit, path) {
  const parts = [org, repoName, commit, ...String(path).split('/')].map(encodeURIComponent);
  return new URL(`/${parts.join('/')}`, rawGithubOrigin);
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

function getText(target) {
  const url = target instanceof URL ? target : new URL(target);
  if (url.protocol !== 'https:' || url.origin !== rawGithubOrigin) {
    throw new Error(`refusing non-raw-GitHub target: ${url.origin}`);
  }
  return execFileSync(
    'curl',
    ['-fsSL', '--retry', '2', '--max-time', '20', url.href],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
  );
}

function normalizeRepoName(value) {
  const name = String(value || '');
  if (!/^[A-Za-z0-9_.-]{1,100}$/.test(name)) throw new Error(`invalid GitHub repository name: ${name}`);
  return name;
}

function getHead(repoName, defaultBranch) {
  try {
    if (!defaultBranch) return { sha: null, committed_at: null };
    const safeRepo = normalizeRepoName(repoName);
    const response = getJson(githubApiUrl(
      `/repos/${encodeURIComponent(org)}/${encodeURIComponent(safeRepo)}/commits/${encodeURIComponent(defaultBranch)}`
    ));
    return {
      sha: response.sha || null,
      committed_at: response.commit?.committer?.date || response.commit?.author?.date || null
    };
  } catch {
    return { sha: null, committed_at: null };
  }
}

function getManifest(repoName, headSha) {
  try {
    if (!headSha) return null;
    const safeRepo = normalizeRepoName(repoName);
    return yaml.load(getText(rawGithubUrl(safeRepo, headSha, '.interdependency/project.yml'))) || null;
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

const activeRepos = rawRepos.filter(repo => !repo.archived);
const repositories = activeRepos.map(repo => {
  const repoName = normalizeRepoName(repo.name);
  const head = fallback
    ? { sha: repo.head_sha || null, committed_at: repo.head_committed_at || null }
    : getHead(repoName, repo.default_branch);
  const manifest = fallback ? null : getManifest(repoName, head.sha);
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
  if (!fallback && !head.sha) {
    hmmm.push('Exact default-branch head was unavailable during this snapshot; commit-pinned downstream collection is suspended for this repository.');
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
    archived: false,
    fork: Boolean(repo.fork),
    default_branch: repo.default_branch || null,
    head_sha: head.sha,
    head_committed_at: head.committed_at,
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
  excludedArchivedRepoCount: rawRepos.length - activeRepos.length,
  categories,
  repositories
};
await mkdir('src/_data/generated', { recursive: true });
await mkdir('src/_data/snapshots', { recursive: true });
await writeFile('src/_data/generated/repos.json', JSON.stringify(data, null, 2));
if (!fallback) await writeFile('src/_data/snapshots/repos.last-known-good.json', JSON.stringify(data, null, 2));
console.log(`repos ${repositories.length}; archived excluded ${data.excludedArchivedRepoCount}${fallback ? ' fallback' : ''}`);
