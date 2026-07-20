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
3. Re-run the `Pages` workflow on `main`.
4. Confirm the deployed page is generated from `_site`, not repository root.
5. If GitHub Actions deployment is intentionally unavailable, keep the branch-root fallback until a full static artifact is committed or Pages source is switched.

Do not point Pages at repository root as the long-term source; that path bypasses the canon fetch, validation, Article Lab generation, Pagefind, and route coverage checks.
