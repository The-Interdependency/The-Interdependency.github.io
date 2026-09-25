# The Interdependent Way public knowledge system

This repository builds `interdependentway.org`: a static-first, progressively layered entrance to The Interdependent Way, its deliberate tensions, the distributed Interdependency textbook, surrounding research, public artifacts, and the repositories attempting implementation.

## What is authoritative

The canonical text of **The Interdependent Way** lives in `wayseer00/main:canon/INTERDEPENDENT_WAY.txt`, and nowhere in this repository supersedes it. The repository copy at `canon/the_interdependent_way.md` is a recovery mirror only. Build output records whether the remote source or recovery mirror supplied the current snapshot, together with SHA-256 provenance; successful remote retrieval also records the resolved source commit and blob SHA.

The **distributed Interdependency textbook** is a separate technical reading sequence. Chapters Zero through Seven remain owned by their source repositories:

| Chapter | Title | Source |
|---:|---|---|
| 0 | Meta Energy Theory — Root Structure and Action | `The-Interdependency/metapat:CHAPTER_ZERO.md` |
| 1 | The Subtractive Foundations of the Unit Carrier | `The-Interdependency/ucns:docs/chapter-1.md` |
| 2 | Measurement Without Transfer | `The-Interdependency/edcm:docs/chapter-2.md` |
| 3 | Modules That Speak for Themselves | `The-Interdependency/skill-lib:docs/chapter-3.md` |
| 4 | Canon Without Inversion | `The-Interdependency/interdependent-lib:docs/chapter-4.md` |
| 5 | One Architecture, Four Layers | `The-Interdependency/ptcna:docs/chapter-5.md` |
| 6 | The Instrument | `The-Interdependency/a0:docs/chapter-6.md` |
| 7 | The Echo | `The-Interdependency/zfae:docs/chapter-7.md` |

This site displays exact, provenance-bearing chapter snapshots. It does not merge licenses or transfer theorem, proof, empirical, frontier, or canonical status between repositories.

## Architecture

- `/` presents the founder-supplied description of The interdependent way, with links into The Way and About me.
- `/about/` is the organization-level identity record for The Interdependency LLC, keeping the organization, The Interdependent Way, the website, and Erin Spencer distinct while emitting Organization JSON-LD.
- `/about-me/` preserves the founder-authored **In Service to Love** narrative.
- `/home/` is the newcomer-oriented Start Here route, organized by visitor intent rather than repository or content type.
- `/about-the-site/` owns orientation, construction practices, and verification limits; `/start/` preserves its former address.
- `/by-the-builder/` renders the append-only, attributed builder journal.
- `/research/` is the evidence index over admitted studies, bounded findings, and visible gaps; `/research/method/` is its subordinate admission/review method.
- `/preamble/` remains available within the canonical reading system and primary navigation.
- `/chapters/` is the unified index for the eight-repository textbook.
- `/chapters/chapter-zero/` through `/chapters/chapter-seven/` render exact source Markdown with commit, blob, digest, and repository links.
- `/eai/aicontext.md` begins with Erin's exact connection contract and then publishes the exact canon copy, all eight textbook chapters, a public-scope JSON-LD biography, and machine-readable work-graph and publication identities.
- Eleventy generates complete HTML into `_site`.
- Pagefind supplies static search.
- Global navigation exposes seven durable visitor domains: Start Here, The Way, Textbook, Research, Projects, About, and Search. Narratives, Related Works, SITREP, Artifacts, research method, and other specialist views remain reachable through section navigation rather than appearing as equal global peers.
- The release gate verifies every generated internal link and fragment, and enforces documented static transfer-size budgets.
- GitHub organization, canon, and textbook source data are retrieved at build time, never in a visitor’s browser.
- Every public organization repository receives a generated project page.
- `.interdependency/project.yml` supplies reviewed project purpose, maturity, relationships, and links.
- `fallback/` is a dependency-free emergency edition.
- `src/artifacts/edcm-mathematics.njk` publishes an exact commit-pinned reproduction of `The-Interdependency/edcm:docs/EDCM_MATHEMATICS.md` at `/artifacts/edcm-mathematics/`; correct the EDCM source first and run `npm run check:edcm-reference` before updating the copy.
- `artifacts/four-cuts-1.html` is deliberately published at `/artifacts/four-cuts/` through Eleventy passthrough.
- `_site/build.json` publishes the site commit, canonical and textbook source identities, and explicit fallback receipts for repository discovery, the organization msdmd graph, SITREP, and Works.

## Usage guidance

```bash
npm install
npm run dev
npm run check
```

Refresh only the textbook source set:

```bash
npm run refresh:textbook
```

Use recovery snapshots without network access:

```bash
OFFLINE=1 npm run build
```

An offline build uses the retained last-known-good textbook snapshot when one exists. If a clean checkout has no retained chapter content, it renders metadata-only `hmmm` records rather than inventing or silently copying text.

Export controls remain on reading material, provenance, fields explicitly marked `data-copy-field`; navigation cards and layout containers stay free of copy/export toolbars.

Route checks after a build:

```text
/                               The interdependent way landing statement
/about-me/                      In Service to Love founder narrative
/home/                          knowledge-system entrance
/preamble/                      direct canonical Preamble
/chapters/                      textbook index
/chapters/chapter-zero/         Chapter Zero
...
/chapters/chapter-seven/        Chapter Seven
/eai/aicontext.md               machine-oriented connection context
```

Add reviewed project metadata to a repository:

```yaml
category: Mathematics & verification
status: frontier
summary: One-sentence public description.
purpose: The repository's role within the project constellation.
primary_artifact: https://example.org
docs: https://github.com/org/repo/tree/main/docs
relationships:
  - Depends on another named project for a specific function.
```

Place that file at `.interdependency/project.yml`. Until it exists, the public project page keeps the missing editorial layer visible as `hmmm`.

## Status language

- **canon** — exact or mechanically derived from the canonical source
- **distributed textbook** — exact source material whose status remains local to its owning repository
- **interpretation** — explanatory material subject to review
- **research** — primary studies or systematic evidence-synthesis studies admitted through explicit screening
- **non-study context** — legislation, treaties, standards, guidelines, frameworks, doctrine, and analysis kept outside Research
- **implemented** — a working public surface exists
- **frontier** — experimental, incomplete, or not externally established
- **hmmm** — an unresolved constraint with enough context for continuation

## Release discipline

GitHub Actions runs the workflow action audit, canon and textbook provenance refresh, article-to-canon exactness gate, build, validation, tests, internal-link and static performance-budget checks, static search generation, browser checks, accessibility checks, deployment, and live build-identity verification. The textbook gate requires all eight current source files during an online production build and rejects missing content, reordered chapters, changed source locations, missing source identities, or silent fallback. The workflow action audit requires full-length commit SHA pins and rejects tag refs, short SHAs, stale SHAs, or unapproved pins for the GitHub-owned actions used by this site. Failed builds do not replace the last successful Pages artifact. Emergency fallback deployment is explicit rather than automatic. Budget definitions and usage are in [`docs/performance.md`](docs/performance.md).

Repository source cannot configure the Pages source, custom domain, DNS, HTTPS, or branch protection. The required administrative settings and the release-truth contract are documented in [`docs/pages-release.md`](docs/pages-release.md).

## Maintaining the builder journal

The canonical behavior contract is `The-Interdependency/skill-lib:website-builder-journal`, consumed here from commit `0981aed7695ba2675d5de35ef43ba734e94adea0`. Before changing any website file, load `.agents/skills/website-builder-journal/SKILL.md`.

Every website change transaction appends at least one object to `src/_data/builder.json`. Preserve every prior object unchanged. New entries require a unique `id`, `date`, `time` with explicit UTC offset, exact runtime `model`, and Markdown `body`. Subject matter belongs wholly to the model; no title, patch summary, theme, minimum length, or changelog structure is required. Corrections append new entries.

The journal append is part of the transaction and does not recursively require another append. `/by-the-builder/` renders the journal as a nested semantic `<details>` tree.

```bash
npm run check:builder -- --base <previous-commit>
node --test tests/builder-history.test.mjs
```

The gate compares changed repository paths with the selected Git base. Any non-journal change with zero appended entries fails. PR checks compare against the PR base; push checks use the pre-push commit; scheduled/local checks default to `HEAD^`. Missing Git history fails closed.

The [September 17 site audit](docs/site-audit-2026-09-17.md) records the earlier journal boundary; the first published entry remains intentionally legacy because append-only history forbids retroactive time/model backfill.
