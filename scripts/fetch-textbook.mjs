import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

// === MODULE_BUILD ===
// id: distributed_textbook_fetch
//   module_name: fetch-textbook
//   module_kind: service
//   summary: Resolves chapters zero through seven from their owning repositories and emits one provenance-bearing reading dataset.
//   owner: Erin Spencer
//   public_surface: npm run refresh:textbook, generated.textbook
//   internal_surface: allowlisted GitHub API and raw-file retrieval, chapter-source validation, snapshot fallback
//   auth_boundary: optional read-only GITHUB_TOKEN
//   storage_boundary: writes generated textbook data and a last-known-good snapshot
//   network_boundary: allowlisted read-only HTTPS to api.github.com and raw.githubusercontent.com
//   user_data_boundary: none
//   admin_only: false
//   tests: tests/textbook-integrity.test.mjs, tests/generated-site.test.mjs, tests/site.spec.mjs
//   rollout: required by refresh:data before validation and Eleventy generation
//   rollback: remove refresh:textbook and the generated chapter routes; source repositories remain unchanged
// === END MODULE_BUILD ===
// Usage: run `npm run refresh:textbook`; set OFFLINE=1 to use a retained snapshot or metadata-only hmmm records.
// Limits: displays exact source Markdown but does not transfer license, theorem, proof, empirical, or canonical status between repositories.

// === BOUNDARIES ===
// id: distributed_textbook_network_boundary
//   summary: Reads only the eight declared chapter files from allowlisted GitHub endpoints.
//   auth_boundary: optional GitHub read token
//   storage_boundary: write beneath src/_data/generated and src/_data/snapshots
//   network_boundary: external read-only
//   user_data_boundary: none
//   admin_only: false
//   pii: none
//   secrets: GITHUB_TOKEN is passed only as an HTTPS authorization header and never written
//   side_effects: generated dataset and snapshot writes
//   owner: Erin Spencer
// === END BOUNDARIES ===

const apiOrigin = 'https://api.github.com';
const rawOrigin = 'https://raw.githubusercontent.com';
const allowedOrigins = new Set([apiOrigin, rawOrigin]);
const manifest = JSON.parse(await readFile('src/_data/textbook_sources.json', 'utf8'));
const snapshotPath = 'src/_data/snapshots/textbook.last-known-good.json';
const generatedPath = 'src/_data/generated/textbook.json';
const githubHeaders = ['-H', 'Accept: application/vnd.github+json', '-H', 'X-GitHub-Api-Version: 2022-11-28'];
if (process.env.GITHUB_TOKEN) githubHeaders.push('-H', `Authorization: Bearer ${process.env.GITHUB_TOKEN}`);

function curlText(target, extraHeaders = []) {
  const url = target instanceof URL ? target : new URL(target);
  if (url.protocol !== 'https:' || !allowedOrigins.has(url.origin)) throw new Error(`refusing non-allowlisted textbook target: ${url.origin}`);
  return execFileSync('curl', ['-fsSL', '--retry', '2', '--max-time', '30', ...extraHeaders, url.href], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

function getJson(target) {
  return JSON.parse(curlText(target, githubHeaders));
}

function apiUrl(pathname, search = {}) {
  const url = new URL(pathname, apiOrigin);
  for (const [key, value] of Object.entries(search)) url.searchParams.set(key, String(value));
  return url;
}

function encodedRepository(repository) {
  const [owner, repo] = repository.split('/');
  if (!owner || !repo) throw new Error(`invalid chapter repository ${repository}`);
  return { owner: encodeURIComponent(owner), repo: encodeURIComponent(repo) };
}

function encodedPath(path) {
  return path.split('/').map(segment => encodeURIComponent(segment)).join('/');
}

function validateManifest() {
  if (!Array.isArray(manifest) || manifest.length !== 8) throw new Error('textbook source manifest must contain chapters zero through seven');
  const numbers = manifest.map(source => source.number);
  if (numbers.some((number, index) => number !== index)) throw new Error('textbook source manifest must be ordered 0 through 7');
  if (new Set(manifest.map(source => source.slug)).size !== 8) throw new Error('textbook chapter slugs must be unique');
  if (new Set(manifest.map(source => `${source.repository}:${source.path}`)).size !== 8) throw new Error('textbook chapter source locations must be unique');
}

function metadataOnly(source, error) {
  return {
    ...source,
    content: null,
    contentSha256: null,
    commit: null,
    blob: null,
    resolvedUrl: null,
    sourceUrl: `https://github.com/${source.repository}/blob/${source.branch}/${source.path}`,
    retrievedAt: null,
    fallback: true,
    retrievalError: error
  };
}

function fetchOne(source) {
  const { owner, repo } = encodedRepository(source.repository);
  const path = encodedPath(source.path);
  const base = `/repos/${owner}/${repo}`;
  const commitInfo = getJson(apiUrl(`${base}/commits/${encodeURIComponent(source.branch)}`));
  const commit = commitInfo.sha;
  if (!/^[a-f0-9]{40}$/i.test(commit)) throw new Error(`${source.repository} branch did not resolve to a commit SHA`);
  const fileInfo = getJson(apiUrl(`${base}/contents/${path}`, { ref: commit }));
  if (fileInfo.type !== 'file' || !fileInfo.sha) throw new Error(`${source.repository}/${source.path} did not resolve to a file blob`);
  const resolvedUrl = new URL(`/${owner}/${repo}/${commit}/${path}`, rawOrigin);
  const content = curlText(resolvedUrl);
  if (!content.trim()) throw new Error(`${source.repository}/${source.path} is empty`);
  if (!content.includes(source.title)) throw new Error(`${source.repository}/${source.path} no longer contains expected title: ${source.title}`);
  const chapterHeading = source.number === 0 ? '# Chapter Zero' : `# Chapter ${source.number}:`;
  if (!content.includes(chapterHeading)) throw new Error(`${source.repository}/${source.path} no longer declares ${chapterHeading}`);
  return {
    ...source,
    content,
    contentSha256: createHash('sha256').update(content).digest('hex'),
    commit,
    blob: fileInfo.sha,
    resolvedUrl: resolvedUrl.href,
    sourceUrl: `https://github.com/${source.repository}/blob/${commit}/${source.path}`,
    retrievedAt: new Date().toISOString(),
    fallback: false,
    retrievalError: null
  };
}

async function readSnapshot() {
  try {
    const snapshot = JSON.parse(await readFile(snapshotPath, 'utf8'));
    return Array.isArray(snapshot?.chapters) ? snapshot : null;
  } catch {
    return null;
  }
}

validateManifest();
await mkdir('src/_data/generated', { recursive: true });
await mkdir('src/_data/snapshots', { recursive: true });
const previous = await readSnapshot();
const previousByNumber = new Map((previous?.chapters || []).map(chapter => [chapter.number, chapter]));
const offline = process.env.OFFLINE === '1';
const chapters = [];

for (const source of manifest) {
  if (offline) {
    const retained = previousByNumber.get(source.number);
    chapters.push(retained ? { ...retained, ...source, fallback: true, retrievalError: 'offline requested; retained last-known-good chapter content' } : metadataOnly(source, 'offline requested; no retained chapter snapshot'));
    continue;
  }
  try {
    chapters.push(fetchOne(source));
  } catch (error) {
    const retained = previousByNumber.get(source.number);
    const message = String(error?.message || error);
    chapters.push(retained ? { ...retained, ...source, fallback: true, retrievalError: message } : metadataOnly(source, message));
  }
}

const dataset = {
  schema: 'interdependency.distributed-textbook/1.0.0',
  title: 'The Interdependency — Chapters Zero Through Seven',
  generatedAt: new Date().toISOString(),
  fallback: chapters.some(chapter => chapter.fallback),
  complete: chapters.every(chapter => Boolean(chapter.content)),
  chapterCount: chapters.length,
  chapters
};

await writeFile(generatedPath, JSON.stringify(dataset, null, 2));
if (!offline && chapters.every(chapter => !chapter.fallback && chapter.content)) await writeFile(snapshotPath, JSON.stringify(dataset, null, 2));
console.log(`textbook chapters=${chapters.length} complete=${dataset.complete} fallback=${dataset.fallback}`);
