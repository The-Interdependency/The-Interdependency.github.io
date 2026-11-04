// === MODULE_BUILD ===
// id: public_support_snapshot
//   module_name: public-support-snapshot
//   module_kind: adapter
//   summary: Validate the owner-authorized, minimal financial snapshot and render honest funding and balance labels.
//   owner: Erin Spencer
//   public_surface: /support/; createSupportView(snapshot)
//   internal_surface: src/_data/supportSnapshot.json
//   auth_boundary: none
//   storage_boundary: read
//   network_boundary: none
//   user_data_boundary: read
//   admin_only: false
//   tests: tests/support-links.test.mjs, tests/support-links.spec.mjs
//   rollout: Eleventy builds the snapshot into static HTML after validation
//   rollback: remove the balance sections and this adapter; keep the support ask
// === END MODULE_BUILD ===
// === BOUNDARIES ===
// id: public_support_data_boundary
//   summary: Publishes only authorized account aliases, monetary snapshots, source dates, and aggregate confirmed support; rejects extra fields.
//   auth_boundary: none
//   storage_boundary: read
//   network_boundary: none
//   user_data_boundary: read
//   admin_only: false
//   pii: sensitive
//   secrets: none
//   side_effects: public financial snapshot
//   owner: Erin Spencer
// === END BOUNDARIES ===
// Usage: the authorized updater changes supportSnapshot.json, then runs npm run
// check. Pass only the public schema below; never save raw connector responses,
// account/transaction IDs, account numbers, donor identities, or credentials.
// See docs/support-funding.md for classification, publication, and failure rules.
import assert from 'node:assert/strict';

const approvedAccounts = new Map([
  ['X Money checking', 'depository'],
  ['Chase checking', 'depository'],
  ['Capital One credit card', 'credit']
]);
const money = minor => minor === null ? 'Unavailable' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(minor / 100);

function keys(value, expected) {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), 'expected a public snapshot object');
  assert.deepEqual(Object.keys(value).sort(), [...expected].sort(), 'unexpected or missing public fields');
}

function day(value) {
  assert.match(value, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(new Date(value + 'T00:00:00Z').toISOString().slice(0, 10), value, 'invalid source date');
}

function amount(value) {
  assert.ok(value === null || Number.isSafeInteger(value), 'money must be integer cents or null');
}

export function createSupportView(snapshot) {
  keys(snapshot, ['schema', 'source', 'observed_at', 'currency', 'updates', 'accounts', 'funding']);
  assert.equal(snapshot.schema, 'interdependentway.support-snapshot/1');
  assert.equal(snapshot.source, 'ChatGPT Finances');
  assert.equal(snapshot.currency, 'USD');
  assert.match(snapshot.observed_at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/);
  assert.ok(Number.isFinite(Date.parse(snapshot.observed_at)), 'invalid observation timestamp');
  assert.ok(['manual', 'daily'].includes(snapshot.updates), 'unsupported update cadence');
  assert.ok(Array.isArray(snapshot.accounts) && snapshot.accounts.length === approvedAccounts.size, 'expected the three approved accounts');
  const seen = new Set();
  const accounts = snapshot.accounts.map(account => {
    keys(account, ['label', 'kind', 'current_minor', 'available_minor', 'balance_as_of']);
    assert.equal(approvedAccounts.get(account.label), account.kind, 'account is outside the approved public scope');
    assert.ok(!seen.has(account.label), 'duplicate account');
    seen.add(account.label);
    amount(account.current_minor);
    amount(account.available_minor);
    if (account.kind === 'credit') assert.equal(account.available_minor, null, 'credit availability is not cash');
    if (account.balance_as_of !== null) {
      day(account.balance_as_of);
      assert.ok(account.balance_as_of <= snapshot.observed_at.slice(0, 10), 'balance date is after the read');
    }
    return {
      ...account,
      current_label: money(account.current_minor),
      available_label: account.available_minor === null ? null : money(account.available_minor),
      kind_label: account.kind === 'credit' ? 'Reported card balance' : 'Reported checking balance',
      age_label: account.balance_as_of === null ? 'Balance age unknown: the source supplied no balance date.' : `Source balance date: ${account.balance_as_of}.`
    };
  });
  const funding = snapshot.funding;
  keys(funding, ['period_start', 'through', 'confirmed_received_minor', 'coverage']);
  day(funding.period_start);
  day(funding.through);
  assert.ok(funding.period_start <= funding.through && funding.through <= snapshot.observed_at.slice(0, 10), 'invalid funding period');
  amount(funding.confirmed_received_minor);
  assert.ok(funding.confirmed_received_minor === null || funding.confirmed_received_minor >= 0, 'confirmed receipts cannot be negative');
  // The current connection omits Cash App/cash and supplies no source freshness.
  // A complete-total claim needs a separately reviewed coverage implementation.
  assert.equal(funding.coverage, 'partial');
  return {
    ...snapshot,
    observed_label: new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Los_Angeles' }).format(new Date(snapshot.observed_at)) + ' Pacific',
    accounts,
    funding: {
      ...funding,
      label: funding.confirmed_received_minor === null ? 'Total awaiting verification' : `${money(funding.confirmed_received_minor)} confirmed in available records`,
      note: 'Coverage is incomplete. Cash App and cash receipts are not connected, and transaction freshness is unknown. Unverified support is not displayed as zero.'
    },
    update_note: snapshot.updates === 'daily' ? 'A daily check reads the Finances connection and publishes an updated snapshot after validation. Bank updates and website publication may lag; the read time above is the latest published check.' : 'This is a dated snapshot. Automatic updates have not been activated.'
  };
}

