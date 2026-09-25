import { createHash } from 'node:crypto';
import { parseCollectionText } from './fetch-org-msdmd.mjs';

// === MODULE_BUILD ===
// id: repository_public_projection
//   purpose: Read one public repository at an exact GitHub head and project its MSDMD collection point plus bounded human documentation without mutating the source repository.
//   entrypoint: fetchRepositoryPublicProjection
//   tests: tests/project-docs.test.mjs, tests/mcp-server.test.mjs
// === END MODULE_BUILD ===
// === BOUNDARIES ===
// id: repository_public_projection_boundary
//   network: allowlisted GitHub API and raw.githubusercontent.com only
//   storage: none
//   authority: repository source bytes remain authoritative; this module only projects exact-head public evidence
//   failure: missing collection points and omitted/oversize docs remain explicit hmmm; no source state is synthesized
// === END BOUNDARIES ===

const ORGANIZATION = 'The-Interdependency';
const API_ORIGIN = 'https://api.github.com';
const RAW_ORIGIN = 'https://raw.githubusercontent.com';
const MAX_DOCUMENTS = 32;
const MAX_DOCUMENT_BYTES = 128 * 1024;
const MAX_TOTAL_BYTES = 640 * 1024;
const MAX_METADATA_BYTES = 2 * 1024 * 1024;
const MAX_API_BYTES = 4 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 10_000;
export const REPOSITORY_NOT_PUBLIC = 'REPOSITORY_NOT_PUBLIC';
const CONTENT_TOO_LARGE = 'CONTENT_TOO_LARGE';

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

function normalizeRepository(value) {
  const name = String(value || '').trim().replace(/^The-Interdependency\//, '');
  if (!/^[A-Za-z0-9_.-]{1,100}$/.test(name)) throw new Error('invalid repository name');
  return name;
}

function apiUrl(pathname, search = {}) {
  const url = new URL(pathname, API_ORIGIN);
  for (const [key, value] of Object.entries(search)) url.searchParams.set(key, String(value));
  return url;
}

function rawUrl(repo, head, path) {
  return new URL('/' + [ORGANIZATION, repo, head, ...String(path).split('/')].map(encodeURIComponent).join('/'), RAW_ORIGIN);
}

function sourceUrl(repo, head, path) {
  return 'https://github.com/' + ORGANIZATION + '/' + encodeURIComponent(repo) + '/blob/' + encodeURIComponent(head) + '/' + String(path).split('/').map(encodeURIComponent).join('/');
}

function headers() {
  const value = {
    accept: 'application/vnd.github+json',
    'x-github-api-version': '2022-11-28',
    'user-agent': 'the-interdependency-public-projection'
  };
  if (process.env.GITHUB_TOKEN) value.authorization = 'Bearer ' + process.env.GITHUB_TOKEN;
  return value;
}

async function getJson(url) {
  if (!(url instanceof URL) || url.origin !== API_ORIGIN || url.protocol !== 'https:') throw new Error('refusing non-GitHub API target');
  const response = await fetch(url, { headers: headers(), signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  if (!response.ok) {
    const error = new Error('GitHub API request failed: ' + response.status);
    error.status = response.status;
    throw error;
  }
  if (!response.body?.getReader && typeof response.text !== 'function' && typeof response.json === 'function') {
    return response.json();
  }
  return JSON.parse(await readBoundedText(response, MAX_API_BYTES));
}

async function readBoundedText(response, maxBytes) {
  const reader = response.body?.getReader?.();
  if (!reader) {
    const text = await response.text();
    if (Buffer.byteLength(text) > maxBytes) {
      const error = new Error('raw GitHub response exceeded byte limit');
      error.code = CONTENT_TOO_LARGE;
      throw error;
    }
    return text;
  }

  const decoder = new TextDecoder();
  let totalBytes = 0;
  let text = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel();
      const error = new Error('raw GitHub response exceeded byte limit');
      error.code = CONTENT_TOO_LARGE;
      throw error;
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

async function getText(url, maxBytes = MAX_METADATA_BYTES) {
  if (!(url instanceof URL) || url.origin !== RAW_ORIGIN || url.protocol !== 'https:') throw new Error('refusing non-raw-GitHub target');
  const response = await fetch(url, {
    headers: { 'user-agent': 'the-interdependency-public-projection' },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });
  if (!response.ok) {
    const error = new Error('raw GitHub request failed: ' + response.status);
    error.status = response.status;
    throw error;
  }
  return readBoundedText(response, maxBytes);
}

export function selectDocumentationPaths(treeEntries) {
  const markdown = (treeEntries || [])
    .filter(item => item?.type === 'blob' && typeof item.path === 'string')
    .map(item => item.path)
    .filter(path => /\.md$/i.test(path))
    .filter(path => !/^\.github\//i.test(path) && !/^\.agents\//i.test(path));

  const readme = markdown.find(path => /^README\.md$/i.test(path)) || null;
  const roots = markdown.filter(path => !path.includes('/') && path !== readme).sort((a, b) => a.localeCompare(b));
  const docs = markdown.filter(path => /^docs\//i.test(path)).sort((a, b) => a.localeCompare(b));
  const ordered = [...new Set([...(readme ? [readme] : []), ...roots, ...docs])];
  return {
    readme,
    paths: ordered.slice(0, MAX_DOCUMENTS),
    omittedCount: Math.max(0, ordered.length - MAX_DOCUMENTS)
  };
}

function notPublicError() {
  const error = new Error('repository is not public');
  error.code = REPOSITORY_NOT_PUBLIC;
  return error;
}

export function isRepositoryNotPublicError(error) {
  return error?.code === REPOSITORY_NOT_PUBLIC;
}

async function publicRepositoryMetadata(repo) {
  let metadata;
  try {
    metadata = await getJson(apiUrl('/repos/' + encodeURIComponent(ORGANIZATION) + '/' + encodeURIComponent(repo)));
  } catch (error) {
    // GitHub deliberately returns 404 for a private repository that the build
    // token cannot see. For a public-only projection, missing and inaccessible
    // metadata are both authority to publish nothing, never to reuse cache.
    if (error?.status === 404) throw notPublicError();
    throw error;
  }
  if (metadata.private === true || (metadata.visibility && metadata.visibility !== 'public')) {
    throw notPublicError();
  }
  return metadata;
}

async function resolveHead(repo) {
  const metadata = await publicRepositoryMetadata(repo);
  const defaultBranch = metadata.default_branch || 'main';
  const commit = await getJson(apiUrl('/repos/' + encodeURIComponent(ORGANIZATION) + '/' + encodeURIComponent(repo) + '/commits/' + encodeURIComponent(defaultBranch)));
  return {
    defaultBranch,
    headSha: commit.sha || null,
    headCommittedAt: commit.commit?.committer?.date || commit.commit?.author?.date || null
  };
}

async function documentationProjection(repo, headSha) {
  const hmmm = [];
  const tree = await getJson(apiUrl('/repos/' + encodeURIComponent(ORGANIZATION) + '/' + encodeURIComponent(repo) + '/git/trees/' + encodeURIComponent(headSha), { recursive: 1 }));
  const selected = selectDocumentationPaths(tree.tree || []);
  const treeTruncated = tree.truncated === true;
  if (treeTruncated) hmmm.push('GitHub recursive tree response was truncated; document discovery is incomplete.');
  if (!selected.readme) hmmm.push(treeTruncated
    ? 'Root README presence is unresolved because document discovery was truncated.'
    : 'No root README.md was present at the consumed repository head.');
  if (selected.omittedCount) hmmm.push(selected.omittedCount + ' Markdown document(s) were omitted by the bounded public-document count limit.');

  const documents = [];
  let totalBytes = 0;
  for (const path of selected.paths) {
    try {
      const content = await getText(rawUrl(repo, headSha, path), MAX_DOCUMENT_BYTES);
      const bytes = Buffer.byteLength(content);
      if (bytes > MAX_DOCUMENT_BYTES) {
        hmmm.push(path + ' exceeds the per-document public projection limit and was omitted.');
        continue;
      }
      if (totalBytes + bytes > MAX_TOTAL_BYTES) {
        hmmm.push('Remaining Markdown documents were omitted after the per-repository public projection byte limit was reached.');
        break;
      }
      totalBytes += bytes;
      documents.push({
        path,
        content,
        bytes,
        sha256: sha256(content),
        sourceUrl: sourceUrl(repo, headSha, path)
      });
    } catch (error) {
      if (error?.code === CONTENT_TOO_LARGE) {
        hmmm.push(path + ' exceeds the per-document public projection limit and was omitted.');
        continue;
      }
      if (error?.status === 404) {
        hmmm.push(path + ' could not be read at the consumed head.');
        continue;
      }
      throw error;
    }
  }

  const readme = selected.readme ? documents.find(item => item.path === selected.readme) || null : null;
  return {
    readme,
    documents: documents.filter(item => item !== readme),
    projectedDocumentCount: documents.length,
    projectedBytes: totalBytes,
    treeTruncated,
    discoveryComplete: !treeTruncated,
    hmmm
  };
}

async function msdmdProjection(repo, headSha) {
  const path = repo + '_msdmd.ts';
  try {
    const text = await getText(rawUrl(repo, headSha, path));
    const collection = parseCollectionText(text);
    const declarations = Array.isArray(collection.declarations) ? collection.declarations : [];
    const gaps = Array.isArray(collection.gaps) ? collection.gaps : [];
    const edges = Array.isArray(collection.edges) ? collection.edges : [];
    const blockCounts = {};
    for (const declaration of declarations) {
      const block = String(declaration?.block || 'hmmm');
      blockCounts[block] = (blockCounts[block] || 0) + 1;
    }
    const declaredRepo = collection.repo || null;
    const declaredRepoMatchesRepository = declaredRepo === null
      || declaredRepo === repo
      || declaredRepo === ORGANIZATION + '/' + repo;
    const hmmm = [];
    if (!declaredRepoMatchesRepository) {
      hmmm.push('Collection-declared repository identity does not match the repository being refreshed.');
    }
    if (collection.source_commit && collection.source_commit !== headSha) {
      hmmm.push('Collection-declared source_commit does not match the repository head consumed by this live refresh.');
    }
    return {
      status: declaredRepoMatchesRepository ? 'ok' : 'invalid',
      path,
      sourceUrl: sourceUrl(repo, headSha, path),
      sha256: sha256(text),
      declaredRepo,
      declaredRepoMatchesRepository,
      declaredSourceCommit: collection.source_commit || null,
      sourceCommitMatchesHead: collection.source_commit ? collection.source_commit === headSha : null,
      counts: {
        declarations: declarations.length,
        gaps: gaps.length,
        edges: edges.length
      },
      blockCounts,
      hmmm
    };
  } catch (error) {
    return {
      status: error?.status === 404 ? 'missing' : 'invalid',
      path,
      sourceUrl: sourceUrl(repo, headSha, path),
      sha256: null,
      declaredRepo: null,
      declaredRepoMatchesRepository: null,
      declaredSourceCommit: null,
      sourceCommitMatchesHead: null,
      counts: { declarations: 0, gaps: 0, edges: 0 },
      blockCounts: {},
      hmmm: [error?.status === 404
        ? 'No repo-level MSDMD collection point was present at the current head.'
        : 'The repo-level MSDMD collection point could not be read or parsed.']
    };
  }
}

export async function fetchRepositoryPublicProjection(repository, options = {}) {
  const {
    headSha = null,
    defaultBranch = null,
    headCommittedAt = null,
    includeDocumentation = true,
    includeMsdmd = true
  } = options;
  const repo = normalizeRepository(repository);
  const headWasSupplied = Object.prototype.hasOwnProperty.call(options, 'headSha');
  if (headWasSupplied && !headSha) throw new Error('repository head unavailable');
  if (headWasSupplied) await publicRepositoryMetadata(repo);
  const resolved = headWasSupplied
    ? { headSha, defaultBranch, headCommittedAt }
    : await resolveHead(repo);
  if (!resolved.headSha) throw new Error('repository head unavailable');

  const [documentation, msdmd] = await Promise.all([
    includeDocumentation ? documentationProjection(repo, resolved.headSha) : Promise.resolve(null),
    includeMsdmd ? msdmdProjection(repo, resolved.headSha) : Promise.resolve(null)
  ]);

  return {
    schema: 'interdependency.repository-public-projection/0.1.0',
    repository: ORGANIZATION + '/' + repo,
    name: repo,
    defaultBranch: resolved.defaultBranch || null,
    headSha: resolved.headSha,
    headCommittedAt: resolved.headCommittedAt || null,
    refreshedAt: new Date().toISOString(),
    documentation,
    msdmd,
    hmmm: []
  };
}
