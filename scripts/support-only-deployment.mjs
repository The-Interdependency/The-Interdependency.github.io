// === MODULE_BUILD ===
// id: support_only_deployment_guard
//   module_name: support-only-deployment
//   module_kind: instrument
//   summary: Suppress the Render MCP hook only for reviewed website releases from their frozen base commits.
//   owner: website maintainers
//   public_surface: node scripts/support-only-deployment.mjs; classifyDeployment(context)
//   internal_surface: exact release path allowlists, push commit diff, support package test-registration check
//   auth_boundary: none
//   storage_boundary: read
//   network_boundary: none
//   user_data_boundary: none
//   admin_only: false
//   tests: tests/support-only-deployment.test.mjs
//   rollout: Pages build output gates the existing Render MCP deploy step
//   rollback: restore the prior push/main condition and remove this script and its tests together
// === END MODULE_BUILD ===
// Usage: node scripts/support-only-deployment.mjs in a complete Git checkout,
// with GITHUB_EVENT_NAME, GITHUB_REF, GITHUB_SHA, and GITHUB_EVENT_PATH set by
// Actions. Successful classification writes deploy_render=true/false to
// GITHUB_OUTPUT when present. Missing history or invalid push identity exits
// nonzero without authorizing Render. Non-push events never authorize Render.
// Each exemption applies only to a push from its reviewed frozen base below,
// never future changes on the same paths. The support release requires a visible
// support surface change; its package.json exception only appends support tests.
// The PR76 documentation release requires both producer and template changes
// and never permits package or workflow changes. Both allowlists are exact.
// Dependency, MCP, or out-of-scope changes retain existing Render behavior.
// Renames inspect both paths. Keep both reviewed bases frozen.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { pathToFileURL } from 'node:url';

// PR76's public-site release is independent of the MCP server. This frozen
// exception must not be moved forward or broadened for subsequent releases.
export const projectDocsReleaseBase = '9411ab01aab94f1f0783108c8e877877484b7305';
const projectDocsReleasePaths = new Set([
  'scripts/check-builder-history.mjs',
  'scripts/fetch-project-docs.mjs',
  'scripts/repository-public-projection.mjs',
  'src/_data/builder.json',
  'src/assets/js/project-refresh.js',
  'src/projects/repo.njk',
  'tests/builder-history.test.mjs',
  'tests/offline-project-snapshot.test.mjs',
  'tests/site.spec.mjs',
  'scripts/support-only-deployment.mjs',
  'tests/support-only-deployment.test.mjs'
]);

export const supportReleaseBase = '1dea160f3281e3d98e3697e3ebadc08d8d6fe0c8';
const supportSurfaces = new Set([
  'src/index.njk',
  'src/_includes/components/site-footer.njk'
]);
const supportPaths = new Set([
  ...supportSurfaces,
  'src/_data/builder.json',
  'tests/support-links.test.mjs',
  'tests/support-links.spec.mjs',
  'scripts/support-only-deployment.mjs',
  'tests/support-only-deployment.test.mjs',
  '.github/workflows/pages.yml',
  'package.json'
]);
const supportTests = new Set([
  'tests/support-links.test.mjs',
  'tests/support-only-deployment.test.mjs'
]);

export function isSupportTestRegistration(previousText, currentText) {
  const previous = JSON.parse(previousText);
  const current = JSON.parse(currentText);
  const before = previous?.scripts?.test;
  const after = current?.scripts?.test;
  if (typeof before !== 'string' || typeof after !== 'string' || !after.startsWith(`${before} `)) return false;
  const additions = after.slice(before.length + 1).split(' ');
  if (!additions.length || new Set(additions).size !== additions.length) return false;
  if (!additions.every(path => supportTests.has(path) && !before.split(' ').includes(path))) return false;
  return isDeepStrictEqual(previous, { ...current, scripts: { ...current.scripts, test: before } });
}

export function classifyDeployment({ eventName, ref, before, after, sha, cwd = process.cwd() }) {
  if (eventName !== 'push' || ref !== 'refs/heads/main') {
    return { deployRender: false, reason: 'not-main-push', changedPaths: [] };
  }
  for (const [label, revision] of Object.entries({ before, after, sha })) {
    assert.ok(typeof revision === 'string' && /^[0-9a-f]{40}$/.test(revision) && !/^0+$/.test(revision), `Missing or invalid push ${label} SHA; Render deployment is not authorized`);
  }
  assert.equal(after, sha, 'Push after SHA must match the workflow SHA');
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  assert.equal(git('rev-parse', '--verify', 'HEAD^{commit}').trim(), sha, 'Checkout must match the workflow SHA');
  for (const revision of [before, after]) git('cat-file', '-e', `${revision}^{commit}`);
  const changedPaths = git('diff', '--no-renames', '--name-only', '-z', before, after, '--').split('\0').filter(Boolean);
  let supportOnly = before === supportReleaseBase
    && changedPaths.some(path => supportSurfaces.has(path))
    && changedPaths.every(path => supportPaths.has(path));
  if (supportOnly && changedPaths.includes('package.json')) {
    supportOnly = isSupportTestRegistration(git('show', `${before}:package.json`), git('show', `${after}:package.json`));
  }
  // Require the actual documentation producer and visible documentation surface,
  // not merely tests, guard maintenance, or a journal entry. Package/dependency
  // and workflow changes are deliberately absent from this release's allowlist.
  const projectDocsOnly = before === projectDocsReleaseBase
    && changedPaths.includes('scripts/fetch-project-docs.mjs')
    && changedPaths.includes('src/projects/repo.njk')
    && changedPaths.every(path => projectDocsReleasePaths.has(path));
  return {
    deployRender: !(supportOnly || projectDocsOnly),
    reason: supportOnly ? 'support-only' : projectDocsOnly ? 'project-docs-only' : 'ordinary-main-push',
    changedPaths
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const eventName = process.env.GITHUB_EVENT_NAME;
    const ref = process.env.GITHUB_REF;
    const isMainPush = eventName === 'push' && ref === 'refs/heads/main';
    const event = isMainPush ? JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')) : {};
    const result = classifyDeployment({ eventName, ref, before: event.before, after: event.after, sha: process.env.GITHUB_SHA });
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `deploy_render=${result.deployRender}\n`);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(`Render deployment classification failed; no hook authorized: ${error.message}`);
    process.exitCode = 1;
  }
}
