# Stack — The Forge

The Projects feature and `/projects/stack/` implement the approved forge view:
brought together, in the forge, graduated, and returned upstream. The existing
project route, source documentation and repository links remain available.
All research disclosures work without JavaScript, including on phones.

## Ownership and freshness

`src/_data/forge.json` is a **reviewed companion snapshot**, dated visibly on the
page. Stack owns its composition, source pins, workspace evidence and graduation
records; this website owns presentation. This is not a live forge-status service.
The existing live documentation refresh does not refresh the companion snapshot.
Different repository-list and Forge commits produce a visible mismatch notice.

The native Stack manifest is retained unchanged inside the snapshot. Input and
graduated cards derive from it; workspace summaries are explicitly interpretation.
Each summary points to its exact Stack README. Source files carry Git blob and
SHA-256 identities, also published in `/build.json`. The work graph is the source
manifest's existing `work_graph_sha256`, not a new ownership hierarchy.

EPAC's graduation comes from its declared lifecycle and transition receipt.
Other workspace status is not inferred from test success or repository existence.
The upstream section describes the documented return route; it explicitly marks
the missing consolidated completed-return ledger as hmmm.

## Usage and refresh

1. Check out the desired exact Stack commit and read its README, manifest and
   affected workspace READMEs, including graduation receipts.
2. Update the snapshot's commit, source URL, review date, native manifest and
   affected companion descriptions together. Recompute each source's Git blob
   and SHA-256 from its exact bytes; do not advance only the date.
3. Verify every pinned source against that checkout:
   `FORGE_SOURCE_ROOT=/path/to/stack node --test tests/forge.test.mjs`.
4. Append a builder entry; run `npm run check` and
   `npx playwright test tests/forge.spec.mjs tests/accessibility.spec.mjs`.

The source-checkout check is read-only and rejects a different commit or modified
source bytes. Ordinary CI verifies snapshot structure, exact links, rendering,
status isolation and JavaScript-free mobile disclosures.

Rollback: revert the complete Forge change transaction while preserving the
append-only builder journal. Source repositories require no changes.

## hmmm

Automated upstream-return inventory and live Forge snapshot refresh are not
implemented. Existing Stack source licensing gaps remain visible in provenance.
