# Architecture

The production site is generated into `_site` by Eleventy. Pages are complete HTML first; JavaScript adds only optional interaction. The browser never needs to call GitHub to discover projects or retrieve canon.

## Data paths

- `scripts/fetch-canon.mjs` retrieves the Wayseer canonical alias `wayseer00/wayseer.github.io:canon/the_interdependent_way.md`. The transferred repository copy at `canon/the_interdependent_way.md` is recovery-only and is recorded as a fallback when used.
- `scripts/parse-canon.mjs` generates units, line ranges, note text, relationships, and SHA-256 digests.
- `scripts/fetch-github-org.mjs` discovers every public organization repository and merges GitHub facts with `.interdependency/project.yml` or reviewed central overrides.
- Pagefind indexes the generated site after Eleventy finishes.

## Static backup

`fallback/` is dependency-free and copied into every normal artifact. A separate manual recovery workflow may deploy it, but an ordinary build failure must leave the previous successful Pages deployment live.

## Usage guidance

Run `npm install && npm run dev` for local work. Run `OFFLINE=1 npm run build` to verify last-known-good operation without network access. Run `npm run check` before proposing publication.
