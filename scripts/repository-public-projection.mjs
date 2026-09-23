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
  const response = await fetch(url, { headers: headers() });
  if (!response.ok) throw new Error('GitHub API request failed: ' + response.status);
  return response.json();
}

async function getText(url) {
  if (!(url instanceof URL) || url.origin !== RAW_ORIGIN || url.protocol !== 'https:') throw new Error('refusing non-raw-GitHub target');
  const response = await fetch(url, { headers: { 'user-agent': 'the-interdependency-public-projection' } });
  if (!response.ok) {
    const error = new Error('raw GitHub request failed: ' + response.status);
    error.status = response.status;
    throw error;
  }
  return response.text();
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

async function resolveHead(repo) {
  const metadata = await getJson(apiUrl('/repos/' + encodeURIComponent(ORGANIZATION) + '/' + encodeURIComponent(repo)));
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
  if (!selected.readme) hmmm.push('No root README.md was present at the consumed repository head.');
  if (selected.omittedCount) hmmm.push(selected.omittedCount + ' Markdown document(s) were omitted by the bounded public-document count limit.');

  const documents = [];
  let totalBytes = 0;
  for (const path of selected.paths) {
    try {
      const content = await getText(rawUrl(repo, headSha, path));
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
      hmmm.push(path + ' could not be read at the consumed head.');
    }
  }

  const readme = selected.readme ? documents.find(item => item.path === selected.readme) || null : null;
  return {
    readme,
    documents: documents.filter(item => item !== readme),
    projectedDocumentCount: documents.length,
    projectedBytes: totalBytes,
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
    return {
      status: 'ok',
      path,
      sourceUrl: sourceUrl(repo, headSha, path),
      sha256: sha256(text),
      declaredRepo: collection.repo || null,
      declaredSourceCommit: collection.source_commit || null,
      sourceCommitMatchesHead: collection.source_commit ? collection.source_commit === headSha : null,
      counts: {
        declarations: declarations.length,
        gaps: gaps.length,
        edges: edges.length
      },
      blockCounts,
      hmmm: collection.source_commit && collection.source_commit !== headSha
        ? ['Collection-declared source_commit does not match the repository head consumed by this live refresh.']
        : []
    };
  } catch (error) {
    return {
      status: error?.status === 404 ? 'missing' : 'invalid',
      path,
      sourceUrl: sourceUrl(repo, headSha, path),
      sha256: null,
      declaredRepo: null,
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

export async function fetchRepositoryPublicProjection(repository, {
  headSha = null,
  defaultBranch = null,
  headCommittedAt = null,
  includeDocumentation = true,
  includeMsdmd = true
} = {}) {
  const repo = normalizeRepository(repository);
  const resolved = headSha ? { headSha, defaultBranch, headCommittedAt } : await resolveHead(repo);
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
