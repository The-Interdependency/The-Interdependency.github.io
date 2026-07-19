import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

// === MODULE_BUILD ===
// id: canonical_source_fetch
//   purpose: Retrieve the Wayseer canonical text or preserve a visibly labeled local recovery mirror.
//   entrypoint: npm run refresh:canon
//   tests: tests/canon-integrity.test.mjs
// === END MODULE_BUILD ===
// === BOUNDARIES ===
// id: canon_network_boundary
//   network: read-only HTTPS request to allowlisted GitHub API and raw content endpoints
//   storage: writes generated snapshots beneath src/_data/snapshots
//   failure: falls back to the repository mirror and records fallback=true
// === END BOUNDARIES ===

const canonical = {
  repository: 'wayseer00/main',
  path: 'canon/INTERDEPENDENT_WAY.txt',
  branch: 'main',
  webUrl: 'https://github.com/wayseer00/main/blob/main/canon/INTERDEPENDENT_WAY.txt'
};
const localMirror = 'canon/the_interdependent_way.md';
const githubApiOrigin = 'https://api.github.com';
const rawOrigin = 'https://raw.githubusercontent.com';
const allowedOrigins = new Set([githubApiOrigin, rawOrigin]);
const githubHeaders = ['-H', 'Accept: application/vnd.github+json', '-H', 'X-GitHub-Api-Version: 2022-11-28'];
if (process.env.GITHUB_TOKEN) githubHeaders.push('-H', `Authorization: Bearer ${process.env.GITHUB_TOKEN}`);

function curlText(target, extraHeaders = []) {
  const url = target instanceof URL ? target : new URL(target);
  if (url.protocol !== 'https:' || !allowedOrigins.has(url.origin)) {
    throw new Error(`refusing non-allowlisted canon target: ${url.origin}`);
  }
  return execFileSync('curl', ['-fsSL', '--retry', '2', '--max-time', '30', ...extraHeaders, url.href], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

function githubApiUrl(pathname, search = {}) {
  const url = new URL(pathname, githubApiOrigin);
  for (const [key, value] of Object.entries(search)) url.searchParams.set(key, String(value));
  return url;
}

function getJson(target) {
  return JSON.parse(curlText(target, githubHeaders));
}

function fetchRemote() {
  if (process.env.OFFLINE === '1') throw new Error('offline requested');
  const [owner, repo] = canonical.repository.split('/');
  const encodedOwner = encodeURIComponent(owner);
  const encodedRepo = encodeURIComponent(repo);
  const encodedPath = canonical.path.split('/').map(segment => encodeURIComponent(segment)).join('/');
  const apiBase = `/repos/${encodedOwner}/${encodedRepo}`;
  const commitInfo = getJson(githubApiUrl(`${apiBase}/commits/${encodeURIComponent(canonical.branch)}`));
  const commit = commitInfo.sha;
  if (!/^[a-f0-9]{40}$/i.test(commit)) throw new Error('canon branch did not resolve to a commit SHA');
  const fileInfo = getJson(githubApiUrl(`${apiBase}/contents/${encodedPath}`, { ref: commit }));
  if (fileInfo.type !== 'file' || !fileInfo.sha) throw new Error('canon path did not resolve to a file blob');
  const resolvedUrl = new URL(`/${encodedOwner}/${encodedRepo}/${commit}/${encodedPath}`, rawOrigin);
  const text = curlText(resolvedUrl);
  return { text, commit, blob: fileInfo.sha, resolvedUrl: resolvedUrl.href };
}

await mkdir('src/_data/snapshots', { recursive: true });
let text;
let fallback = false;
let retrievalError = null;
let remote = { commit: null, blob: null, resolvedUrl: null };
try {
  remote = fetchRemote();
  text = remote.text;
} catch (error) {
  fallback = true;
  retrievalError = String(error?.message || error);
  text = await readFile(localMirror, 'utf8');
}
if (!text.trim()) throw new Error('canonical text is empty');

let siteCommit = 'unknown';
try {
  siteCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
} catch {}
const contentSha256 = createHash('sha256').update(text).digest('hex');
const metadata = {
  ...canonical,
  commit: remote.commit,
  blob: remote.blob,
  resolvedUrl: remote.resolvedUrl,
  retrievedAt: new Date().toISOString(),
  contentSha256,
  fallback,
  fallbackSource: fallback ? localMirror : null,
  retrievalError: fallback ? retrievalError : null,
  siteCommit
};
await writeFile('src/_data/snapshots/canon.last-known-good.md', `---\n${JSON.stringify(metadata)}\n---\n${text}`);
await writeFile('src/_data/snapshots/canon.provenance.json', JSON.stringify(metadata, null, 2));
console.log(`canon ${canonical.repository}/${canonical.path} ${contentSha256}${fallback ? ' fallback' : ''}`);
