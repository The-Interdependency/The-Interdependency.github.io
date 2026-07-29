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

## Display-only posture (legal boundary)

The registry **displays; it never hosts**. Hard rules for anyone touching this feature:

- No file uploads, no copies, no mirrors: the fetcher retrieves issue metadata only and
  never downloads a submitted work.
- No embedding on the works page — no iframes, media embeds, inline players, or hotlinked
  images of submitted works. Listings are text metadata plus an outbound hyperlink, ever.
- The submitter affirms rights, consent, and responsibility for accuracy and lawfulness in
  the required checkbox; the site's role is limited to moderated display of that metadata.
- Takedown: removal requests go to wayseer@interdependentway.org; the maintainer removes
  the `approved` label (or the listing's issue), and the listing disappears on the next
  build. Delisting requires no code change.

This is design-level mitigation, not legal advice.
