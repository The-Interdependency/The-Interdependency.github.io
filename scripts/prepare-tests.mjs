import { execFileSync } from 'node:child_process';

// === MODULE_BUILD ===
// id: offline_test_data_preparation
//   purpose: Regenerate canon and project data deterministically before npm test without requiring network access or a full site build.
//   entrypoint: npm test via the pretest lifecycle
//   tests: tests/canon-integrity.test.mjs, tests/repo-coverage.test.mjs
// === END MODULE_BUILD ===
// === BOUNDARIES ===
// id: offline_test_preparation
//   network: disabled by OFFLINE=1
//   storage: refreshes generated JSON from repository recovery mirrors and last-known-good snapshots
//   failure: exits immediately when any preparation command fails
// === END BOUNDARIES ===

const env = { ...process.env, OFFLINE: '1', GITHUB_TOKEN: '' };
for (const script of [
  'scripts/fetch-canon.mjs',
  'scripts/parse-canon.mjs',
  'scripts/fetch-github-org.mjs'
]) {
  execFileSync(process.execPath, [script], { env, stdio: 'inherit' });
}
