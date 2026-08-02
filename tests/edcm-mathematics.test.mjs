// Usage: run `node --test tests/edcm-mathematics.test.mjs`; these checks preserve source identity, epistemic boundaries, and mathematical contact without claiming the equations are true or empirically validated.
import { createHash } from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import loadEdcmMathematics from '../src/_data/edcm_mathematics.js';

const artifact = loadEdcmMathematics();

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

// === CHECKS ===
// id: check_edcm_artifact_source_identity_visible
//   proves: edcm_artifact_source_identity_visible
//   call: self::checkSourceIdentityVisible
//   requires: node
//   timeout: 10
//   mutates: none
//   cleanup: none
//
// id: check_edcm_artifact_status_does_not_transfer
//   proves: edcm_artifact_status_does_not_transfer
//   call: self::checkStatusDoesNotTransfer
//   requires: node
//   timeout: 10
//   mutates: none
//   cleanup: none
//
// id: check_edcm_artifact_math_contact_preserved
//   proves: edcm_artifact_math_contact_preserved
//   call: self::checkMathContactPreserved
//   requires: node
//   timeout: 10
//   mutates: none
//   cleanup: none
// === END CHECKS ===

export function checkSourceIdentityVisible() {
  assert.equal(artifact.source.conversation_title, 'EDCM UCNS SITREP');
  assert.equal(artifact.source.immutable_transcript_export, 'hmmm');
  assert.equal(artifact.source.public_corroborating_source.repository, 'The-Interdependency/edcm');
  assert.equal(artifact.source.public_corroborating_source.path, 'docs/codex_edcmucns_v031_handoff.md');
  assert.equal(artifact.source.public_corroborating_source.commit, 'ee20db72dde75f602ccf590a64047117f6bca87d');
  assert.equal(artifact.source.public_corroborating_source.blob, '457758fecb257532757657db4f119a52f850f318');
  assert.equal(artifact.source.public_corroborating_source.license, 'MPL-2.0');

  const { work_graph_sha256: digest, schema, version, ...identity } = artifact.work_graph;
  assert.equal(schema, 'the-interdependency.stack-manifest');
  assert.equal(version, '1.0.0');
  assert.equal(createHash('sha256').update(canonicalJson(identity)).digest('hex'), digest);
}

export function checkStatusDoesNotTransfer() {
  assert.equal(artifact.classification.current_ucns_canon, false);
  assert.equal(artifact.classification.theorem_or_proof, false);
  assert.equal(artifact.classification.edcm_result, false);
  assert.equal(artifact.classification.runtime_status, false);
  assert.equal(artifact.work_graph.boundaries.authority_transfer, false);
  assert.equal(artifact.work_graph.boundaries.proof_status_transfer, false);
  assert.equal(artifact.work_graph.boundaries.measurement_status_transfer, false);
  assert.match(artifact.record_markdown, /No EDCM measurement claim inherits proof status/);
  assert.match(artifact.record_markdown, /No placeholder number, heuristic, language-model judgment/);
}

export function checkMathContactPreserved() {
  for (const contact of [
    'G =',
    '4\\pi\\mathbb{Z}',
    '\\boxtimes',
    '\\operatorname{SeqAppend}',
    'r_f(m)=1+',
    'M_{\\mathrm{EDCM}}',
    'ucns_carrier_equivalent',
    'edcm_measurement_equivalent',
    'L_{\\mathrm{geo}}',
    '\\lambda_{\\mathrm{field}}',
    '\\mathrm{NA} \\ne 0',
    'seal current chain segment'
  ]) assert.ok(artifact.record_markdown.includes(contact), `missing mathematical contact: ${contact}`);
}

test('EDCM artifact preserves exact source identity', checkSourceIdentityVisible);
test('EDCM artifact prevents status transfer', checkStatusDoesNotTransfer);
test('EDCM artifact preserves mathematical contact', checkMathContactPreserved);
