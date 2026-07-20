# The Interdependent Way public knowledge system

This repository builds `interdependentway.org`: a static-first, progressively layered entrance to The Interdependent Way, its deliberate tensions, surrounding research, public artifacts, and the repositories attempting implementation.

## What is authoritative

The canonical text lives in `wayseer00/main:canon/INTERDEPENDENT_WAY.txt`, and nowhere in this repository supersedes it. The repository copy at `canon/the_interdependent_way.md` is a recovery mirror only. Build output records whether the remote source or recovery mirror supplied the current snapshot, together with SHA-256 provenance; successful remote retrieval also records the resolved source commit and blob SHA.

## Architecture

- Eleventy generates complete HTML into `_site`.
- Pagefind supplies static search.
- GitHub organization and canon data are retrieved at build time, never in a visitor’s browser.
- Every public organization repository receives a generated project page.
- `.interdependency/project.yml` supplies reviewed project purpose, maturity, relationships, and links.
- `fallback/` is a dependency-free emergency edition.
- `artifacts/four-cuts-1.html` is deliberately published at `/artifacts/four-cuts/` through Eleventy passthrough.

## Usage guidance

```bash
npm install
npm run dev
npm run check
```

Use the recovery snapshots without network access:

```bash
OFFLINE=1 npm run build
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
- **interpretation** — explanatory material subject to review
- **research** — externally sourced support, dissent, or context
- **implemented** — a working public surface exists
- **frontier** — experimental, incomplete, or not externally established
- **hmmm** — an unresolved constraint with enough context for continuation

## Release discipline

GitHub Actions runs the workflow action audit, build, validation, tests, static search generation, and deployment. The workflow audit rejects SHA-pinned or Node-20-era GitHub-owned actions. Failed builds do not replace the last successful Pages artifact. Emergency fallback deployment is explicit rather than automatic.
