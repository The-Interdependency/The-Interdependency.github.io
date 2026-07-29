// Usage: run through `npm test`; exercises the works-registry parser, validator, and builder offline.
// Evidence boundary: validates submission structure and moderation gating, not the merit of any work.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseIssueForm, validateSubmission, buildRegistry, deriveDisplay, WORK_TYPES } from '../scripts/fetch-works.mjs';

const validBody = [
  '### Work title\n\nOn Interdependent Systems\n',
  '### Creator\n\nA. Reader\n',
  '### Link\n\nhttps://example.org/essay\n',
  '### Work type\n\nessay\n',
  '### Relation to The Interdependent Way\n\nEngages Article Two and Chapter 2.\n',
  '### Description\n\nA response essay.\n',
  '### License note\n\n_No response_\n',
  '### Rights and permission\n\n- [x] I have the right to share this link.\n'
].join('\n');

function issue(number, body, labels = ['related-work', 'approved'], extra = {}) {
  return {
    number,
    body,
    labels: labels.map(name => ({ name })),
    html_url: `https://github.com/The-Interdependency/The-Interdependency.github.io/issues/${number}`,
    user: { login: 'someone' },
    created_at: '2026-07-29T00:00:00Z',
    ...extra
  };
}

test('issue-form bodies parse into labeled fields with _No response_ blanked', () => {
  const fields = parseIssueForm(validBody);
  assert.equal(fields['Work title'], 'On Interdependent Systems');
  assert.equal(fields['Link'], 'https://example.org/essay');
  assert.equal(fields['License note'], '');
});

test('valid submissions pass and normalize; invalid ones report every problem', () => {
  const ok = validateSubmission(parseIssueForm(validBody));
  assert.equal(ok.problems.length, 0);
  assert.equal(ok.work.type, 'essay');
  assert.equal(ok.work.license, null);

  const bad = validateSubmission(parseIssueForm(
    '### Work title\n\nX\n\n### Creator\n\n_No response_\n\n### Link\n\nhttp://insecure.example\n\n### Work type\n\nsculpture\n\n### Relation to The Interdependent Way\n\nY\n\n### Description\n\nZ\n'
  ));
  assert.ok(bad.problems.some(p => p.includes('Creator')));
  assert.ok(bad.problems.some(p => p.includes('https')));
  assert.ok(bad.problems.some(p => p.includes('one of')));
});

test('registry lists only doubly-labeled issues, excludes invalid ones visibly, skips PRs', () => {
  const { works, excluded } = buildRegistry([
    issue(5, validBody),
    issue(4, validBody, ['related-work']),
    issue(3, 'not a form body'),
    issue(2, validBody, ['related-work', 'approved'], { pull_request: {} })
  ]);
  assert.equal(works.length, 1);
  assert.equal(works[0].issueNumber, 5);
  assert.equal(works[0].submittedBy, 'someone');
  assert.equal(excluded.length, 1);
  assert.equal(excluded[0].issueNumber, 3);
  assert.ok(excluded[0].problems.length > 0);
});

test('display sources derive to pointer kinds and never to copies', () => {
  assert.deepEqual(deriveDisplay('https://example.org/piece.PNG'.toLowerCase()), { kind: 'image', url: 'https://example.org/piece.png' });
  assert.equal(deriveDisplay('https://example.org/track.mp3').kind, 'audio');
  assert.equal(deriveDisplay('https://example.org/paper.pdf').kind, 'pdf');
  assert.equal(deriveDisplay('https://www.youtube-nocookie.com/embed/abc123').kind, 'iframe');
  assert.equal(deriveDisplay('https://random.example/embed/thing'), null);

  const withDisplay = validateSubmission(parseIssueForm(validBody + '\n### Display source\n\nhttps://example.org/piece.png\n'));
  assert.equal(withDisplay.problems.length, 0);
  assert.deepEqual(withDisplay.work.display, { kind: 'image', url: 'https://example.org/piece.png' });
  assert.ok(!('displayUrl' in withDisplay.work));

  const badDisplay = validateSubmission(parseIssueForm(validBody + '\n### Display source\n\nhttps://random.example/embed/thing\n'));
  assert.ok(badDisplay.problems.some(p => p.includes('display source')));

  const noDisplay = validateSubmission(parseIssueForm(validBody));
  assert.equal(noDisplay.work.display, null);
});

test('generated works dataset exists with valid schema after offline preparation', async () => {
  const dataset = JSON.parse(await readFile('src/_data/generated/works.json', 'utf8'));
  assert.equal(dataset.schema, 'interdependency.related-works/1.0.0');
  assert.ok(Array.isArray(dataset.works) && Array.isArray(dataset.excluded));
  for (const work of dataset.works) {
    assert.ok(work.title && work.creator && work.url.startsWith('https://'));
    assert.ok(WORK_TYPES.includes(work.type));
    assert.ok(work.issueNumber && work.issueUrl);
  }
});
