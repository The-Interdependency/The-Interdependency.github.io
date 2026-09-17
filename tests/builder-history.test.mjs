// Usage: node --test tests/builder-history.test.mjs. Tests corruption and the actual Git comparison, including a missing base.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { validateHistory, checkRepository, journalPath } from '../scripts/check-builder-history.mjs';
const first = { id: 'first', date: '2026-09-17', author: 'Builder', title: 'Original', body: 'Original observation.' };
const next = { ...first, id: 'second', title: 'Correction', correction_of: 'first' };

test('new entries and attributed corrections append without changing history', () => {
  assert.deepEqual(validateHistory([first], [first, next]), { preserved: 1, appended: 1 });
});
test('edits, deletions and reordering reject', () => {
  assert.throws(() => validateHistory([first], [{ ...first, body: 'Rewritten' }]));
  assert.throws(() => validateHistory([first], []));
  assert.throws(() => validateHistory([first, next], [next, first]));
});
test('duplicate IDs, invalid dates and invented correction targets reject', () => {
  assert.throws(() => validateHistory([], [first, first]));
  assert.throws(() => validateHistory([], [{ ...first, date: '2026-02-30' }]));
  assert.throws(() => validateHistory([], [{ ...first, correction_of: 'missing' }]));
});
test('Git baseline preserves the first published entry and fails on missing history', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'builder-history-'));
  const git = (...args) => execFileSync('git', args, { cwd, stdio: 'pipe' });
  try {
    git('init'); git('config', 'user.name', 'Test'); git('config', 'user.email', 'test@example.invalid');
    writeFileSync(join(cwd, 'README.md'), 'Fixture'); git('add', '.'); git('commit', '-m', 'before journal');
    mkdirSync(join(cwd, 'src/_data'), { recursive: true });
    const file = join(cwd, journalPath);
    writeFileSync(file, JSON.stringify([first]));
    assert.equal(checkRepository('HEAD', cwd).appended, 1);
    git('add', '.'); git('commit', '-m', 'publish first entry');
    writeFileSync(file, JSON.stringify([first, next]));
    assert.equal(checkRepository('HEAD', cwd).preserved, 1);
    writeFileSync(file, JSON.stringify([{ ...first, body: 'Changed' }, next]));
    assert.throws(() => checkRepository('HEAD', cwd));
    assert.throws(() => checkRepository('unavailable-base', cwd));
  } finally { rmSync(cwd, { recursive: true, force: true }); }
});
