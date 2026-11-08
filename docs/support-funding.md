# Support page financial snapshots

The owner requested public funding and account balances on `/support/` on
2026-11-03. On 2026-11-08 the public page was limited to aggregate totals:
confirmed support, checking, and credit. The ask lives in
`src/_includes/components/support-ask.njk` and is shared with the homepage. Its
Boardy attribution belongs to the supplied text and is not a donation acknowledgment.

The site remains static. An authorized ChatGPT task reads the owner's Finances
connection, reduces it with `scripts/support-snapshot.mjs`, and commits only the
totals object in `src/_data/supportSnapshot.json`. Publication still goes through
the repository's ordinary checks and Pages deployment. No bank connection,
credentials, raw transactions, account rows, donor identities, or per-account
amounts belong in the site, its current files, its build artifacts, or its logs.

## Updating the snapshot

1. Read current skill-lib instructions and the current website branch. Read
   `supportSnapshot.json` and this document. Preserve the owner's ask verbatim.
2. Call Finances `get_linked_accounts`. Resolve exactly the existing X Money
   checking, Chase checking, and Capital One credit-card accounts. New or
   ambiguous accounts require owner selection before adding to public scope.
3. Sum the approved accounts before writing any file. Convert USD balances to
   integer cents; preserve missing values as `null`. Checking current and
   checking available are separate totals. If any included checking value is
   null, that total is null; do not publish a partial sum. Credit is its own
   total and never includes available credit. A balance date is kept only when
   every account in that total reports the same date; otherwise the total's
   date is null. Run `node scripts/support-snapshot.mjs <private.json>` and
   commit its stdout only. The command prints aggregate totals and does not
   copy labels, per-account amounts, names, memos, or transactions.
4. Set `observed_at` to the actual successful read time, including its UTC
   offset. On the private read, set each `balance_as_of` only from
   `balances.balance_date` or a source-reported balance timestamp. Record-update,
   sync, ingestion and read timestamps do not establish balance age. Otherwise
   use `null`. Those dates are inputs to the total; they are not published as
   separate account rows.
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
   integer cents. The committed funding value is one total or null. Never write
   a donor, a receipt, a counterparty, or a transaction into the snapshot,
   page, download, or embedded JSON.
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

`scripts/support-snapshot.mjs` rejects the old per-account publication shape,
extra fields, identity keys, unapproved accounts, duplicate accounts,
non-integer money, false complete-coverage claims, and future balance dates.
A refresh that commits account rows or donor details fails the build instead
of being hidden in the template. Unknown funding renders as awaiting verification.
The page remains readable without JavaScript and requires no financial-service
login from visitors.

To stop publication, disable the daily task and remove the totals sections and
`support.js` together. Keep the ask, support links, and builder history.
Previously published financial snapshots remain in public Git history.

## hmmm

Cash App and cash receipts need a verified source before the site can show a
complete funding total. The Finances read time does not establish bank freshness.

## Publication prerequisite

The initial release check failed because A0 moved Chapter Six to
`archive/docs/chapter-6.md`. Its current README at
`ef9f44b518087b9152240731a727ec0f3d531913` explicitly directs current-branch consumers
to that preserved path. The archived chapter is byte-identical to the retained
chapter snapshot (SHA-256 `81053004f1dcfe3278dfce149c6211955d0b8ebb15ee755321bae44144274d0e`).
The source spine now follows that path and labels the chapter as historical.
No A0 source or runtime is changed. The production fallback rejection remains.
The exact bounded source graph is [support-publication.json](work-graphs/support-publication.json);
run `npm run refresh:textbook` and the ordinary release checks to verify retrieval.
