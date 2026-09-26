import { mkdir, readFile, writeFile } from 'node:fs/promises';
import {
  fetchRepositoryPublicProjection,
  isRepositoryNotPublicError
} from './repository-public-projection.mjs';

// === MODULE_BUILD ===
// id: project_documentation_projection
//   purpose: Build bounded exact-head README and Markdown-document projections for public project pages.
//   entrypoint: npm run refresh:project-docs
//   tests: tests/project-docs.test.mjs, tests/offline-project-snapshot.test.mjs
// === END MODULE_BUILD ===
// === BOUNDARIES ===
// id: project_documentation_projection_boundary
//   network: delegates exact-head reads to repository_public_projection
//   storage: generated projectDocs JSON plus last-known-good snapshot
//   authority: source repositories own document content; this website owns presentation only
//   failure: same-head last-known-good data may be retained per repository with fallback=true (online and OFFLINE=1); a different, unknown, or missing head, a missing snapshot entry, and a missing/unreadable/corrupt snapshot all emit unavailable projections; non-public repositories never reuse cached document content
// === END BOUNDARIES ===

const GENERATED_REPOS = 'src/_data/generated/repos.json';
const GENERATED_OUT = 'src/_data/generated/projectDocs.json';
const SNAPSHOT_OUT = 'src/_data/snapshots/project-docs.last-known-good.json';

// Returns { state, data, reason }: state is 'present', 'missing' (ENOENT), 'unreadable'
// (any other read error), or 'corrupt' (the file exists but is not a JSON object).
async function readSnapshot() {
  let text;
  try { text = await readFile(SNAPSHOT_OUT, 'utf8'); }
  catch (error) {
    if (error?.code === 'ENOENT') return { state: 'missing', data: null, reason: null };
    return { state: 'unreadable', data: null, reason: error?.code || error?.message || 'unknown read error' };
  }
  try {
    const data = JSON.parse(text);
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return { state: 'corrupt', data: null, reason: 'snapshot root is not a JSON object' };
    }
    return { state: 'present', data, reason: null };
  } catch (error) {
    return { state: 'corrupt', data: null, reason: error?.message || 'JSON parse error' };
  }
}

function snapshotBoundary(snapshot) {
  if (snapshot.state === 'missing') return 'no last-known-good project documentation snapshot exists';
  if (snapshot.state === 'unreadable') return 'the last-known-good project documentation snapshot could not be read (' + snapshot.reason + ')';
  if (snapshot.state === 'corrupt') return 'the last-known-good project documentation snapshot is corrupt and was ignored (' + snapshot.reason + ')';
  return null;
}

function unavailableProjection(repo, message) {
  return {
    schema: 'interdependency.repository-public-projection/0.1.0',
    repository: 'The-Interdependency/' + repo.name,
    name: repo.name,
    defaultBranch: repo.default_branch || null,
    headSha: null,
    headCommittedAt: null,
    refreshedAt: null,
    documentation: {
      readme: null,
      documents: [],
      projectedDocumentCount: null,
      projectedBytes: null,
      hmmm: [message]
    },
    msdmd: null,
    fallback: false,
    unavailable: true,
    hmmm: [message]
  };
}

// Offline projection is keyed by the current repos.json, never by the snapshot: a snapshot
// entry is reused only when its headSha equals the repository's current head_sha.
async function offlineProjection(snapshot) {
  const repoData = JSON.parse(await readFile(GENERATED_REPOS, 'utf8'));
  const boundary = snapshotBoundary(snapshot);
  const snapshotByRepo = snapshot.data?.byRepository && typeof snapshot.data.byRepository === 'object'
    ? snapshot.data.byRepository
    : {};
  const byRepository = {};
  let fallbackCount = 0;
  let unavailableCount = 0;

  for (const repo of repoData.repositories || []) {
    const prior = snapshotByRepo[repo.name];
    if (!boundary && prior && !prior.unavailable && repo.head_sha && prior.headSha === repo.head_sha) {
      fallbackCount += 1;
      byRepository[repo.name] = {
        ...prior,
        fallback: true,
        hmmm: [...new Set([...(prior.hmmm || []), 'OFFLINE=1: retained the same-head last-known-good documentation projection.'])]
      };
      continue;
    }
    let message;
    if (boundary) {
      message = 'OFFLINE=1 and ' + boundary + '; repository document content remains unavailable.';
    } else if (!repo.head_sha) {
      message = 'OFFLINE=1 and the current repository head is unknown; snapshot documentation cannot be matched to it and remains unavailable.';
    } else if (!prior || prior.unavailable) {
      message = 'OFFLINE=1 and the last-known-good snapshot holds no observed documentation for this repository; document content remains unavailable.';
    } else {
      message = 'OFFLINE=1 and the last-known-good snapshot was observed at a different head than the current repository head; stale documentation was not reused.';
    }
    unavailableCount += 1;
    byRepository[repo.name] = unavailableProjection(repo, message);
  }

  const hmmm = [];
  if (boundary) {
    hmmm.push('OFFLINE=1: ' + boundary + '; emitted metadata-only unavailable projections without inventing document content.');
  } else {
    hmmm.push('OFFLINE=1: reused ' + fallbackCount + ' same-head last-known-good projection(s); ' + unavailableCount + ' repository projection(s) are unavailable.');
  }
  return {
    schema: 'interdependency.project-documentation-map/0.1.0',
    organization: 'The-Interdependency',
    snapshotAt: boundary ? null : snapshot.data.snapshotAt ?? null,
    fallback: fallbackCount > 0,
    fallbackCount,
    byRepository,
    hmmm
  };
}

async function main() {
  await mkdir('src/_data/generated', { recursive: true });
  await mkdir('src/_data/snapshots', { recursive: true });

  const snapshot = await readSnapshot();
  if (process.env.OFFLINE === '1') {
    const offline = await offlineProjection(snapshot);
    await writeFile(GENERATED_OUT, JSON.stringify(offline, null, 2) + '\n');
    console.log(snapshot.state === 'present'
      ? 'project-docs offline · ' + offline.fallbackCount + ' same-head fallback'
      : 'project-docs metadata-only offline (' + snapshot.state + ' snapshot)');
    return;
  }

  const repoData = JSON.parse(await readFile(GENERATED_REPOS, 'utf8'));
  const previousByRepo = snapshot.data?.byRepository || {};
  const byRepository = {};
  let fallbackCount = 0;

  for (const repo of repoData.repositories || []) {
    try {
      byRepository[repo.name] = await fetchRepositoryPublicProjection(repo.name, {
        headSha: repo.head_sha,
        defaultBranch: repo.default_branch,
        headCommittedAt: repo.head_committed_at,
        includeDocumentation: true,
        includeMsdmd: false
      });
    } catch (error) {
      if (isRepositoryNotPublicError(error)) {
        byRepository[repo.name] = unavailableProjection(
          repo,
          'Repository is not currently public; cached documentation was discarded instead of republished.'
        );
        continue;
      }
      const prior = previousByRepo[repo.name];
      if (prior?.headSha === repo.head_sha) {
        fallbackCount += 1;
        byRepository[repo.name] = {
          ...prior,
          fallback: true,
          hmmm: [...new Set([...(prior.hmmm || []), 'Documentation refresh failed at an unchanged head; retained the last-known-good projection.'])]
        };
      } else {
        byRepository[repo.name] = unavailableProjection(
          repo,
          'Documentation refresh failed and no same-head fallback was eligible.'
        );
      }
    }
  }

  const data = {
    schema: 'interdependency.project-documentation-map/0.1.0',
    organization: 'The-Interdependency',
    snapshotAt: new Date().toISOString(),
    fallback: fallbackCount > 0,
    fallbackCount,
    byRepository,
    hmmm: fallbackCount ? [fallbackCount + ' repository documentation projection(s) used same-head fallback data.'] : []
  };
  await writeFile(GENERATED_OUT, JSON.stringify(data, null, 2) + '\n');
  await writeFile(SNAPSHOT_OUT, JSON.stringify(data, null, 2) + '\n');
  console.log('project-docs ' + Object.keys(byRepository).length + ' repositories · ' + fallbackCount + ' fallback');
}

await main();
