// === CHECKS ===
// id: check_website_gonol_contract_pin
//   proves: website_gonol_contract_pin_is_exact
//   call: self::pinned contract validation tests
//   mutates: none
//   cleanup: none
//
// id: check_website_gonol_contract_public_copy
//   proves: website_gonol_contract_has_one_exact_public_copy
//   call: self::Eleventy passthrough source test
//   mutates: none
//   cleanup: none
//
// id: check_public_gonol_occurrence_exactness
//   proves: public_gonol_occurrences_remain_exact
//   call: self::Public Gonol fixture and source-boundary tests
//   mutates: none
//   cleanup: none
//
// id: check_gonol_primitive_option_range
//   proves: gonol_relationship_primitives_preserve_options
//   call: self::primitive geometry and hmmm tests
//   mutates: none
//   cleanup: none
//
// id: check_gonol_comparison_policy_boundary
//   proves: gonol_comparison_requires_explicit_policy
//   call: self::interaction source policy tests
//   mutates: none
//   cleanup: none
//
// id: check_gonol_receipt_provenance_boundary
//   proves: gonol_receipt_retains_producer_boundary, website_gonol_portable_receipt_is_strict
//   call: self::page, reconciliation, schema, and validator provenance tests
//   mutates: none
//   cleanup: none
//
// id: check_website_gonol_no_selection
//   proves: website_gonol_consumer_does_not_select_geometry
//   call: self::seven-form and represented-only tests
//   mutates: none
//   cleanup: none
// === END CHECKS ===

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { validateGonolRelationshipPublication } from '../scripts/check-gonol-relationship-display-drift.mjs';

test('commit-pinned producer contract and strict receipt schema remain exact', () => {
  const result = validateGonolRelationshipPublication();
  assert.equal(result.contractSha256, 'd1ac67d4a5d5b4cd0622056af94b24a1404f1f5c7d7dfeb59ee28e5edb73aad5');
  assert.equal(result.receiptSchemaSha256, '2b15b1fbc517fdf11e617da8d31ae542cb6f240755ba12390a5bbc7d81034d56');
  assert.deepEqual(result.primitiveArities, [1, 2, 3, 7]);
  assert.equal(result.publicGonolArity, 157);
});

test('Public Gonol fixture preserves exact source and non-vertex SPACE boundary', async () => {
  const contract = JSON.parse(await readFile('src/_data/gonol_relationship_display.json', 'utf8'));
  const fixture = contract.public_gonol;
  assert.equal(fixture.tokens.length, 157);
  assert.equal(new Set(fixture.tokens).size, 157);
  assert.equal(fixture.tokens[0], ' ');
  assert.equal(fixture.tokens.indexOf('0'), 139);
  assert.equal(fixture.normalization, 'none-preserve-source');
  assert.equal(fixture.space_manifestation_code_points.length, 25);
  assert.match(fixture.space_semantics, /not a word-gonol vertex/);
  assert.equal(fixture.vector_standing, 'identity-and-address-evidence-not-geometric-embedding');
});

test('vesica and triquetra geometry retain every declared relationship piece', async () => {
  const contract = JSON.parse(await readFile('src/_data/gonol_relationship_display.json', 'utf8'));
  const primitives = new Map(contract.primitives.map(primitive => [primitive.arity, primitive]));
  assert.equal(primitives.get(1).projection_id, 'figure-eight-centerline');
  assert.equal(primitives.get(2).visible_boundary_intersections, 2);
  assert.equal(primitives.get(2).scope_circle.radius, 1.5);
  assert.equal(primitives.get(2).relationship_circle.radius, 0.5);
  assert.deepEqual(primitives.get(3).pairwise_vesicas, [['A', 'B'], ['B', 'C'], ['C', 'A']]);
  assert.equal(primitives.get(3).each_vesica_retained, true);
  assert.equal(primitives.get(7).geometry_standing, 'hmmm-unresolved');
  assert.equal(primitives.get(7).pairing_plan_required, true);
});

test('artifact is static-first and reconciliation makes portable receipts strict', async () => {
  const [page, producerScript, reconciliation, config, packageJson, index, schema, publication] = await Promise.all([
    readFile('src/artifacts/gonol-relationships.njk', 'utf8'),
    readFile('src/assets/js/gonol-relationships.js', 'utf8'),
    readFile('src/assets/js/gonol-reconciliation.js', 'utf8'),
    readFile('.eleventy.js', 'utf8'),
    readFile('package.json', 'utf8'),
    readFile('src/artifacts/index.njk', 'utf8'),
    readFile('src/assets/data/gonol-relationship-receipt-v1.schema.json', 'utf8'),
    readFile('src/_data/gonol_relationship_publication.json', 'utf8')
  ]);

  assert.match(page, /permalink: \/artifacts\/gonol-relationships\//);
  assert.match(page, /Represent relationship only — no comparison/);
  assert.match(page, /data-receipt-output/);
  assert.match(page, /source-block gonol-output/);
  assert.match(page, /data-public-gonol-grid[^>]*tabindex="0"/);
  assert.match(page, /data-pair-receipt[^>]*tabindex="0"/);
  assert.match(page, /Seven identities may be retained; no geometry or pairing count is inferred/);
  assert.match(index, /href="\/artifacts\/gonol-relationships\/"/);

  assert.doesNotMatch(producerScript, /\bfetch\s*\(/);
  assert.doesNotMatch(producerScript, /\.normalize\s*\(/);
  assert.match(producerScript, /\['A', 'B'\], \['B', 'C'\], \['C', 'A'\]/);

  assert.match(reconciliation, /stopImmediatePropagation\(\)/);
  assert.match(reconciliation, /html-textarea-value-crlf-and-cr-to-lf/);
  assert.match(reconciliation, /contract_blob: publication\.source\.blob/);
  assert.match(reconciliation, /derived_layers_visible/);
  assert.match(reconciliation, /unicode_scalar_value/);
  assert.match(reconciliation, /carrier_position_or_null/);
  assert.match(reconciliation, /website-gonol-relation:sha256:/);
  assert.match(reconciliation, /semantic_authority_transfer: false/);
  assert.match(reconciliation, /producer_authentication_transfer: false/);

  const parsedSchema = JSON.parse(schema);
  assert.ok(parsedSchema.required.includes('candidate_identity'));
  assert.ok(parsedSchema.required.includes('non_transfer'));
  assert.ok(parsedSchema.properties.provenance.required.includes('contract_blob'));
  assert.equal(parsedSchema.$defs.operand.properties.native_scale.properties.numeric_rank.const, null);
  assert.ok(parsedSchema.$defs.displayPolicy.properties.parameters.required.includes('derived_layers_visible'));

  const parsedPublication = JSON.parse(publication);
  assert.equal(parsedPublication.publication_status, 'merged-producer-reconciled-consumer');
  assert.equal(parsedPublication.receipt_schema.blob, '569ff5ce8a891a879314f2845905b7c9b8bc085c');

  assert.match(config, /gonol_relationship_display\.json.*gonol-relationship-display-v1\.json/);
  assert.match(packageJson, /check:gonol-relationships/);
});
