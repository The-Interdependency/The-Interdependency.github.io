# Runbook

- Local build: `npm install && npm run build`.
- GitHub API failure: set `OFFLINE=1` to use `src/_data/snapshots/repos.last-known-good.json`.
- Canon parser failure: do not deploy mismatched commentary; inspect `src/_data/generated/canon.json`.
- Domain: preserve `CNAME` containing `interdependentway.org`.

## If the public site still shows the old raw-text homepage

Evidence: `index.html` in the repository root has been replaced by a canon-safe branch-source fallback. If `https://interdependentway.org/` still shows the old homepage after that commit is on `main`, GitHub Pages is serving an older Actions artifact or a stale Pages source, not the current branch-root file.

Required recovery path:

1. Open repository Settings → Pages for `The-Interdependency/The-Interdependency.github.io`.
2. Set **Build and deployment → Source** to **GitHub Actions**.
3. Re-run the `Pages` workflow on `main` using **Run workflow**, not **Re-run jobs** on an older failed attempt.
4. Confirm the deployed page is generated from `_site`, not repository root.
5. If GitHub Actions deployment is intentionally unavailable, keep the branch-root fallback until a full static artifact is committed or Pages source is switched.

Do not point Pages at repository root as the long-term source; that path bypasses the canon fetch, validation, Article Lab generation, Pagefind, and route coverage checks.

## Workflow action policy

The repository policy requires every workflow action to be pinned to a full-length commit SHA. The allowed pins below are the current non-deprecated Node 24-safe action generation for each GitHub-owned action used here:

- `actions/checkout@df4cb1c069e1874edd31b4311f1884172cec0e10` — v6, node24
- `actions/setup-node@a0853c24544627f65ddf259abe73b1d18a591444` — v5, node24
- `actions/configure-pages@45bfe0192ca1faeb007ade9deae92b16b8254a0d` — v6, node24
- `actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a` — v7, node24
- `actions/upload-pages-artifact@fc324d3547104276b827a68afc52ff2a11cc49c9` — v5 composite; internally uses upload-artifact v7
- `actions/deploy-pages@cd2ce8fcbc39b97be8ca5fce6e763baed58fa128` — v5, node24

Run `npm run audit:workflows` before editing workflow files. The audit rejects tag refs, short SHAs, stale SHAs, and any unapproved pin for the GitHub-owned actions listed above.
