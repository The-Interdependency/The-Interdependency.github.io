# Related Works registry

Public submissions of works engaging The Interdependent Way, moderated by label.

## Flow

1. A visitor submits via the structured issue form (`.github/ISSUE_TEMPLATE/related-work.yml`),
   which applies the `related-work` label — or emails the same fields to the maintainer,
   who files the issue on their behalf.
2. The maintainer reviews. Adding the `approved` label publishes the listing on the next
   site build; removing either label delists it. Closing the issue does not delist —
   the labels are the single switch.
3. `scripts/fetch-works.mjs` (in `refresh:data`) fetches all issues carrying both labels,
   parses the issue-form body, validates each submission (required fields, https link,
   allowed type), and writes `src/_data/generated/works.json` plus a last-known-good
   snapshot. Invalid-but-approved submissions surface on the page as visible gaps rather
   than disappearing. `OFFLINE=1` uses the snapshot.
4. `/works/` renders the registry with attribution, per-work provenance (issue link),
   and the boundary statement.

## Boundary

Listing is moderation, not review: it transfers no endorsement, no research or review
status, and no theorem/proof/empirical status, and it never modifies canon or the
Article Lab research ledgers. Works remain at their own links under their own licenses.

## Display, not host (legal boundary)

The registry **displays works without hosting them**. Hard rules for anyone touching
this feature:

- The site stores no copies: the fetcher retrieves issue metadata only and never
  downloads a submitted work. Inline display uses pointers — the visitor's browser loads
  the image/audio/PDF/embed directly from the creator's own hosting at view time.
- Display sources are validated fail-closed: https only; direct image/audio/PDF file
  URLs, or iframe embeds from the deliberate allowlist in `scripts/fetch-works.mjs`
  (`IFRAME_EMBED_HOSTS` — grouped by medium: video, audio/music/podcasts,
  documents/archives/slides, code/interactive/3D). Extending the allowlist is a
  deliberate per-host decision — every entry means third-party script runs on the works
  page for approved listings — but it is expected to grow: submitters can request a
  missing platform in their submission, and adding it is a one-line change plus review.
- A work with no (or an invalid) display source lists as metadata plus an outbound link;
  invalid display sources exclude the submission visibly so the submitter can fix it.
- The submitter affirms rights, consent, and responsibility for accuracy and lawfulness
  in the required checkbox; the site's role is limited to moderated display.
- Takedown: removal requests go to wayseer@interdependentway.org; the maintainer removes
  the `approved` label (or the listing's issue), and the listing disappears on the next
  build. No copy remains because none was ever made.

This is design-level mitigation, not legal advice.
