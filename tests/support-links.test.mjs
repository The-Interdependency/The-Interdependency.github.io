// Usage: node --test tests/support-links.test.mjs. Validates aggregate totals,
// unknown-versus-zero behavior, credit separation, and the absence of giver identity.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { aggregateSupportSnapshot, createSupportView } from '../scripts/support-snapshot.mjs';

const verifiedSnapshotCommit = '63db9222a5f94587e6a8022157261fc65d7592d0';
const publicPaths = [
  'src/_data/supportSnapshot.json',
  'src/support/index.njk',
  'src/index.njk',
  'src/_includes/components/support-ask.njk'
];
const snapshot = () => JSON.parse(readFileSync('src/_data/supportSnapshot.json', 'utf8'));
const priorAccounts = () => JSON.parse(execFileSync('git', ['show', `${verifiedSnapshotCommit}:src/_data/supportSnapshot.json`], { encoding: 'utf8' }));
const money = minor => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(minor / 100);

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
  assert.ok(readFileSync('src/index.njk', 'utf8').includes('Support me · funding totals'));
});

test('published totals equal the last verified account snapshot and name nobody', () => {
  const prior = priorAccounts();
  const published = snapshot();
  const summed = aggregateSupportSnapshot(prior);
  assert.deepEqual(published.totals, summed.totals);
  assert.equal(published.funding.confirmed_received_minor, prior.funding.confirmed_received_minor);
  assert.equal(published.observed_at, prior.observed_at);
  assert.equal(published.funding.period_start, prior.funding.period_start);
  assert.equal(published.funding.through, prior.funding.through);
  assert.equal(published.schema, 'interdependentway.support-snapshot/2');
  const surface = publicPaths.map(path => readFileSync(path, 'utf8')).join('\n') + JSON.stringify(createSupportView(published));
  for (const account of prior.accounts) {
    assert.equal(surface.includes(account.label), false);
    const formatted = money(account.current_minor);
    if (formatted !== money(published.totals.checking_current_minor) && formatted !== money(published.totals.credit_current_minor)) {
      assert.equal(surface.includes(formatted), false);
    }
  }
  assert.equal(surface.includes('"accounts"'), false);
  assert.equal(surface.includes('transactions'), false);
  assert.equal(surface.includes('donor'), false);
});

test('unknown totals never become zero and credit stays separate from cash', () => {
  const input = snapshot();
  input.totals.checking_current_minor = null;
  input.totals.checking_available_minor = null;
  input.funding.confirmed_received_minor = null;
  const view = createSupportView(input);
  assert.equal(view.checking.current_label, 'Unavailable');
  assert.equal(view.checking.available_label, null);
  assert.match(view.funding.label, /awaiting verification/);
  assert.match(view.credit.current_label, /^\$/);
  assert.match(view.checking.age_label, /age unknown/);
  input.funding.confirmed_received_minor = 0;
  assert.equal(createSupportView(input).funding.label, '$0.00 confirmed in available records');
});

test('a shared source date can age a total and a missing date stays unknown', () => {
  const input = snapshot();
  input.totals.checking_balance_as_of = '2026-11-02';
  const view = createSupportView(input);
  assert.match(view.checking.age_label, /2026-11-02/);
  assert.match(view.credit.age_label, /age unknown/);
});

test('private readings reduce to sums and cannot be rendered directly', () => {
  const prior = priorAccounts();
  prior.accounts[0].donor_name = 'Private Giver';
  prior.accounts[0].account_id = 'acct_private';
  prior.transactions = [{ payer: 'Private Giver', amount_minor: 1 }];
  assert.throws(() => aggregateSupportSnapshot(prior), /public fields|cannot carry/);
  delete prior.accounts[0].donor_name;
  delete prior.accounts[0].account_id;
  delete prior.transactions;
  prior.accounts[0].current_minor = null;
  const reduced = aggregateSupportSnapshot(prior);
  assert.equal(reduced.totals.checking_current_minor, null);
  assert.equal(JSON.stringify(reduced).includes('Private Giver'), false);
  assert.throws(() => createSupportView(prior), /aggregate totals only/);
  const named = snapshot();
  named.accounts = prior.accounts;
  assert.throws(() => createSupportView(named), /public fields|aggregate totals only/);
});

test('a null available balance does not invent a partial available total', () => {
  const prior = priorAccounts();
  const checking = prior.accounts.find(account => account.kind === 'depository');
  checking.available_minor = null;
  const reduced = aggregateSupportSnapshot(prior);
  assert.equal(reduced.totals.checking_available_minor, null);
  assert.equal(reduced.totals.checking_current_minor, prior.accounts.filter(account => account.kind === 'depository').reduce((sum, account) => sum + account.current_minor, 0));
});

test('mixed balance dates stay unknown instead of picking one account', () => {
  const prior = priorAccounts();
  const [first, second] = prior.accounts.filter(account => account.kind === 'depository');
  first.balance_as_of = '2026-11-01';
  second.balance_as_of = '2026-11-02';
  assert.equal(aggregateSupportSnapshot(prior).totals.checking_balance_as_of, null);
});

test('raw identifiers, donor data, and unsupported totals fail publication', () => {
  for (const key of ['account_id', 'mask', 'routing_number', 'access_token', 'transactions', 'donor_name', 'accounts']) {
    const input = snapshot();
    input[key] = key === 'accounts' ? [] : 'PRIVATE';
    assert.throws(() => createSupportView(input), /public fields|cannot carry|aggregate totals only/);
  }
  const extra = snapshot();
  extra.raw_response = {};
  assert.throws(() => createSupportView(extra), /public fields|cannot carry/);
  const labeled = snapshot();
  labeled.totals.label = 'X Money checking';
  assert.throws(() => createSupportView(labeled), /public fields|cannot carry/);
});

test('non-integer money, false complete totals, and future source dates reject', () => {
  const mutations = [
    s => { s.totals.checking_current_minor = 1.5; },
    s => { s.totals.checking_current_minor = '236.94'; },
    s => { s.totals.checking_current_minor = Infinity; },
    s => { s.totals.credit_available_minor = 100; },
    s => { s.funding.coverage = 'complete'; },
    s => { s.funding.confirmed_received_minor = -1; },
    s => { s.totals.checking_balance_as_of = '2099-01-01'; },
    s => { s.funding.period_start = '2026-02-30'; }
  ];
  for (const mutate of mutations) {
    const input = snapshot();
    mutate(input);
    assert.throws(() => createSupportView(input));
  }
});

test('the refresh command prints totals only', () => {
  const directory = mkdtempSync(join(tmpdir(), 'support-totals-'));
  try {
    const input = priorAccounts();
    input.accounts[0].memo = 'Private Giver 1234';
    const file = join(directory, 'private.json');
    writeFileSync(file, JSON.stringify(input));
    const failed = execFileSync('node', ['scripts/support-snapshot.mjs', file], { encoding: 'utf8' });
    assert.fail(`identity input must not print, got ${failed.slice(0, 20)}`);
  } catch (error) {
    assert.equal(error.status, undefined === error.stdout ? 1 : error.status || 1);
    const output = `${error.stdout || ''}${error.stderr || ''}`;
    assert.equal(output.includes('Private Giver'), false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
  const directoryOk = mkdtempSync(join(tmpdir(), 'support-totals-'));
  try {
    const file = join(directoryOk, 'private.json');
    writeFileSync(file, JSON.stringify(priorAccounts()));
    const output = execFileSync('node', ['scripts/support-snapshot.mjs', file], { encoding: 'utf8' });
    const published = JSON.parse(output);
    assert.deepEqual(published, aggregateSupportSnapshot(priorAccounts()));
    assert.equal(output.includes('checking'), true);
    for (const account of priorAccounts().accounts) assert.equal(output.includes(account.label), false);
  } finally {
    rmSync(directoryOk, { recursive: true, force: true });
  }
});
