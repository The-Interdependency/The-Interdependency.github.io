# GitHub Pages release truth

The production artifact is `_site`. A release is not complete merely because source exists on `main` or a Pages job reports that an artifact was uploaded.

## Repository contract

1. `npm run check` refreshes canon and organization data, verifies provenance, validates all routes, compares every rights-article excerpt and note with the selected canon, generates the Eleventy site and Pagefind index, and runs generated-site tests.
2. Browser and accessibility checks run against the generated artifact before upload.
3. `_site/build.json` records the exact site commit and canonical source identity.
4. After deployment, both the GitHub Pages URL and `https://interdependentway.org/build.json` must report the expected commit. A stale or missing identity fails the workflow.

## Required GitHub configuration

These settings are outside repository source control and require repository administration:

- **Settings → Pages → Build and deployment → Source:** GitHub Actions.
- **Custom domain:** `interdependentway.org`.
- **DNS:** the apex and any intended `www` record must resolve according to GitHub Pages guidance and pass GitHub's domain check.
- **Enforce HTTPS:** enabled after the certificate is available.
- **Environment:** `github-pages` must allow the Pages workflow to deploy.
- **Branch protection:** require the `Verify generated site` pull-request check before merging to `main`.

## Incident reading

- Branch-root `index.html` is a recovery floor, not the preferred publication.
- The generated site is current only when `/build.json` matches the expected deployment SHA.
- Canon freshness is separately shown by the canonical repository, commit, blob, content digest, and fallback flag in the same file.

## hmmm

The workflow can prove what was built and what the public endpoints serve. It cannot change DNS, attach the custom domain, enable HTTPS, or alter Pages source settings from repository code; those remain explicit administrative boundaries.
