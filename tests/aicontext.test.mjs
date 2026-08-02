// Usage: run `node --test tests/aicontext.test.mjs`; the fixture proves byte-prefix, distributed-source, biography, and non-transfer contracts without network access.
// Evidence boundary: these checks prove renderer behavior against a sealed fixture, not live deployment freshness or producer authentication.
import { createHash } from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  connectionContract,
  interpretationBoundary,
  publicPersonId,
  renderAiContext
} from '../src/eai/aicontext.11ty.js';

// === CHECKS ===
// id: check_ai_context_exact_contract_prefix
//   proves: ai_context_exact_contract_prefix
//   call: self::checkExactContractPrefix
//   requires: node
//   timeout: 10
//   mutates: none
//   cleanup: none
//
// id: check_ai_context_exact_distributed_sources
//   proves: ai_context_exact_distributed_sources
//   call: self::checkExactDistributedSources
//   requires: node
//   timeout: 10
//   mutates: none
//   cleanup: none
//
// id: check_ai_context_public_biography_boundary
//   proves: ai_context_public_biography_boundary
//   call: self::checkPublicBiographyBoundary
//   requires: node
//   timeout: 10
//   mutates: none
//   cleanup: none
//
// id: check_ai_context_non_transfer_boundary
//   proves: ai_context_non_transfer_boundary
//   call: self::checkNonTransferBoundary
//   requires: node
//   timeout: 10
//   mutates: none
//   cleanup: none
//
// id: check_ai_context_stable_person_identity
//   proves: ai_context_stable_person_identity
//   call: self::checkStablePersonIdentity
//   requires: node
//   timeout: 10
//   mutates: none
//   cleanup: none
//
// id: check_ai_context_grounded_inference_boundary
//   proves: ai_context_grounded_inference_boundary
//   call: self::checkGroundedInferenceBoundary
//   requires: node
//   timeout: 10
//   mutates: none
//   cleanup: none
// === END CHECKS ===

const sha256 = value => createHash('sha256').update(value).digest('hex');
const biography = readFileSync('src/_data/erin.public-biography.json', 'utf8');
const canonText = '# The Interdependent Way\nfixture canon body\n';
const canon = {
  source: {
    repository: 'wayseer00/main',
    path: 'canon/INTERDEPENDENT_WAY.txt',
    branch: 'main',
    commit: 'a'.repeat(40),
    blob: 'b'.repeat(40),
    contentSha256: sha256(canonText),
    fallback: false
  }
};
const licenses = ['MPL-2.0', 'hmmm', 'MPL-2.0', 'MPL-2.0', 'MPL-2.0', 'MPL-2.0', 'AGPL-3.0-only', 'CC-BY-SA-4.0'];
const textbook = {
  schema: 'interdependency.distributed-textbook/1.0.0',
  complete: true,
  fallback: false,
  chapterCount: 8,
  chapters: Array.from({ length: 8 }, (_, number) => {
    const content = `# Chapter ${number === 0 ? 'Zero' : `${number}:`} Fixture ${number}\nunique chapter body ${number}\n`;
    return {
      number,
      display_number: number === 0 ? 'Zero' : String(number),
      slug: `chapter-${number}`,
      title: `Fixture ${number}`,
      repository: number === 3 ? 'The-Interdependency/skill-lib' : `The-Interdependency/source-${number}`,
      path: `chapter-${number}.md`,
      commit: String(number).repeat(40),
      blob: String(9 - number).repeat(40),
      content,
      contentSha256: sha256(content),
      expected_title_match: 'fixture substring',
      license: licenses[number],
      license_status: number === 1 ? 'human-review-required' : 'declared',
      correction_target: `The-Interdependency/source-${number}:chapter-${number}.md`,
      status: `fixture status ${number}`,
      fallback: false
    };
  })
};
const rendered = renderAiContext({ canon, canonText, textbook, biography, consumerCommit: 'c'.repeat(40) });

function extractJson(tag) {
  const pattern = new RegExp(`<${tag}[^>]*>\\n(?:\\|\\n)?\`\`\`json\\n([\\s\\S]*?)\\n\`\`\`\\n(?:\\|\\n)?</${tag}>`);
  const match = pattern.exec(rendered);
  assert.ok(match, `${tag} JSON block missing`);
  return JSON.parse(match[1]);
}

export function checkExactContractPrefix() {
  assert.equal(rendered.slice(0, connectionContract.length), connectionContract);
  assert.equal(rendered.charCodeAt(0), 'E'.charCodeAt(0));
  assert.equal(rendered.startsWith('---'), false);
}

export function checkExactDistributedSources() {
  assert.ok(rendered.includes(`<CANON COPY>\n${canonText}</CANON COPY>`));
  let cursor = rendered.indexOf('<TIW TEXTBOOK>');
  for (const chapter of textbook.chapters) {
    const position = rendered.indexOf(chapter.content, cursor);
    assert.ok(position > cursor, `chapter ${chapter.number} missing or out of order`);
    cursor = position;
  }
  const publication = extractJson('PUBLICATION MANIFEST');
  assert.equal(publication.sources.length, 10);
  assert.equal(publication.sources[0].repository, 'wayseer00/main');
  assert.equal(publication.sources[9].source_id, 'erin-public-biography');
  assert.equal(publication.sources.every(source => source.correction_target), true);
  assert.equal(publication.sources.every(source => source.license && source.license_status), true);
  assert.equal(publication.sources.every(source => /^[a-f0-9]{40}$/.test(source.commit)), true);
  assert.equal(publication.sources.every(source => /^[a-f0-9]{40}$/.test(source.blob)), true);
  assert.match(publication.publication_sha256, /^[a-f0-9]{64}$/);
}

export function checkPublicBiographyBoundary() {
  const publicBiography = extractJson('MACHINE READABLE BIOGRAPHY');
  assert.equal(publicBiography['@id'], publicPersonId);
  assert.equal(publicBiography.name, 'Erin Spencer');
  assert.equal(publicBiography.privacy.scope, 'public project biography');
  assert.ok(publicBiography.privacy.excludedCategories.includes('exact location'));
  assert.match(rendered, /<MACHINE READABLE BIOGRAPHY[^>]*>\n\|\n```json/);
  for (const privateField of ['birthDate', 'streetAddress', 'medicalHistory', 'legalCase', 'bankAccount']) {
    assert.equal(Object.hasOwn(publicBiography, privateField), false);
  }
}

export function checkStablePersonIdentity() {
  const publicBiography = extractJson('MACHINE READABLE BIOGRAPHY');
  const boundary = extractJson('INTERPRETATION BOUNDARY');
  assert.equal(publicBiography['@id'], 'https://interdependentway.org/eai/aicontext.md#erin-spencer');
  assert.equal(boundary.addressing.person_id, publicBiography['@id']);
  assert.equal(boundary.addressing.identifier_is_authentication, false);
  assert.equal(boundary.addressing.identifier_is_authorization, false);
  assert.equal(boundary.addressing.identifier_is_runtime_connection, false);
}

export function checkGroundedInferenceBoundary() {
  const boundary = extractJson('INTERPRETATION BOUNDARY');
  assert.deepEqual(boundary, interpretationBoundary);
  assert.match(boundary.measurement_gate.edcm_rule, /actual cited EDCM result record/);
  assert.match(boundary.measurement_gate.without_record, /^hmmm/);
  assert.ok(boundary.measurement_gate.applies_to.includes('drift or anomalous flux'));
  assert.equal(boundary.capability_gate.public_context_grants_log_access, false);
  assert.equal(boundary.capability_gate.public_context_grants_tool_access, false);
  assert.equal(boundary.capability_gate.public_context_grants_synchronization, false);
  assert.match(boundary.grounding_rules.join(' '), /do not convert metaphor, theory, architecture, or vocabulary into measurement/i);
  assert.match(boundary.grounding_rules.join(' '), /Do not introduce or expand an identifier, acronym, repository, runtime, relationship, or capability/i);
}

export function checkNonTransferBoundary() {
  const workGraph = extractJson('WORK GRAPH');
  const publication = extractJson('PUBLICATION MANIFEST');
  assert.equal(workGraph.boundaries.authority_transfer, false);
  assert.equal(workGraph.boundaries.proof_status_transfer, false);
  assert.equal(publication.boundaries.authorship_transfer, false);
  assert.equal(publication.boundaries.license_transfer, false);
  assert.equal(publication.boundaries.canonical_status_transfer, false);
  assert.equal(publication.boundaries.digest_is_authentication, false);
  assert.match(rendered, /hmmm The endpoint now demonstrates intersession continuity/);
}

test('aicontext begins with the exact author-supplied connection contract', checkExactContractPrefix);
test('aicontext preserves the exact distributed source order and identities', checkExactDistributedSources);
test('aicontext publishes only the bounded machine-readable biography', checkPublicBiographyBoundary);
test('aicontext carries explicit cross-source non-transfer boundaries', checkNonTransferBoundary);
test('aicontext gives Erin one stable non-authorizing JSON-LD identity', checkStablePersonIdentity);
test('aicontext blocks unsupported live-state, measurement, and capability inference', checkGroundedInferenceBoundary);
