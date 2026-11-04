# Support page financial snapshots

The owner requested public funding and account balances on `/support/` on
2026-11-03. The ask lives in `src/_includes/components/support-ask.njk` and is
shared with the homepage. Its Boardy attribution belongs to the supplied text.

The site remains static. An authorized ChatGPT task reads the owner's Finances
connection, produces the restricted snapshot in `src/_data/supportSnapshot.json`,
and publishes it through the repository's ordinary checks and Pages deployment.
No bank connection, credentials, raw transactions, or private identifiers belong
in the site, its Git history, its build artifacts, or its logs.

## Updating the snapshot

1. Read current skill-lib instructions and the current website branch. Read
   `supportSnapshot.json` and this document. Preserve the owner's ask verbatim.
2. Call Finances `get_linked_accounts`. Resolve exactly the existing X Money
   checking, Chase checking, and Capital One credit-card accounts. New or
   ambiguous accounts require owner selection before adding to public scope.
3. Build the snapshot by selecting the allowed fields individually. Use the
   three fixed public labels in `support.js`. Convert USD balances to integer
   cents; preserve missing values as `null`. Keep credit balances separate from
   cash. Never use credit availability as cash.
4. Set `observed_at` to the actual successful read time, including its UTC
   offset. Set each `balance_as_of` only from `balances.balance_date` or a
   source-reported balance timestamp. Record-update, sync, ingestion and read
   timestamps do not establish balance age. Otherwise use `null`.
5. For funding, retain `period_start: 2026-11-03`. Query posted broad inflows
   from that date through the current Pacific date, using `amount < 0`,
   `include_transfers: true`, `pending: false`, and no category filter. Retrieve
   all pages. Check transaction coverage. Query pending inflows separately only
   if needed; never include pending money in confirmed support.
6. Reconcile evidence before counting: benefits, refunds, interest, cashback,
   own-account transfers, borrowed money and investment proceeds are not
   contributions to this ask. A payment provider name, amount, or ordinary
   transfer category alone cannot establish a contribution. Count support only
   when its purpose is explicit in source evidence or owner-confirmed records;
   count each receipt once and apply its attributable refunds. Calculate in
   integer cents. Publish only an aggregate, never donor or transaction details.
7. `confirmed_received_minor: null` means unverified. Zero requires evidence
   that the reviewed scope contains zero confirmed support; it never represents
   unknown Cash App/cash receipts. Any numeric amount is only the confirmed
   subtotal in the reviewed records. Keep `coverage: partial`: the current
   connection excludes Cash App and cash and has unknown source freshness.
   A complete fundraising total requires a separately verified coverage path.
8. `updates: daily` is valid only after the daily ChatGPT task is actually
   enabled. A request, plan, or GitHub build schedule is not activation evidence.
9. Append a builder-journal entry with the actual authoring date/time and
   truthful model provenance. Preserve every previous entry. If runtime model
   identity is unavailable, use `model: unavailable` with
   `model_unavailable_reason`; never invent an identifier.
10. Run `node --test tests/support-links.test.mjs tests/builder-history.test.mjs`,
    `npm run check:builder -- --base <starting-commit>`, and the normal release
    checks. Publish the exact checked change using the current repository
    review/deployment route. Confirm the resulting Pages deployment and
    `/build.json` commit before claiming the public page updated.

On connector, coverage, account-matching, validation, or publication failure,
preserve the last published snapshot and its timestamp. Report the specific
blocker privately; never replace unavailable values with zero or stamp old data
as newly read. Do not alter financial accounts or send messages to other people.
Unchanged source balances may still receive a new actual read timestamp, with
their source age unchanged. If a daily task is disabled, set `updates: manual`.

## Validation and rollback

`support.js` rejects extra fields, unapproved accounts, duplicate accounts,
non-integer money, false complete-coverage claims, and future balance dates.
Unknown funding renders as awaiting verification. The page remains readable
without JavaScript and requires no financial-service login from visitors.

To stop publication, disable the daily task and remove the balance/funding
sections and `support.js` together. Keep the ask, support links, and builder
history. Previously published financial snapshots remain in public Git history.

## hmmm

Cash App and cash receipts need a verified source before the site can show a
complete funding total. The Finances read time does not establish bank freshness.
