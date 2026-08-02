// Usage: run `node --test tests/edcm-mathematics.test.mjs`; these checks bind the publication copy to one exact EDCM commit/blob without claiming the source is true or empirically validated.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import loadEdcmMathematics from '../src/_data/edcm_mathematics.js';

const artifact = loadEdcmMathematics();
const copiedBytes = readFileSync(new URL('../src/_data/edcm_mathematics_reference.md', import.meta.url));

function gitBlobSha1(bytes) {
  const header = Buffer.from(`blob ${bytes.length}\0`, 'utf8');
  return createHash('sha1').update(header).update(bytes).digest('hex');
}

// === CHECKS ===
// id: check_edcm_reference_source_pin_visible
//   proves: edcm_reference_source_pin_visible
//   call: self::checkSourcePinVisible
//   requires: node
//   timeout: 10
//   mutates: none
//   cleanup: none
//
// id: check_edcm_reference_bytes_reproduced
//   proves: edcm_reference_bytes_reproduced
//   call: self::checkReferenceBytesReproduced
//   requires: node
//   timeout: 10
//   mutates: none
//   cleanup: none
//
// id: check_edcm_reference_status_does_not_transfer
//   proves: edcm_reference_status_does_not_transfer
//   call: self::checkStatusDoesNotTransfer
//   requires: node
//   timeout: 10
//   mutates: none
//   cleanup: none
// === END CHECKS ===

export function checkSourcePinVisible() {
  assert.equal(artifact.source.repository, 'The-Interdependency/edcm');
  assert.equal(artifact.source.path, 'docs/EDCM_MATHEMATICS.md');
  assert.equal(artifact.source.commit, '2f09f9af10ef950ce68c765bcbed7dca83625c65');
  assert.equal(artifact.source.blob, 'c2e059de15c4ef2c5fa9368c63363b606e503206');
  assert.equal(artifact.source.sha256, '889336c7c723d6e013188e1b3f969f98aeca88e3075b8ce2e67bc87e897e724f');
  assert.equal(artifact.source.license, 'MPL-2.0');
  assert.equal(artifact.source.url, `https://github.com/${artifact.source.repository}/blob/${artifact.source.commit}/${artifact.source.path}`);
}

export function checkReferenceBytesReproduced() {
  const sha256 = createHash('sha256').update(copiedBytes).digest('hex');
  const blob = gitBlobSha1(copiedBytes);
  assert.equal(sha256, artifact.source.sha256);
  assert.equal(blob, artifact.source.blob);
  assert.equal(artifact.observed.sha256, artifact.source.sha256);
  assert.equal(artifact.observed.blob, artifact.source.blob);
  assert.equal(artifact.observed.utf8_bytes, copiedBytes.length);
  assert.equal(artifact.reference_markdown, copiedBytes.toString('utf8'));

  for (const authoritativeContact of [
    'Status: complete compiled reference',
    '`CANON.md` governs epistemic status',
    '## 3. Maintained baseline vector',
    '## 10. Implemented v0.3.1 architecture layer',
    '## 14. Identity and reproducibility mathematics',
    '## 15. What is not yet mathematics',
    '## hmmm'
  ]) assert.ok(artifact.reference_markdown.includes(authoritativeContact), `missing exact EDCM contact: ${authoritativeContact}`);
}

export function checkStatusDoesNotTransfer() {
  assert.equal(artifact.publication_role, 'commit-pinned reproduction');
  assert.equal(artifact.authority, 'The-Interdependency/edcm source modules and CANON.md');
  for (const [status, transfers] of Object.entries(artifact.status_transfer)) {
    assert.equal(transfers, false, `${status} status must not transfer`);
  }
  assert.match(artifact.reference_markdown, /not a joint UCNS–EDCM canon selection/);
  assert.match(artifact.reference_markdown, /not formal UCNS geometry/);
  assert.match(artifact.reference_markdown, /Those quantities are `NA`, not zero/);
  assert.doesNotMatch(artifact.reference_markdown, /Theta\^\\pm \in/);
}

test('EDCM reference exposes its exact producer pin', checkSourcePinVisible);
test('EDCM reference bytes match the pinned SHA-256 and Git blob', checkReferenceBytesReproduced);
test('EDCM reference publication prevents status transfer', checkStatusDoesNotTransfer);
