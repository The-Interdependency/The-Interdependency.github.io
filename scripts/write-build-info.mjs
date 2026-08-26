import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';

// === MODULE_BUILD ===
// id: public_build_identity
//   module_name: write-build-info
//   module_kind: worker
//   summary: Publishes machine-readable site, canon, textbook, and dynamic-source identities for post-deployment verification.
//   owner: Erin Spencer
//   public_surface: _site/build.json
//   internal_surface: git commit resolution, canonical provenance projection, chapter-source identity projection, dynamic-source fallback receipts
//   auth_boundary: none
//   storage_boundary: write
//   network_boundary: none
//   user_data_boundary: none
//   admin_only: false
//   tests: tests/generated-site.test.mjs, tests/textbook-integrity.test.mjs
//   rollout: runs at the end of npm run build
//   rollback: remove build.json and both live identity checks together
// === END MODULE_BUILD ===
// Usage: run `node scripts/write-build-info.mjs` after `_site` exists; CI supplies GITHUB_SHA and GITHUB_REPOSITORY.
// Limits: records build identity but does not itself prove which endpoint serves it.

// === BOUNDARIES ===
// id: public_build_identity_boundary
//   summary: Reads canon, textbook, and dynamic-source provenance and writes public build identity into the generated site.
//   auth_boundary: none
//   storage_boundary: write
//   network_boundary: none
//   user_data_boundary: none
//   admin_only: false
//   pii: none
//   secrets: none
//   side_effects: build.json write
//   owner: Erin Spencer
// === END BOUNDARIES ===

function localCommit() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

const canon = JSON.parse(await readFile('src/_data/generated/canon.json', 'utf8'));
const textbook = JSON.parse(await readFile('src/_data/generated/textbook.json', 'utf8'));
const repositories = JSON.parse(await readFile('src/_data/generated/repos.json', 'utf8'));
const organizationMsdmd = JSON.parse(await readFile('src/_data/generated/orgMsdmd.json', 'utf8'));
const sitrep = JSON.parse(await readFile('src/_data/generated/sitrep.json', 'utf8'));
const works = JSON.parse(await readFile('src/_data/generated/works.json', 'utf8'));
const commit = process.env.GITHUB_SHA || localCommit();
const info = {
  repository: process.env.GITHUB_REPOSITORY || 'The-Interdependency/The-Interdependency.github.io',
  commit,
  generatedAt: new Date().toISOString(),
  canonicalSource: {
    repository: canon.source.repository,
    path: canon.source.path,
    commit: canon.source.commit,
    blob: canon.source.blob,
    contentSha256: canon.source.contentSha256,
    fallback: Boolean(canon.source.fallback)
  },
  distributedTextbook: {
    schema: textbook.schema,
    chapterCount: textbook.chapterCount,
    complete: Boolean(textbook.complete),
    fallback: Boolean(textbook.fallback),
    chapters: textbook.chapters.map(chapter => ({
      number: chapter.number,
      slug: chapter.slug,
      title: chapter.title,
      repository: chapter.repository,
      path: chapter.path,
      commit: chapter.commit,
      blob: chapter.blob,
      contentSha256: chapter.contentSha256,
      status: chapter.status,
      fallback: Boolean(chapter.fallback)
    }))
  },
  dynamicSources: {
    organizationRepositories: {
      snapshotAt: repositories.snapshotAt || null,
      fallback: Boolean(repositories.fallback),
      publicRepoCount: repositories.publicRepoCount,
      excludedArchivedRepoCount: repositories.excludedArchivedRepoCount
    },
    organizationMsdmd: {
      schema: organizationMsdmd.schema,
      fallback: Boolean(organizationMsdmd.fallback),
      stateDigest: organizationMsdmd.sourceSnapshot?.stateDigest || null,
      summary: organizationMsdmd.summary
    },
    sitrep: {
      schema: sitrep.schema,
      version: sitrep.version,
      fallback: Boolean(sitrep.fallback),
      sourceSnapshotAt: sitrep.sourceSnapshotAt || null,
      missingReportCount: Array.isArray(sitrep.missingReports) ? sitrep.missingReports.length : null
    },
    relatedWorks: {
      schema: works.schema,
      generatedAt: works.generatedAt || null,
      fallback: Boolean(works.fallback),
      workCount: Array.isArray(works.works) ? works.works.length : null,
      excludedCount: Array.isArray(works.excluded) ? works.excluded.length : null
    }
  }
};

await writeFile('_site/build.json', `${JSON.stringify(info, null, 2)}\n`);
console.log(`build identity ${commit} textbook-chapters=${textbook.chapterCount}`);
