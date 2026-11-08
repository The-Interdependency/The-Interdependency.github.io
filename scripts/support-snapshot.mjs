// === MODULE_BUILD ===
// id: public_support_snapshot
//   module_name: public-support-snapshot
//   module_kind: adapter
//   summary: Reduce approved account readings to aggregate totals and reject identities, per-account amounts, and transaction records.
//   owner: Erin Spencer
//   public_surface: /support/; createSupportView(snapshot); aggregateSupportSnapshot(input)
//   internal_surface: src/_data/supportSnapshot.json
//   auth_boundary: none
//   storage_boundary: read
//   network_boundary: none
//   user_data_boundary: read
//   admin_only: false
//   tests: tests/support-links.test.mjs, tests/support-links.spec.mjs
//   rollout: Eleventy builds the aggregate snapshot into static HTML after validation
//   rollback: remove the totals sections and this adapter; keep the support ask
// === END MODULE_BUILD ===
// === BOUNDARIES ===
// id: public_support_data_boundary
//   summary: Publishes only aggregate checking, credit, and confirmed-support totals. Account labels, per-account amounts, donors, and transactions never enter the public snapshot or rendered view.
//   auth_boundary: none
//   storage_boundary: read
//   network_boundary: none
//   user_data_boundary: read
//   admin_only: false
//   pii: sensitive
//   secrets: none
//   side_effects: public financial totals
//   owner: Erin Spencer
// === END BOUNDARIES ===
// Usage: commit only the object returned by aggregateSupportSnapshot. A private
// read may be passed on stdin via the CLI; the process prints the public totals
// and does not write the private input. See docs/support-funding.md.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const publicSchema = 'interdependentway.support-snapshot/2';
const privateSchema = 'interdependentway.support-snapshot/1';
// These labels select which private readings may be summed. They are not copied
// into the public snapshot, the rendered page, or the CLI stdout.
const approvedAccounts = new Map([
  ['X Money checking', 'depository'],
  ['Chase checking', 'depository'],
  ['Capital One credit card', 'credit']
]);
const identityKeys = new Set([
  'account_id', 'account_number', 'mask', 'routing_number', 'access_token',
  'transactions', 'transaction', 'transaction_id', 'donor', 'donor_name', 'donors',
  'payer', 'payee', 'counterparty', 'merchant', 'memo', 'receipt', 'receipts',
  'line_item', 'line_items', 'contributor', 'contributors', 'sponsor', 'patron',
  'identity', 'name', 'description', 'raw_response', 'accounts', 'label'
]);
const moneyFormat = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function keys(value, expected) {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), 'expected a public snapshot object');
  assert.deepEqual(Object.keys(value).sort(), [...expected].sort(), 'unexpected or missing public fields');
}

function day(value) {
  assert.match(value, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10), value, 'invalid source date');
}

function amount(value) {
  assert.ok(value === null || Number.isSafeInteger(value), 'money must be integer cents or null');
}

function nonNegative(value, message) {
  amount(value);
  assert.ok(value === null || value >= 0, message);
}

function rejectIdentityKeys(value) {
  if (Array.isArray(value)) {
    for (const item of value) rejectIdentityKeys(item);
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const key of Object.keys(value)) {
    assert.ok(!identityKeys.has(key), `public snapshot cannot carry ${key}`);
    rejectIdentityKeys(value[key]);
  }
}

function header(snapshot, schema) {
  keys(snapshot, schema === publicSchema
    ? ['schema', 'source', 'observed_at', 'currency', 'updates', 'totals', 'funding']
    : ['schema', 'source', 'observed_at', 'currency', 'updates', 'accounts', 'funding']);
  assert.equal(snapshot.schema, schema);
  assert.equal(snapshot.source, 'ChatGPT Finances');
  assert.equal(snapshot.currency, 'USD');
  assert.match(snapshot.observed_at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/);
  assert.ok(Number.isFinite(Date.parse(snapshot.observed_at)), 'invalid observation timestamp');
  assert.ok(['manual', 'daily'].includes(snapshot.updates), 'unsupported update cadence');
}

function fundingOf(snapshot) {
  const funding = snapshot.funding;
  keys(funding, ['period_start', 'through', 'confirmed_received_minor', 'coverage']);
  day(funding.period_start);
  day(funding.through);
  assert.ok(funding.period_start <= funding.through && funding.through <= snapshot.observed_at.slice(0, 10), 'invalid funding period');
  nonNegative(funding.confirmed_received_minor, 'confirmed receipts cannot be negative');
  // The current connection omits Cash App/cash and supplies no source freshness.
  // A complete-total claim needs a separately reviewed coverage implementation.
  assert.equal(funding.coverage, 'partial');
  return {
    period_start: funding.period_start,
    through: funding.through,
    confirmed_received_minor: funding.confirmed_received_minor,
    coverage: funding.coverage
  };
}

function optionalDate(value, observedAt) {
  if (value === null) return null;
  day(value);
  assert.ok(value <= observedAt.slice(0, 10), 'balance date is after the read');
  return value;
}

function sharedDate(values) {
  const unique = new Set(values);
  return unique.size === 1 ? [...unique][0] : null;
}

function sumOrUnknown(values) {
  if (values.some(value => value === null)) return null;
  return values.reduce((sum, value) => sum + value, 0);
}

function reduceAccounts(snapshot) {
  assert.ok(Array.isArray(snapshot.accounts) && snapshot.accounts.length === approvedAccounts.size, 'expected the approved accounts');
  const seen = new Set();
  const checking = [];
  const credit = [];
  for (const account of snapshot.accounts) {
    keys(account, ['label', 'kind', 'current_minor', 'available_minor', 'balance_as_of']);
    assert.equal(approvedAccounts.get(account.label), account.kind, 'account is outside the approved public scope');
    assert.ok(!seen.has(account.label), 'duplicate account');
    seen.add(account.label);
    amount(account.current_minor);
    amount(account.available_minor);
    const balanceAsOf = optionalDate(account.balance_as_of, snapshot.observed_at);
    if (account.kind === 'credit') {
      assert.equal(account.available_minor, null, 'credit availability is not cash');
      credit.push({ current: account.current_minor, balanceAsOf });
    } else {
      checking.push({ current: account.current_minor, available: account.available_minor, balanceAsOf });
    }
  }
  return {
    checking_current_minor: sumOrUnknown(checking.map(account => account.current)),
    checking_available_minor: sumOrUnknown(checking.map(account => account.available)),
    checking_balance_as_of: sharedDate(checking.map(account => account.balanceAsOf)),
    credit_current_minor: sumOrUnknown(credit.map(account => account.current)),
    credit_balance_as_of: sharedDate(credit.map(account => account.balanceAsOf))
  };
}

function totalsOf(snapshot) {
  const totals = snapshot.totals;
  keys(totals, ['checking_current_minor', 'checking_available_minor', 'checking_balance_as_of', 'credit_current_minor', 'credit_balance_as_of']);
  amount(totals.checking_current_minor);
  amount(totals.checking_available_minor);
  amount(totals.credit_current_minor);
  return {
    checking_current_minor: totals.checking_current_minor,
    checking_available_minor: totals.checking_available_minor,
    checking_balance_as_of: optionalDate(totals.checking_balance_as_of, snapshot.observed_at),
    credit_current_minor: totals.credit_current_minor,
    credit_balance_as_of: optionalDate(totals.credit_balance_as_of, snapshot.observed_at)
  };
}

function publicSnapshot(snapshot, totals) {
  const published = {
    schema: publicSchema,
    source: snapshot.source,
    observed_at: snapshot.observed_at,
    currency: snapshot.currency,
    updates: snapshot.updates,
    totals,
    funding: fundingOf(snapshot)
  };
  rejectIdentityKeys(published);
  return published;
}

export function aggregateSupportSnapshot(input) {
  if (input?.schema === publicSchema) {
    header(input, publicSchema);
    return publicSnapshot(input, totalsOf(input));
  }
  assert.equal(input?.schema, privateSchema, 'unsupported support snapshot schema');
  header(input, privateSchema);
  return publicSnapshot(input, reduceAccounts(input));
}

function formatted(minor) {
  return minor === null ? 'Unavailable' : moneyFormat.format(minor / 100);
}

function ageLabel(balanceAsOf) {
  return balanceAsOf === null ? 'Balance age unknown: the source supplied no balance date.' : `Source balance date: ${balanceAsOf}.`;
}

export function createSupportView(snapshot) {
  assert.equal(snapshot?.schema, publicSchema, 'public support view accepts aggregate totals only');
  const published = aggregateSupportSnapshot(snapshot);
  const funding = published.funding;
  const totals = published.totals;
  return {
    observed_at: published.observed_at,
    observed_label: `${new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Los_Angeles' }).format(new Date(published.observed_at))} Pacific`,
    update_note: published.updates === 'daily' ? 'A daily check reads the Finances connection and publishes updated totals after validation. Bank updates and website publication may lag; the read time above is the latest published check.' : 'This is a dated snapshot. Automatic updates have not been activated.',
    funding: {
      period_start: funding.period_start,
      through: funding.through,
      label: funding.confirmed_received_minor === null ? 'Total awaiting verification' : `${formatted(funding.confirmed_received_minor)} confirmed in available records`,
      note: 'Coverage is incomplete. Cash App and cash receipts are not connected, and source freshness is unknown. Unverified support is not displayed as zero.'
    },
    checking: {
      current_label: formatted(totals.checking_current_minor),
      available_label: totals.checking_available_minor === null ? null : formatted(totals.checking_available_minor),
      age_label: ageLabel(totals.checking_balance_as_of)
    },
    credit: {
      current_label: formatted(totals.credit_current_minor),
      age_label: ageLabel(totals.credit_balance_as_of)
    }
  };
}

function parseSnapshotText(text) {
  try {
    return JSON.parse(text);
  } catch {
    const error = new Error('support snapshot rejected: input is not valid JSON');
    error.publicMessage = true;
    throw error;
  }
}

function stderrLine(error) {
  if (error instanceof Error && error.publicMessage === true && error.message === 'support snapshot rejected: input is not valid JSON') return error.message;
  if (error instanceof assert.AssertionError && error.generatedMessage === false) {
    const line = String(error.message).split('\n')[0];
    if (/^[A-Za-z0-9 ,.:;()/_+-]{1,200}$/.test(line)) return line;
  }
  return 'support snapshot rejected';
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const file = process.argv[2];
    assert.ok(file && process.argv.length === 3, 'Usage: node scripts/support-snapshot.mjs <private-or-public.json>');
    process.stdout.write(`${JSON.stringify(aggregateSupportSnapshot(parseSnapshotText(readFileSync(file, 'utf8'))), null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${stderrLine(error)}\n`);
    process.exit(1);
  }
}
