// Usage: node --test tests/builder-history.test.mjs. Tests append-only history,
// required date/time/exact-model metadata, and the repository-change transaction gate.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { validateHistory, checkRepository, journalPath } from '../scripts/check-builder-history.mjs';

const legacy = {
  id: 'first',
  date: '2026-09-17',
  author: 'Builder',
  title: 'Original',
  body: 'Published before the time/model contract.'
};
const next = {
  id: 'second',
  date: '2026-09-23',
  time: '23:38:45-07:00',
  model: 'GPT-5.6 Sol',
  body: 'A complete thought.'
};
const correction = {
  id: 'third',
  date: '2026-09-23',
  time: '23:39-07:00',
  model: 'GPT-5.6 Sol',
  body: 'A correction.',
  correction_of: 'second'
};

test('legacy prefix remains valid and new entries require date, time, exact model, and body', () => {
  assert.deepEqual(validateHistory([legacy], [legacy, next]), { preserved: 1, appended: 1 });
  assert.deepEqual(validateHistory([legacy], [legacy, next, correction]), { preserved: 1, appended: 2 });
  assert.throws(() => validateHistory([legacy], [legacy, { ...next, time: undefined }]));
  assert.throws(() => validateHistory([legacy], [legacy, { ...next, model: '' }]));
  assert.throws(() => validateHistory([legacy], [legacy, { ...next, model: 'OpenAI' }]));
  assert.throws(() => validateHistory([legacy], [legacy, { ...next, time: '23:38' }]));
});

test('edits, deletions, reordering, duplicate IDs, invalid dates, and invented correction targets reject', () => {
  assert.throws(() => validateHistory([legacy], [{ ...legacy, body: 'Rewritten' }]));
  assert.throws(() => validateHistory([legacy], []));
  assert.throws(() => validateHistory([legacy, next], [next, legacy]));
  assert.throws(() => validateHistory([legacy], [legacy, { ...next, id: 'first' }]));
  assert.throws(() => validateHistory([legacy], [legacy, { ...next, date: '2026-02-30' }]));
  assert.throws(() => validateHistory([legacy], [legacy, { ...correction, correction_of: 'missing' }]));
});

test('unavailable model identity requires a reason and cannot stand in for an exact identifier', () => {
  const unavailable = { ...next, model: 'unavailable', model_unavailable_reason: 'The executing runtime does not expose an exact response model identifier.' };
  assert.deepEqual(validateHistory([legacy], [legacy, unavailable]), { preserved: 1, appended: 1 });
  assert.throws(() => validateHistory([legacy], [legacy, { ...next, model: 'unavailable' }]), /model_unavailable_reason/);
  assert.throws(() => validateHistory([legacy], [legacy, { ...unavailable, model_unavailable_reason: ' ' }]), /model_unavailable_reason/);
  assert.throws(() => validateHistory([legacy], [legacy, { ...unavailable, model: next.model }]), /only an unavailable model/);
  assert.throws(() => validateHistory([legacy], [legacy, { ...unavailable, model: undefined }]), /model/);
});

function fixture() {
  const cwd = mkdtempSync(join(tmpdir(), 'builder-history-'));
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: 'pipe' }).trim();
  git('init');
  git('config', 'user.name', 'Test');
  git('config', 'user.email', 'test@example.invalid');
  mkdirSync(join(cwd, 'src/_data'), { recursive: true });
  writeFileSync(join(cwd, journalPath), JSON.stringify([legacy]));
  writeFileSync(join(cwd, 'README.md'), 'Fixture');
  git('add', '.');
  git('commit', '-m', 'published baseline');
  return { cwd, git, file: join(cwd, journalPath) };
}

test('a non-journal website change fails until a builder entry is appended', () => {
  const { cwd, file } = fixture();
  try {
    writeFileSync(join(cwd, 'README.md'), 'Changed');
    assert.throws(() => checkRepository('HEAD', cwd), /website change requires at least one appended By the builder entry/);

    writeFileSync(file, JSON.stringify([legacy, next]));
    const result = checkRepository('HEAD', cwd);
    assert.equal(result.appended, 1);
    assert.equal(result.requiresEntry, true);
    assert.ok(result.websiteChangedPaths.includes('README.md'));
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test('a journal-only append satisfies itself without recursive expansion', () => {
  const { cwd, file } = fixture();
  try {
    writeFileSync(file, JSON.stringify([legacy, next]));
    const result = checkRepository('HEAD', cwd);
    assert.equal(result.appended, 1);
    assert.equal(result.requiresEntry, false);
    assert.deepEqual(result.websiteChangedPaths, []);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test('untracked website files also trigger the entry requirement and missing bases fail closed', () => {
  const { cwd } = fixture();
  try {
    writeFileSync(join(cwd, 'untracked.txt'), 'new');
    assert.throws(() => checkRepository('HEAD', cwd), /website change requires at least one appended By the builder entry/);
    assert.throws(() => checkRepository('unavailable-base', cwd));
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

// Usage: a branch written earlier may merge later; dates describe authorship,
// while immutable array order records publication. Neither fact may be rewritten.
test('retrospective appends preserve original dates and immutable publication order', () => {
  const published = [legacy, { ...next, date: '2026-10-06' }];
  const retrospective = { ...correction, date: '2026-09-25' };
  const current = [...published, retrospective];
  assert.deepEqual(validateHistory(published, current), { preserved: 2, appended: 1 });
  assert.throws(() => validateHistory(published, [legacy, retrospective, published[1]]), /changed or moved/);
  assert.throws(() => validateHistory(published, [legacy, { ...published[1], date: '2026-09-24' }, retrospective]), /changed or moved/);
  assert.throws(() => validateHistory(published, [legacy, retrospective]), /changed or moved/);
});
