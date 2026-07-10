# Runbook

- Local build: `npm install && npm run build`.
- GitHub API failure: set `OFFLINE=1` to use `src/_data/snapshots/repos.last-known-good.json`.
- Canon parser failure: do not deploy mismatched commentary; inspect `src/_data/generated/canon.json`.
- Domain: preserve `CNAME` containing `interdependentway.org`.
