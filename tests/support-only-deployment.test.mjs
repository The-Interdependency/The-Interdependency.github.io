// Usage: node --test tests/support-only-deployment.test.mjs. Temporary local
// Git histories cover the one-time support release, mixed, later, and failed push
// classifications; CLI tests verify fail-closed Actions outputs. No network or
// deployment hook is called. Fixtures clone the local repository's frozen base
// (full history is required, as in the release workflows) and are removed after
// each test. The source repository's files and refs are never changed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyDeployment, isSupportTestRegistration, supportReleaseBase } from '../scripts/support-only-deployment.mjs';

const script = fileURLToPath(new URL('../scripts/support-only-deployment.mjs', import.meta.url));
const repository = fileURLToPath(new URL('..', import.meta.url));
const packageBefore = JSON.parse(execFileSync('git', ['show', `${supportReleaseBase}:package.json`], { cwd: repository, encoding: 'utf8' }));
const addedTests = ' tests/support-links.test.mjs tests/support-only-deployment.test.mjs';
const packageAfter = { ...packageBefore, scripts: { ...packageBefore.scripts, test: packageBefore.scripts.test + addedTests } };

function fixture(t) {
  const cwd = mkdtempSync(join(tmpdir(), 'support-deployment-'));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: 'pipe' }).trim();
  const write = (path, content) => {
    mkdirSync(dirname(join(cwd, path)), { recursive: true });
    writeFileSync(join(cwd, path), content);
  };
  const commit = () => { git('add', '-A'); git('commit', '--quiet', '--allow-empty', '-m', 'fixture'); return git('rev-parse', 'HEAD'); };
  execFileSync('git', ['clone', '--quiet', '--shared', '--no-checkout', repository, cwd], { stdio: 'pipe' });
  git('config', 'user.name', 'Test');
  git('config', 'user.email', 'test@example.invalid');
  git('config', 'commit.gpgsign', 'false');
  git('config', 'core.hooksPath', '/dev/null');
  git('checkout', '--quiet', '--detach', supportReleaseBase);
  const before = supportReleaseBase;
  const classify = () => {
    const after = commit();
    return classifyDeployment({ eventName: 'push', ref: 'refs/heads/main', before, after, sha: after, cwd });
  };
  return { cwd, git, write, commit, before, classify };
}

test('a complete support-link transaction skips only the Render hook', t => {
  const f = fixture(t);
  f.write('src/index.njk', 'Homepage support links');
  f.write('src/_includes/components/site-footer.njk', 'Footer support links');
  f.write('src/_data/builder.json', '[{"body":"new entry"}]');
  for (const path of ['tests/support-links.test.mjs', 'tests/support-links.spec.mjs', 'scripts/support-only-deployment.mjs', 'tests/support-only-deployment.test.mjs', '.github/workflows/pages.yml']) f.write(path, 'Support deployment fixture');
  f.write('package.json', JSON.stringify(packageAfter));
  const result = f.classify();
  assert.equal(result.deployRender, false);
  assert.equal(result.reason, 'support-only');
  assert.equal(result.changedPaths.length, 9);
});

test('either visible support surface may qualify in the frozen release', t => {
  const f = fixture(t);
  f.write('src/_includes/components/site-footer.njk', 'Updated footer');
  assert.equal(f.classify().deployRender, false);
});

test('every later push retains Render even when it changes only the same support paths', t => {
  const f = fixture(t);
  f.write('src/index.njk', 'Initial support links');
  const before = f.commit();
  f.write('src/index.njk', 'Later homepage change');
  f.write('src/_includes/components/site-footer.njk', 'Later footer change');
  f.write('.github/workflows/pages.yml', 'Later workflow change');
  const after = f.commit();
  const result = classifyDeployment({ eventName: 'push', ref: 'refs/heads/main', before, after, sha: after, cwd: f.cwd });
  assert.equal(result.deployRender, true);
  assert.equal(result.reason, 'ordinary-main-push');
});

for (const path of ['server/mcp-server.mjs', 'README.md', 'src/about/index.njk', 'package-lock.json', '.github/workflows/ci.yml', 'scripts/other.mjs', 'src/index.njk.extra', 'src/assets/css/styles.css', 'src/new\nfile.njk']) {
  test(`support mixed with ${JSON.stringify(path)} retains Render deployment`, t => {
    const f = fixture(t);
    f.write('src/index.njk', 'Updated support links');
    f.write(path, 'Other change');
    assert.equal(f.classify().deployRender, true);
  });
}

test('an ordinary server-only push retains Render deployment', t => {
  const f = fixture(t);
  f.write('server/mcp-server.mjs', 'Updated server');
  assert.equal(f.classify().deployRender, true);
});

test('empty pushes and guard/journal-only changes retain prior deployment behavior', t => {
  const f = fixture(t);
  assert.equal(f.classify().deployRender, true);
  f.write('src/_data/builder.json', '[{"body":"new entry"}]');
  f.write('scripts/support-only-deployment.mjs', 'Guard change');
  assert.equal(f.classify().deployRender, true);
});

test('renaming an unrelated file into an allowed support path still deploys Render', t => {
  const f = fixture(t);
  renameSync(join(f.cwd, 'server/mcp-server.mjs'), join(f.cwd, 'src/index.njk'));
  const result = f.classify();
  assert.equal(result.deployRender, true);
  assert.ok(result.changedPaths.includes('server/mcp-server.mjs'));
  assert.ok(result.changedPaths.includes('src/index.njk'));
});

test('the entire push range is inspected rather than only the final commit', t => {
  const f = fixture(t);
  f.write('server/mcp-server.mjs', 'Updated server');
  f.commit();
  f.write('src/index.njk', 'Updated support links');
  assert.equal(f.classify().deployRender, true);
});

test('package registration accepts only newly appended support test arguments', () => {
  const check = current => isSupportTestRegistration(JSON.stringify(packageBefore), JSON.stringify(current));
  assert.equal(check(packageAfter), true);
  assert.equal(check({ ...packageAfter, scripts: { ...packageBefore.scripts, test: packageBefore.scripts.test + ' tests/support-links.test.mjs' } }), true);
  assert.equal(check(packageBefore), false);
  assert.equal(check({ ...packageAfter, dependencies: { example: '2.0.0' } }), false);
  assert.equal(check({ ...packageAfter, scripts: { ...packageAfter.scripts, start: 'node server.mjs' } }), false);
  for (const suffix of [' tests/other.test.mjs', ' && echo changed', ' tests/support-links.test.mjs tests/support-links.test.mjs']) {
    assert.equal(check({ ...packageAfter, scripts: { ...packageBefore.scripts, test: packageBefore.scripts.test + suffix } }), false);
  }
  assert.equal(isSupportTestRegistration(JSON.stringify(packageAfter), JSON.stringify(packageAfter)), false);
  assert.throws(() => isSupportTestRegistration('{', '{}'));
});

test('support plus a dependency or unrelated package script change retains Render', t => {
  const f = fixture(t);
  f.write('src/index.njk', 'Updated support links');
  f.write('package.json', JSON.stringify({ ...packageAfter, dependencies: { example: '2.0.0' } }));
  assert.equal(f.classify().deployRender, true);
});

test('non-main and non-push events never authorize Render or need push history', () => {
  for (const eventName of ['workflow_dispatch', 'repository_dispatch', 'schedule', 'pull_request']) {
    assert.equal(classifyDeployment({ eventName, ref: 'refs/heads/main' }).deployRender, false);
  }
  assert.equal(classifyDeployment({ eventName: 'push', ref: 'refs/heads/feature' }).deployRender, false);
});

test('invalid, missing, all-zero, unavailable, or mismatched revisions fail closed', t => {
  const f = fixture(t);
  const context = { eventName: 'push', ref: 'refs/heads/main', before: f.before, after: f.before, sha: f.before, cwd: f.cwd };
  for (const before of [undefined, '', 'HEAD^', '-bad', '0'.repeat(40), 'a'.repeat(40)]) {
    assert.throws(() => classifyDeployment({ ...context, before }));
  }
  assert.throws(() => classifyDeployment({ ...context, after: 'a'.repeat(40) }), /workflow SHA/);
  assert.throws(() => classifyDeployment({ ...context, after: 'a'.repeat(40), sha: 'a'.repeat(40) }), /Checkout/);
});

test('CLI authorizes Render only after successful ordinary-push classification', t => {
  const f = fixture(t);
  f.write('README.md', 'Ordinary change');
  const after = f.commit();
  const eventPath = join(f.cwd, 'event.json');
  const output = join(f.cwd, 'output.txt');
  writeFileSync(eventPath, JSON.stringify({ before: f.before, after }));
  const env = { ...process.env, GITHUB_EVENT_NAME: 'push', GITHUB_REF: 'refs/heads/main', GITHUB_SHA: after, GITHUB_EVENT_PATH: eventPath, GITHUB_OUTPUT: output };
  const valid = spawnSync(process.execPath, [script], { cwd: f.cwd, env, encoding: 'utf8' });
  assert.equal(valid.status, 0, valid.stderr);
  assert.equal(readFileSync(output, 'utf8'), 'deploy_render=true\n');
  for (const contents of ['{', JSON.stringify({ before: 'a'.repeat(40), after }), JSON.stringify({ before: '0'.repeat(40), after })]) {
    rmSync(output);
    writeFileSync(eventPath, contents);
    const invalid = spawnSync(process.execPath, [script], { cwd: f.cwd, env, encoding: 'utf8' });
    assert.equal(invalid.status, 1);
    assert.match(invalid.stderr, /no hook authorized/);
    assert.equal(existsSync(output), false);
    writeFileSync(output, '');
  }
});

test('CLI records a support-only skip without calling an external service', t => {
  const f = fixture(t);
  f.write('src/index.njk', 'Support links');
  const after = f.commit();
  const eventPath = join(f.cwd, 'event.json');
  const output = join(f.cwd, 'output.txt');
  writeFileSync(eventPath, JSON.stringify({ before: f.before, after }));
  const result = spawnSync(process.execPath, [script], {
    cwd: f.cwd,
    env: { ...process.env, GITHUB_EVENT_NAME: 'push', GITHUB_REF: 'refs/heads/main', GITHUB_SHA: after, GITHUB_EVENT_PATH: eventPath, GITHUB_OUTPUT: output },
    encoding: 'utf8'
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(output, 'utf8'), 'deploy_render=false\n');
  assert.equal(JSON.parse(result.stdout).reason, 'support-only');
});

test('Pages keeps its deployment path and requires an explicit successful Render classification', () => {
  const workflow = readFileSync(new URL('../.github/workflows/pages.yml', import.meta.url), 'utf8');
  assert.match(workflow, /outputs:\s+deploy_render: \$\{\{ steps\.render_scope\.outputs\.deploy_render \}\}/);
  assert.match(workflow, /fetch-depth: 0/);
  assert.match(workflow, /name: Classify Render deployment scope\s+id: render_scope\s+run: node scripts\/support-only-deployment\.mjs/);
  assert.match(workflow, /name: Trigger Render MCP deploy\s+if: github\.event_name == 'push' && github\.ref == 'refs\/heads\/main' && needs\.build\.outputs\.deploy_render == 'true'/);
  assert.match(workflow, /name: Deploy to GitHub Pages\s+id: deployment\s+uses: actions\/deploy-pages@/);
  assert.match(workflow, /curl --fail --show-error --silent --retry 3 --request POST "\$RENDER_DEPLOY_HOOK_URL"/);
  assert.doesNotMatch(workflow, /paths-ignore:|paths:/);
});
