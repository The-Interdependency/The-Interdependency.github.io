import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const SITE_SCRIPT = 'src/assets/js/site.js';
const RECONCILIATION_SCRIPT = 'src/assets/js/gonol-reconciliation.js';
const STRICT_SCHEMA = 'src/assets/data/gonol-relationship-receipt-v1.schema.json';

function syntaxCheck(path) {
  const result = spawnSync(process.execPath, ['--check', path], { encoding: 'utf8' });
  assert.equal(result.status, 0, `${path} syntax failure:\n${result.stderr || result.stdout}`);
}

test('site-wide export controls preserve structure and distinct titles', async () => {
  const source = await readFile(SITE_SCRIPT, 'utf8');
  syntaxCheck(SITE_SCRIPT);

  assert.match(source, /\.m-title, \.ref-title/);
  assert.match(source, /function markdownForField\(field\)/);
  assert.match(source, /new URL\(href, document\.baseURI\)\.href/);
  assert.match(source, /function textWithoutRepeatedTitle\(field\)/);
  assert.match(source, /heading\.remove\(\)/);
  assert.match(source, /field\.style\.paddingTop = '4\.75rem'/);
  assert.match(source, /import\('\/assets\/js\/gonol-reconciliation\.js'\)/);
});

test('Gonol reconciliation fails closed and emits strict portable identity', async () => {
  const source = await readFile(RECONCILIATION_SCRIPT, 'utf8');
  syntaxCheck(RECONCILIATION_SCRIPT);

  assert.match(source, /event\.stopImmediatePropagation\(\)/);
  assert.match(source, /performance\.now\(\) \+ 2000/);
  assert.match(source, /html-textarea-value-crlf-and-cr-to-lf/);
  assert.match(source, /contract_blob: publication\.source\.blob/);
  assert.match(source, /derived_layers_visible: Boolean/);
  assert.match(source, /unicode_scalar_value/);
  assert.match(source, /carrier_position_or_null/);
  assert.match(source, /delete identity\.receipt_id/);
  assert.match(source, /website-gonol-relation:sha256:/);
  assert.match(source, /producer_authentication_transfer: false/);
});

test('website carries the exact merged strict UCNS schema bytes', async () => {
  const bytes = await readFile(STRICT_SCHEMA);
  const digest = createHash('sha256').update(bytes).digest('hex');
  const schema = JSON.parse(bytes.toString('utf8'));

  assert.equal(digest, '2b15b1fbc517fdf11e617da8d31ae542cb6f240755ba12390a5bbc7d81034d56');
  assert.ok(schema.required.includes('candidate_identity'));
  assert.ok(schema.required.includes('non_transfer'));
  assert.ok(schema.properties.provenance.required.includes('contract_blob'));
  assert.equal(schema.$defs.operand.properties.native_scale.properties.numeric_rank.const, null);
  assert.deepEqual(schema.$defs.pairAB.allOf[1].properties.pair_id, { const: 'A-B' });
  assert.ok(schema.$defs.displayPolicy.properties.parameters.required.includes('derived_layers_visible'));
});
