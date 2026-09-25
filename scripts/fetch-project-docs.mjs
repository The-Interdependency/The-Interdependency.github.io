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
//   failure: same-head last-known-good data may be retained with fallback=true; non-public repositories never reuse cached document content
// === END BOUNDARIES ===

const GENERATED_REPOS = 'src/_data/generated/repos.json';
const GENERATED_OUT = 'src/_data/generated/projectDocs.json';
const SNAPSHOT_OUT = 'src/_data/snapshots/project-docs.last-known-good.json';

async function readSnapshot() {
  try { return JSON.parse(await readFile(SNAPSHOT_OUT, 'utf8')); }
  catch { return null; }
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
      projectedDocumentCount: 0,
      projectedBytes: 0,
      hmmm: [message]
    },
    msdmd: null,
    fallback: false,
    unavailable: true,
    hmmm: [message]
  };
}

async function offlineWithoutSnapshot() {
  const repoData = JSON.parse(await readFile(GENERATED_REPOS, 'utf8'));
  const byRepository = {};
  for (const repo of repoData.repositories || []) {
    byRepository[repo.name] = unavailableProjection(
      repo,
      'OFFLINE=1 and no last-known-good project documentation snapshot exists; repository document content remains unavailable.'
    );
  }
  return {
    schema: 'interdependency.project-documentation-map/0.1.0',
    organization: 'The-Interdependency',
    snapshotAt: null,
    fallback: false,
    fallbackCount: 0,
    byRepository,
    hmmm: ['OFFLINE=1: no last-known-good project documentation snapshot exists; emitted metadata-only unavailable projections without inventing document content.']
  };
}

async function main() {
  await mkdir('src/_data/generated', { recursive: true });
  await mkdir('src/_data/snapshots', { recursive: true });

  const previous = await readSnapshot();
  if (process.env.OFFLINE === '1') {
    const fallback = previous
      ? {
          ...previous,
          fallback: true,
          hmmm: [...new Set([...(previous.hmmm || []), 'OFFLINE=1: displaying the last-known-good project documentation snapshot.'])]
        }
      : await offlineWithoutSnapshot();
    await writeFile(GENERATED_OUT, JSON.stringify(fallback, null, 2) + '\n');
    console.log(previous ? 'project-docs fallback' : 'project-docs metadata-only offline');
    return;
  }

  const repoData = JSON.parse(await readFile(GENERATED_REPOS, 'utf8'));
  const previousByRepo = previous?.byRepository || {};
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
