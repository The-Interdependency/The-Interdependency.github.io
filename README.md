# The Interdependent Way public knowledge system

This repository builds `interdependentway.org`: a static-first, progressively layered entrance to The Interdependent Way, its deliberate tensions, the distributed Interdependency textbook, surrounding research, public artifacts, and the repositories attempting implementation.

## What is authoritative

The canonical text of **The Interdependent Way** lives in `wayseer00/main:canon/INTERDEPENDENT_WAY.txt`, and nowhere in this repository supersedes it. The repository copy at `canon/the_interdependent_way.md` is a recovery mirror only. Build output records whether the remote source or recovery mirror supplied the current snapshot, together with SHA-256 provenance; successful remote retrieval also records the resolved source commit and blob SHA.

The **distributed Interdependency textbook** is a separate technical reading sequence. Chapters Zero through Seven remain owned by their source repositories:

| Chapter | Title | Source |
|---:|---|---|
| 0 | Meta Energy Theory — Axioms, Postulates, and Theorems | `The-Interdependency/metapat:CHAPTER_ZERO.md` |
| 1 | The Subtractive Foundations of the Unit Carrier | `The-Interdependency/ucns:docs/chapter-1.md` |
| 2 | Measurement Without Transfer | `The-Interdependency/edcm:docs/chapter-2.md` |
| 3 | Modules That Speak for Themselves | `The-Interdependency/skill-lib:docs/chapter-3.md` |
| 4 | Canon Without Inversion | `The-Interdependency/interdependent-lib:docs/chapter-4.md` |
| 5 | One Architecture, Four Layers | `The-Interdependency/ptcna:docs/chapter-5.md` |
| 6 | The Instrument | `The-Interdependency/a0:docs/chapter-6.md` |
| 7 | The Echo | `The-Interdependency/zfae:docs/chapter-7.md` |

This site displays exact, provenance-bearing chapter snapshots. It does not merge licenses or transfer theorem, proof, empirical, frontier, or canonical status between repositories.

## Architecture

- `/` is the canon-derived **Awakening** splash page and public threshold.
- `/home/` is the complete living knowledge-system entrance.
- `/preamble/` remains one click from Awakening and from the primary navigation.
- `/chapters/` is the unified index for the eight-repository textbook.
- `/chapters/chapter-zero/` through `/chapters/chapter-seven/` render exact source Markdown with commit, blob, digest, and repository links.
- Eleventy generates complete HTML into `_site`.
- Pagefind supplies static search.
- GitHub organization, canon, and textbook source data are retrieved at build time, never in a visitor’s browser.
- Every public organization repository receives a generated project page.
- `.interdependency/project.yml` supplies reviewed project purpose, maturity, relationships, and links.
- `fallback/` is a dependency-free emergency edition.
- `artifacts/four-cuts-1.html` is deliberately published at `/artifacts/four-cuts/` through Eleventy passthrough.
- `_site/build.json` publishes the site commit and canonical source identity for live deployment verification.

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

Route checks after a build:

```text
/                               Awakening threshold
/home/                          knowledge-system entrance
/preamble/                      direct canonical Preamble
/chapters/                      textbook index
/chapters/chapter-zero/         Chapter Zero
...
/chapters/chapter-seven/        Chapter Seven
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
- **research** — externally sourced support, dissent, or context
- **implemented** — a working public surface exists
- **frontier** — experimental, incomplete, or not externally established
- **hmmm** — an unresolved constraint with enough context for continuation

## Release discipline

GitHub Actions runs the workflow action audit, canon and textbook provenance refresh, article-to-canon exactness gate, build, validation, tests, static search generation, browser checks, accessibility checks, deployment, and live build-identity verification. The textbook gate requires all eight current source files during an online production build and rejects missing content, reordered chapters, changed source locations, missing source identities, or silent fallback. The workflow action audit requires full-length commit SHA pins and rejects tag refs, short SHAs, stale SHAs, or unapproved pins for the GitHub-owned actions used by this site. Failed builds do not replace the last successful Pages artifact. Emergency fallback deployment is explicit rather than automatic.

Repository source cannot configure the Pages source, custom domain, DNS, HTTPS, or branch protection. The required administrative settings and the release-truth contract are documented in [`docs/pages-release.md`](docs/pages-release.md).
