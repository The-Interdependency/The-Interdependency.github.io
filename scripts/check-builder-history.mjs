// === MODULE_BUILD ===
// id: builder_history_guard
//   module_name: builder-history-guard
//   module_kind: instrument
//   summary: Requires every website change transaction to append a model-attributed builder record while preserving the published journal prefix.
//   owner: Erin Spencer
//   public_surface: npm run check:builder; validateHistory(previous, current); checkRepository(base, cwd)
//   internal_surface: src/_data/builder.json, Git base revision, repository changed-path set
//   auth_boundary: none
//   storage_boundary: read
//   network_boundary: none
//   user_data_boundary: none
//   admin_only: false
//   tests: tests/builder-history.test.mjs
//   rollout: npm run check and both release workflows with complete Git history
//   rollback: remove the website-builder-journal policy, gate, and route contract together; never silently rewrite published entries
// === END MODULE_BUILD ===
// Usage: npm run check:builder -- --base <commit>; otherwise use the PR base,
// push-before SHA, or HEAD^ for local/scheduled runs. Any changed repository path
// other than the journal itself requires at least one newly appended builder entry.
// A journal-only append satisfies itself and does not recursively require another.
// Missing Git history fails. Exact model identity is supplied by the executing builder.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const journalPath = 'src/_data/builder.json';
const allowedFields = new Set(['id', 'date', 'time', 'model', 'body', 'title', 'author', 'correction_of']);
const genericModelLabels = new Set(['ai', 'builder', 'openai', 'codex', 'chatgpt', 'claude']);

function requireText(entry, key) {
  assert.ok(typeof entry[key] === 'string' && entry[key].trim(), `entry needs ${key}`);
}

function validateDate(date) {
  assert.match(date, /^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD');
  assert.equal(new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10), date, 'invalid calendar date');
}

function validateTime(time) {
  assert.match(
    time,
    /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?(?:Z|[+-](?:0\d|1[0-4]):[0-5]\d)$/,
    'time must be HH:MM[:SS] with an explicit UTC offset'
  );
}

function validateModel(model) {
  requireText({ model }, 'model');
  assert.ok(!genericModelLabels.has(model.trim().toLowerCase()), 'model must be the exact runtime model, not a generic provider or agent label');
}

export function validateHistory(previous, current) {
  assert.ok(Array.isArray(previous) && Array.isArray(current), 'journal must be an array');
  assert.ok(current.length >= previous.length, 'append-only journal: entries were deleted');

  previous.forEach((entry, index) => {
    assert.deepEqual(current[index], entry, `append-only journal: entry ${index + 1} changed or moved`);
  });

  const ids = new Set();
  let lastDate = '';
  current.forEach((entry, index) => {
    assert.ok(entry && typeof entry === 'object' && !Array.isArray(entry), 'entry must be an object');
    assert.ok(Object.keys(entry).every(key => allowedFields.has(key)), 'unknown entry field');
    for (const key of ['id', 'date', 'body']) requireText(entry, key);

    assert.match(entry.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'entry id must be a stable fragment');
    assert.ok(!ids.has(entry.id), `duplicate entry id: ${entry.id}`);
    validateDate(entry.date);
    assert.ok(entry.date >= lastDate, 'entries must stay in chronological order');

    if ('time' in entry) validateTime(entry.time);
    if ('model' in entry) validateModel(entry.model);
    if ('title' in entry) requireText(entry, 'title');
    if ('author' in entry) requireText(entry, 'author');
    if ('correction_of' in entry) {
      requireText(entry, 'correction_of');
      assert.ok(ids.has(entry.correction_of), 'correction must name an earlier entry');
    }

    if (index >= previous.length) {
      requireText(entry, 'time');
      validateTime(entry.time);
      requireText(entry, 'model');
      validateModel(entry.model);
    }

    ids.add(entry.id);
    lastDate = entry.date;
  });

  return { preserved: previous.length, appended: current.length - previous.length };
}

export function checkRepository(base, cwd = process.cwd()) {
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const commit = git('rev-parse', '--verify', `${base}^{commit}`);
  const exists = git('ls-tree', '--name-only', commit, '--', journalPath);
  const previous = exists ? JSON.parse(git('show', `${commit}:${journalPath}`)) : [];
  const current = JSON.parse(readFileSync(new URL(journalPath, pathToFileURL(`${cwd}/`)), 'utf8'));
  const history = validateHistory(previous, current);

  const tracked = git('diff', '--name-only', commit, '--', '.').split('\n').filter(Boolean);
  const untracked = git('ls-files', '--others', '--exclude-standard').split('\n').filter(Boolean);
  const changedPaths = [...new Set([...tracked, ...untracked])].sort();
  const websiteChangedPaths = changedPaths.filter(path => path !== journalPath);
  const requiresEntry = websiteChangedPaths.length > 0;

  if (requiresEntry) {
    assert.ok(history.appended >= 1, 'website change requires at least one appended By the builder entry');
  }

  return { base: commit, ...history, requiresEntry, changedPaths, websiteChangedPaths };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  assert.ok(args.length === 0 || (args.length === 2 && args[0] === '--base' && args[1]), 'Usage: check-builder-history.mjs [--base <commit>]');
  const event = process.env.GITHUB_EVENT_PATH ? JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')) : {};
  const before = /^[0-9a-f]{40}$/.test(event.before || '') && !/^0+$/.test(event.before) ? event.before : undefined;
  const base = args[1] || event.pull_request?.base?.sha || before || 'HEAD^';
  console.log(JSON.stringify(checkRepository(base), null, 2));
}
