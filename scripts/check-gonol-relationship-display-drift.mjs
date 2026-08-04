// === MODULE_BUILD ===
// id: gonol_relationship_display_drift_check
//   module_name: check-gonol-relationship-display-drift
//   module_kind: validator
//   summary: verify the website consumes the exact merged UCNS relationship-display contract and strict receipt schema
//   owner: Erin Spencer
//   public_surface: validateGonolRelationshipPublication
//   internal_surface: readJson, sha256, assert
//   auth_boundary: none
//   storage_boundary: read-only repository files
//   network_boundary: none; validation never follows a moving branch
//   user_data_boundary: none
//   admin_only: false
//   tests: tests/gonol-relationships.test.mjs, tests/post-merge-reconciliation.test.mjs
//   rollout: merged producer consumer with strict portable receipts
//   rollback: remove the artifact page, pinned data, validator, and route tests together
//   since: 2026-08-03
//   unresolved: seven-gonol geometry, continuous frame, English lexical floor, and embedding law
// === END MODULE_BUILD ===

// === CONTRACTS ===
// id: website_gonol_contract_pin_is_exact
//   given: the local UCNS display contract and strict receipt schema are validated
//   then: repository, commits, paths, blobs, SHA-256 values, primitive range, Public Gonol fixture, and unresolved standings match the declared publication pin
//   class: evidence
//   since: 2026-08-03
//
// id: website_gonol_consumer_does_not_select_geometry
//   given: primitive seven or a missing comparison policy is inspected
//   then: unresolved geometry and represented-only comparison remain explicit without a consumer default
//   class: safety
//   since: 2026-08-03
//
// id: website_gonol_portable_receipt_is_strict
//   given: a relationship receipt leaves the browser page
//   then: producer blob, candidate identity, pair order, display policy, losses, hmmm, and every non-transfer boundary remain schema-required
//   class: evidence
//   since: 2026-08-03
// === END CONTRACTS ===

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const CONTRACT_PATH = 'src/_data/gonol_relationship_display.json';
const PUBLICATION_PATH = 'src/_data/gonol_relationship_publication.json';
const RECEIPT_SCHEMA_PATH = 'src/assets/data/gonol-relationship-receipt-v1.schema.json';

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function assert(condition, message) {
  if (!condition) throw new Error(`gonol relationship publication drift: ${message}`);
}

export function validateGonolRelationshipPublication() {
  const contractBytes = readFileSync(CONTRACT_PATH);
  const schemaBytes = readFileSync(RECEIPT_SCHEMA_PATH);
  const contract = JSON.parse(contractBytes.toString('utf8'));
  const publication = readJson(PUBLICATION_PATH);
  const receiptSchema = JSON.parse(schemaBytes.toString('utf8'));

  assert(publication.source.repository === 'The-Interdependency/ucns', 'source repository changed');
  assert(publication.source.commit === '9025957b4063c4748429cb56b52d3c9a56157c42', 'source commit changed');
  assert(publication.source.merged_by === '67964aac4cd34a0f6c3f83fd0da2dabef65b6c9d', 'producer merge identity changed');
  assert(publication.source.path === 'docs/gonol-relationship-display-v1.json', 'source path changed');
  assert(publication.source.blob === 'fdb94ff829a42c267de5f00f2a752550352a444d', 'source blob changed');
  assert(sha256(contractBytes) === publication.source.sha256, 'contract byte digest changed');
  assert(publication.source.sha256 === 'd1ac67d4a5d5b4cd0622056af94b24a1404f1f5c7d7dfeb59ee28e5edb73aad5', 'declared contract digest changed');

  assert(contract.schema_id === 'ucns.gonol-relationship-display', 'contract schema id changed');
  assert(contract.schema_version === '0.1.0', 'contract schema version changed');
  assert(contract.selection_effect === 'none', 'consumer cannot select the contract');
  assert(JSON.stringify(contract.primitive_arities) === '[1,2,3,7]', 'primitive range changed');

  const primitives = new Map(contract.primitives.map(primitive => [primitive.arity, primitive]));
  assert(primitives.get(1)?.projection_id === 'figure-eight-centerline', 'single projection changed');
  assert(primitives.get(2)?.visible_boundary_intersections === 2, 'vesica intersection count changed');
  assert(primitives.get(2)?.scope_circle?.radius === 1.5, 'vesica scope radius changed');
  assert(primitives.get(2)?.relationship_circle?.radius === 0.5, 'vesica relationship radius changed');
  assert(JSON.stringify(primitives.get(3)?.pairwise_vesicas) === '[["A","B"],["B","C"],["C","A"]]', 'triquetra pair order changed');
  assert(primitives.get(3)?.each_vesica_retained === true, 'triquetra must retain each vesica');
  assert(primitives.get(7)?.geometry_standing === 'hmmm-unresolved', 'seven geometry must remain unresolved');
  assert(primitives.get(7)?.pairing_plan_required === true, 'seven requires an explicit pairing plan');

  const tokens = contract.public_gonol.tokens;
  assert(tokens.length === 157, 'Public Gonol arity changed');
  assert(new Set(tokens).size === 157, 'Public Gonol tokens are not unique');
  assert(tokens[0] === ' ', 'Public Gonol origin changed');
  assert(tokens.indexOf('0') === 139, 'digit zero position changed');
  assert(sha256(Buffer.from(JSON.stringify(tokens))) === contract.public_gonol.sha256, 'Public Gonol source-compatible digest changed');
  assert(contract.public_gonol.space_manifestation_code_points.length === 25, 'SPACE manifestation pin changed');
  assert(new Set(contract.public_gonol.space_manifestation_code_points).size === 25, 'SPACE manifestation pin is not unique');
  assert(contract.public_gonol.space_manifestation_code_points.includes('U+0020'), 'U+0020 origin manifestation missing');

  assert(publication.receipt_schema.source_commit === 'cfad06cf41bd1cc82861f08f6076f0d398a0089b', 'strict schema source commit changed');
  assert(publication.receipt_schema.merged_by === '67964aac4cd34a0f6c3f83fd0da2dabef65b6c9d', 'strict schema merge identity changed');
  assert(publication.receipt_schema.blob === '569ff5ce8a891a879314f2845905b7c9b8bc085c', 'strict schema blob changed');
  assert(publication.receipt_schema.sha256 === '2b15b1fbc517fdf11e617da8d31ae542cb6f240755ba12390a5bbc7d81034d56', 'strict schema declared digest changed');
  assert(sha256(schemaBytes) === publication.receipt_schema.sha256, 'receipt schema byte digest changed');
  assert(receiptSchema.properties?.schema_id?.const === 'ucns.gonol-relationship-receipt', 'receipt schema identity changed');
  assert(receiptSchema.properties?.schema_version?.const === '0.1.0', 'receipt schema version changed');

  const required = new Set(receiptSchema.required || []);
  for (const field of ['candidate_identity', 'non_transfer', 'joint_context', 'provenance', 'information_loss', 'hmmm']) {
    assert(required.has(field), `strict receipt no longer requires ${field}`);
  }
  const provenanceRequired = new Set(receiptSchema.properties?.provenance?.required || []);
  assert(provenanceRequired.has('contract_blob'), 'portable provenance no longer requires producer blob');
  assert(receiptSchema.$defs?.operand?.properties?.native_scale?.properties?.numeric_rank?.const === null, 'numeric scale rank became available without a scale law');
  assert(receiptSchema.$defs?.displayPolicy?.properties?.parameters?.required?.includes('derived_layers_visible'), 'derived-layer visibility is not receipt-bearing');
  assert(receiptSchema.$defs?.pairAB && receiptSchema.$defs?.pairBC && receiptSchema.$defs?.pairCA, 'declared pair identities are not fixed');

  const nonTransferRequired = new Set(receiptSchema.$defs?.nonTransfer?.required || []);
  for (const field of [
    'authority_transfer', 'semantic_authority_transfer', 'proof_status_transfer',
    'certification_status_transfer', 'measurement_status_transfer', 'empirical_status_transfer',
    'completion_status_transfer', 'embedding_status_transfer', 'producer_authentication_transfer'
  ]) {
    assert(nonTransferRequired.has(field), `non-transfer boundary missing: ${field}`);
    assert(receiptSchema.$defs.nonTransfer.properties[field].const === false, `non-transfer boundary is not false: ${field}`);
    assert(publication[field] === false || (field === 'producer_authentication_transfer' && publication.producer_authenticated === false), `publication boundary changed: ${field}`);
  }

  assert(publication.publication_status === 'merged-producer-reconciled-consumer', 'publication status is not reconciled');
  assert(publication.producer_authenticated === false, 'content identity cannot claim producer authentication');

  return {
    contractSha256: publication.source.sha256,
    receiptSchemaSha256: publication.receipt_schema.sha256,
    primitiveArities: contract.primitive_arities,
    publicGonolArity: tokens.length
  };
}

const result = validateGonolRelationshipPublication();
if (process.argv[1]?.endsWith('check-gonol-relationship-display-drift.mjs')) {
  console.log(`gonol relationship publication: contract ${result.contractSha256}; strict schema ${result.receiptSchemaSha256}; primitives ${result.primitiveArities.join('/')}; Public Gonol ${result.publicGonolArity}`);
}
