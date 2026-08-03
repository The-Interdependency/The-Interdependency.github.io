// === MODULE_BUILD ===
// id: gonol_relationship_display_drift_check
//   module_name: check-gonol-relationship-display-drift
//   module_kind: validator
//   summary: verify the website consumes one exact commit-pinned UCNS relationship-display contract and receipt schema
//   owner: Erin Spencer
//   public_surface: validateGonolRelationshipPublication
//   internal_surface: readJson, sha256, assert
//   auth_boundary: none
//   storage_boundary: read-only repository files
//   network_boundary: none; validation never follows a moving branch
//   user_data_boundary: none
//   admin_only: false
//   tests: tests/gonol-relationships.test.mjs
//   rollout: dependent publication consumer of the draft UCNS relationship-display contract
//   rollback: remove the artifact page, pinned data, validator, and route tests together
//   since: 2026-08-03
//   unresolved: producer merge order, seven-gonol geometry, continuous frame, English lexical floor, and embedding law
// === END MODULE_BUILD ===

// === CONTRACTS ===
// id: website_gonol_contract_pin_is_exact
//   given: the local UCNS display contract and receipt schema are validated
//   then: repository, commit, path, blob, SHA-256, primitive range, Public Gonol fixture, and unresolved standings match the declared publication pin
//   class: evidence
//   since: 2026-08-03
//
// id: website_gonol_consumer_does_not_select_geometry
//   given: primitive seven or a missing comparison policy is inspected
//   then: unresolved geometry and represented-only comparison remain explicit without a consumer default
//   class: safety
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

  assert(sha256(schemaBytes) === publication.receipt_schema.sha256, 'receipt schema byte digest changed');
  assert(receiptSchema.properties?.schema_id?.const === 'ucns.gonol-relationship-receipt', 'receipt schema identity changed');
  assert(receiptSchema.properties?.schema_version?.const === '0.1.0', 'receipt schema version changed');
  assert(publication.authority_transfer === false, 'publication cannot receive authority');
  assert(publication.measurement_status_transfer === false, 'publication cannot receive measurement status');
  assert(publication.empirical_status_transfer === false, 'publication cannot receive empirical status');
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
  console.log(`gonol relationship publication: pinned ${result.contractSha256}; primitives ${result.primitiveArities.join('/')}; Public Gonol ${result.publicGonolArity}`);
}
