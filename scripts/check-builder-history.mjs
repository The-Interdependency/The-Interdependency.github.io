// === MODULE_BUILD ===
// id: builder_history_guard
//   module_name: builder-history-guard
//   module_kind: instrument
//   summary: Validates journal entries and rejects changes to the previously published prefix.
//   owner: Erin Spencer
//   public_surface: npm run check:builder; validateHistory(previous, current)
//   internal_surface: src/_data/builder.json and Git base revision
//   auth_boundary: none
//   storage_boundary: read
//   network_boundary: none
//   user_data_boundary: none
//   admin_only: false
//   tests: tests/builder-history.test.mjs
//   rollout: npm run check and both release workflows with complete Git history
//   rollback: remove journal routes and gate together; never silently rewrite published entries
// === END MODULE_BUILD ===
// Usage: npm run check:builder -- --base <commit>; otherwise use the PR base,
// push-before SHA, or HEAD^ for local/scheduled runs. Missing Git history fails.
// This is a release policy, not tamper-proof storage; repository owners control it.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const journalPath = 'src/_data/builder.json';

export function validateHistory(previous, current) {
  assert.ok(Array.isArray(previous) && Array.isArray(current), 'journal must be an array');
  assert.ok(current.length >= previous.length, 'append-only journal: entries were deleted');
  const ids = new Set();
  let lastDate = '';
  for (const entry of current) {
    assert.ok(entry && typeof entry === 'object' && !Array.isArray(entry), 'entry must be an object');
    assert.ok(Object.keys(entry).every(key => ['id', 'date', 'author', 'title', 'body', 'correction_of'].includes(key)), 'unknown entry field');
    for (const key of ['id', 'date', 'author', 'title', 'body']) {
      assert.ok(typeof entry[key] === 'string' && entry[key].trim(), `entry needs ${key}`);
    }
    assert.match(entry.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'entry id must be a stable fragment');
    assert.ok(!ids.has(entry.id), `duplicate entry id: ${entry.id}`);
    assert.match(entry.date, /^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD');
    assert.equal(new Date(`${entry.date}T00:00:00Z`).toISOString().slice(0, 10), entry.date, 'invalid calendar date');
    assert.ok(entry.date >= lastDate, 'entries must stay in chronological order');
    if ('correction_of' in entry) assert.ok(ids.has(entry.correction_of), 'correction must name an earlier entry');
    ids.add(entry.id);
    lastDate = entry.date;
  }
  previous.forEach((entry, index) => assert.deepEqual(current[index], entry, `append-only journal: entry ${index + 1} changed or moved`));
  return { preserved: previous.length, appended: current.length - previous.length };
}

export function checkRepository(base, cwd = process.cwd()) {
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const commit = git('rev-parse', '--verify', `${base}^{commit}`);
  const exists = git('ls-tree', '--name-only', commit, '--', journalPath);
  const previous = exists ? JSON.parse(git('show', `${commit}:${journalPath}`)) : [];
  const current = JSON.parse(readFileSync(new URL(journalPath, pathToFileURL(`${cwd}/`)), 'utf8'));
  return { base: commit, ...validateHistory(previous, current) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  assert.ok(args.length === 0 || (args.length === 2 && args[0] === '--base' && args[1]), 'Usage: check-builder-history.mjs [--base <commit>]');
  const event = process.env.GITHUB_EVENT_PATH ? JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')) : {};
  const before = /^[0-9a-f]{40}$/.test(event.before || '') && !/^0+$/.test(event.before) ? event.before : undefined;
  const base = args[1] || event.pull_request?.base?.sha || before || 'HEAD^';
  console.log(JSON.stringify(checkRepository(base), null, 2));
}
