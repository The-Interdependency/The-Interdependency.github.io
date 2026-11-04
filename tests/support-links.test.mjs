// Usage: node --test tests/support-links.test.mjs. Validates public data boundaries,
// unknown-versus-zero behavior, credit separation, and static support destinations.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createSupportView } from '../scripts/support-snapshot.mjs';

const snapshot = () => JSON.parse(readFileSync('src/_data/supportSnapshot.json', 'utf8'));

test('the support ask is shared by the homepage and dedicated support page', () => {
  for (const path of ['src/index.njk', 'src/support/index.njk']) {
    const source = readFileSync(path, 'utf8');
    assert.ok(source.includes('include "components/support-ask.njk"'));
    assert.ok(source.includes('href="https://cash.app/$wayseer00"'));
    assert.ok(source.includes('href="https://x.com/wayseer00"'));
  }
  assert.ok(readFileSync('src/_includes/components/site-footer.njk', 'utf8').includes('href="/support/">Support me</a>'));
  const ask = readFileSync('src/_includes/components/support-ask.njk', 'utf8');
  assert.ok(ask.includes("I'm asking for money to keep this research running. Not for a promise about what it will become."));
  assert.ok(ask.includes('Boardy (exact runtime model unavailable to this session) generated from context and prompt by Erin Spencer.'));
  assert.doesNotMatch(ask, /<form|<script|subscription|tax.deduct/i);
});

test('unknown balances and funding never turn into zero; credit stays separate', () => {
  const input = snapshot();
  input.accounts[0].current_minor = null;
  input.accounts[0].available_minor = null;
  input.funding.confirmed_received_minor = null;
  const view = createSupportView(input);
  assert.equal(view.accounts[0].current_label, 'Unavailable');
  assert.equal(view.accounts[0].available_label, null);
  assert.match(view.funding.label, /awaiting verification/);
  assert.match(view.accounts.find(a => a.kind === 'credit').kind_label, /card balance/);
  assert.match(view.accounts[0].age_label, /age unknown/);
  input.funding.confirmed_received_minor = 0;
  assert.equal(createSupportView(input).funding.label, '$0.00 confirmed in available records');
});

test('only source balance dates can establish age and null dates remain explicit', () => {
  const input = snapshot();
  input.accounts[0].balance_as_of = '2026-11-02';
  const view = createSupportView(input);
  assert.match(view.accounts[0].age_label, /2026-11-02/);
  assert.match(view.accounts[1].age_label, /age unknown/);
});

test('raw identifiers, donor data, credentials and unsupported accounts fail publication', () => {
  for (const key of ['account_id', 'mask', 'routing_number', 'access_token', 'transactions', 'donor_name']) {
    const input = snapshot();
    input.accounts[0][key] = 'PRIVATE';
    assert.throws(() => createSupportView(input), /public fields/);
  }
  const input = snapshot();
  input.accounts[0].label = 'Unapproved account';
  assert.throws(() => createSupportView(input), /approved public scope/);
  const extra = snapshot();
  extra.raw_response = {};
  assert.throws(() => createSupportView(extra), /public fields/);
});

test('non-integer money, false complete totals, duplicate accounts and future source dates reject', () => {
  const mutations = [
    s => { s.accounts[0].current_minor = 1.5; },
    s => { s.accounts[0].current_minor = '81.94'; },
    s => { s.accounts[0].current_minor = Infinity; },
    s => { s.accounts.find(a => a.kind === 'credit').available_minor = 100; },
    s => { s.funding.coverage = 'complete'; },
    s => { s.funding.confirmed_received_minor = -1; },
    s => { s.accounts[1] = { ...s.accounts[0] }; },
    s => { s.accounts[0].balance_as_of = '2099-01-01'; },
    s => { s.funding.period_start = '2026-02-30'; }
  ];
  for (const mutate of mutations) {
    const input = snapshot();
    mutate(input);
    assert.throws(() => createSupportView(input));
  }
});
