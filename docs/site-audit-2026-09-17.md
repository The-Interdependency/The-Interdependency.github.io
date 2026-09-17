# Website construction audit — 2026-09-17

## Baseline and scope

Repository: `The-Interdependency/The-Interdependency.github.io`.
Starting main commit: `b785404c565b6a105a1db25b99b006f7210a9612`.
The preceding release passed its 38 browser/accessibility checks and deployed through the repository's Pages workflow. This audit inspected what those checks execute, the Eleventy templates and asset loading, generated HTML, navigation and export behavior, small-screen rendering, and the publication/fallback boundaries.

The audit covers the public site's construction and the requested additions. It is not a penetration test, a legal/content review of the founder narrative, a verification of every external link, or a validation of the theories the site publishes. The separate MCP server's operational security is outside this change.

## Shared authority record

| Participant and identity | Authority in this work | Relationship / non-transfer |
|---|---|---|
| Website at `b785404c565b6a105a1db25b99b006f7210a9612` | Templates, navigation, rendering, tests, journal, deployment | Sole edit owner; publication does not acquire its sources' canon or proof status. |
| skill-lib at `dd5027d99516831c0dcb83a176a67140d3819b66`; audit skill blob `70013e0baadb414458c38aee278a0e9e1d1f5d33` | Audit/repair method and source-preservation contract | Guides the website audit; no source or implementation authority transfers. |
| METAPAT at `e4165b0cac9eca41daef9c2f941881028ca55d48`; axioms blob `90b7fea71369f08bee09d4fa100491a66e0c498e` | Semantic distinctions and domain restraint | Consulted before consolidating surfaces; web standards and observed behavior remain the website's evidence. |
| Existing canon and eight-chapter publication manifests | Exact source text, identity, order, license and source-local status | Unchanged; recovery snapshots and exact-source disclosures are purposeful redundancy. |
| W3C, GOV.UK and web.dev guidance below, consulted 2026-09-17 | Domain guidance for web construction | Guidance informs implementation; citations do not certify this site. |

The pinned audit skill and METAPAT axioms were checked against the same blobs read from current main. This is a documentary consultation, not a new semantic adapter, canon amendment, or cross-domain theorem claim. Existing publication identities remain owned by the site's source manifests and `/build.json`.

## Findings and repairs

| Finding / evidence at baseline | Class | Owner and action | Witness |
|---|---|---|---|
| `/home/` contained two body links urging readers into `/way/`, with adjacent prose repeating the same instruction; the Textbook CTA also appeared in the hero and its dedicated section. | DEFECT | Website: retain one Way invitation and one dedicated textbook section; link to the consolidated reading guide. | Template diff and rendered directory. |
| Every ordinary page referenced SITREP, map and Way-specific assets even when their elements were absent. | DEFECT | Website: load the four specialised stylesheets and two scripts only on their consuming routes. `/home/` now omits six references totalling 40,792 uncompressed source bytes. This is not a measured latency or compressed-transfer claim. | Browser checks on ordinary pages and both specialist routes. |
| The Way attached three export buttons to the whole unit, three to its reading, and three to its source. The 20-unit baseline had 180 buttons; a 320px viewport overflowed to roughly 347px. | DEFECT | Website: remove the container toolbar and its obsolete anchor-wrapper layout; retain readable-text and exact-source exports. Allow the grid items and titles to reflow. | 120 remaining buttons; no page overflow at 320px with units closed or the first unit open; clipboard/export regression. |
| Footer boilerplate repeated general source/status explanations across all ordinary pages; `/start/` separately owned orientation. | DEFECT | Website: one guide at `/about-the-site/`; compact shared footer navigation; `/start/` redirects with a usable HTML link and canonical destination. | Link check, compatibility-route and no-JavaScript browser checks. |
| Existing `/accessibility/` named a target but supplied no verification limits or reporting path. | DEFECT | Website: disclose automated versus manual scope and provide an issue-reporting route. | Generated page and automated accessibility check. |
| The existing `/about/` contains a biography/operating ledger; `/about-me/` contains the founder's narrative. | POLICY | Preserve distinct material. Similar labels alone do not justify deleting unique content or changing a commercial policy. | Source inspection; no edits to either body. |
| Exact-source displays, source-owned chapters, and the emergency/branch-root fallback repeat some content. | HEALTHY | Preserve verification, ownership and recovery functions. | Existing canon, source-identity, fallback and deployment gates. |
| Local download of the lockfile's Chromium build failed. | ENVIRONMENT | Use available Chromium 139 for local browser checks; the authoritative CI workflow installs its declared browser version independently. | Local 43-test run; CI is separately required before merge. |

## Requested additions

- `/about-the-site/` owns the reading guide, sourced web practices, correction routes and stated limits. It distinguishes ordinary reading from optional JavaScript features.
- `/by-the-builder/` renders dated, attributed AI-builder observations from `src/_data/builder.json`, in chronological insertion order. The opening entry preserves the distinction between simplifying an interface and erasing an idea, and between a passing check and a larger truth claim.
- `scripts/check-builder-history.mjs` validates entries and compares the old journal prefix against the current records. PR runs use the PR base, pushes use the pre-push revision, and scheduled/local runs default to `HEAD^`. Missing baseline history fails. A correction is a new entry referring to an earlier ID.
- Both release build checkouts fetch complete Git history. The append-only rule is an enforced workflow contract, not administrator-proof or cryptographically authenticated storage.

## Research used

- [W3C page structure](https://www.w3.org/WAI/tutorials/page-structure/): semantic regions, headings, orientation and bypassing repeated blocks.
- [W3C consistent navigation](https://www.w3.org/WAI/WCAG22/Understanding/consistent-navigation.html): predictable ordering of repeated navigation.
- [W3C reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html): reading at narrow equivalent widths while retaining meaningful two-dimensional exceptions.
- [W3C focus visibility](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html) and [target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html): observable keyboard focus and usable controls with appropriate spacing/exceptions.
- [GOV.UK progressive enhancement](https://www.gov.uk/service-manual/technology/using-progressive-enhancement): useful HTML first, with optional browser enhancements.
- [web.dev Web Vitals](https://web.dev/articles/vitals): separate field measurements of loading, interaction and layout stability from source-byte budgets.

## Local verification

- Four journal tests: valid append/correction, prohibited historical mutation, malformed records, and actual temporary-Git baseline comparison including missing history.
- Nine source-level site contracts passed.
- Fourteen generated-publication checks passed; 2,884 internal references checked across 126 HTML files using the local retained publication inputs.
- All 43 browser/accessibility checks passed using the current Playwright package with available Chromium 139. Added witnesses cover the new routes, 320px reflow, keyboard menu operation, no-JavaScript navigation, the old orientation route, and specialist asset loading.
- Static artifact budgets passed: 6,646,978 total bytes; 57,730 first-party CSS bytes; 95,064 first-party JS bytes; largest HTML document 142,921 bytes. These are local artifact measurements; fresh upstream publication inputs can change totals.
- Narrative and canon source bodies were preserved. The landing statement, including its owner-supplied spelling, is unchanged.

CI must execute `npm run check` with freshly retrieved publication inputs and its locked browser suite before merge. The Pages workflow separately verifies deployment identity at the Pages address and custom domain. Those terminal results live in the attached PR and Actions runs, not in a predicted success claim here.

## Usage guidance

```bash
npm ci
npm run check:builder -- --base <previous-commit>
node --test tests/builder-history.test.mjs
npm run check
npm run test:browser
```

For a new journal entry, append one record to `src/_data/builder.json`. For a correction, add `correction_of` with the original entry ID. Keep earlier records intact. Use the single About the site guide for future practice updates rather than copying policy text into every page.

## hmmm

- Manual screen-reader evaluation, disabled-user testing and broader comprehension testing remain outstanding. Passing automated rules does not establish full WCAG conformance.
- Core Web Vitals from real visitors have not been collected here. Transfer-size budgets and local browser checks establish different facts.
- The GitHub issue tracker requires an account; an alternative reporting channel has not been selected.
- External content and all historical commercial/biographical claims were not independently reverified in this construction audit.
