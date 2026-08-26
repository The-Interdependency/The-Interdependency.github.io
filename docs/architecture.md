# Architecture

The production site is generated into `_site` by Eleventy. Pages are complete HTML first; JavaScript adds only optional interaction. The browser never needs to call GitHub to discover projects or retrieve canon.

## Data paths

- `scripts/fetch-canon.mjs` retrieves the Wayseer text canon from `wayseer00/main:canon/INTERDEPENDENT_WAY.txt`. The transferred repository copy at `canon/the_interdependent_way.md` is recovery-only and is recorded as a fallback when used.
- `scripts/parse-canon.mjs` generates units, line ranges, note text, relationships, and SHA-256 digests from either Markdown-style recovery mirrors or the plain-text canonical file.
- `scripts/fetch-github-org.mjs` discovers every public organization repository and merges GitHub facts with `.interdependency/project.yml` or reviewed central overrides.
- `scripts/fetch-org-msdmd.mjs` refuses an impossible regression where the same immutable repository head previously supplied a collection but a later fetch calls it missing; that condition uses the explicitly marked last-known-good graph instead of publishing partial freshness.
- Distributed textbook Markdown remains source-owned; during rendering, source-relative links and images are resolved against each chapter's exact pinned GitHub source URL so publication routes cannot break repository-local references.
- Pagefind indexes the generated site after Eleventy finishes.
- `tests/links.test.mjs` validates generated internal references and fragments; `scripts/performance-budgets.mjs` enforces the transfer-size ceilings documented in `docs/performance.md`.

## Static backup

`fallback/` is dependency-free and copied into every normal artifact. A separate manual recovery workflow may deploy it, but an ordinary build failure must leave the previous successful Pages deployment live.

## Usage guidance

Run `npm install && npm run dev` for local work. Run `OFFLINE=1 npm run build` to verify last-known-good operation without network access. Run `npm run check` before proposing publication.
