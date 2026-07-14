# Recovery

Recovery references supplied in the handoff:

- `recovery/pre-rollback-eleventy-2026-05-23` at `00dd117a6aa95eddb9741fd3ee592c6d15833bd3` for Eleventy/Pagefind information architecture.
- `recovery/full-article-lab-2026-05-21` at `9677700904797bdd8f7946b4c898266e3655b951` for eight-article Lab coverage.

This branch does not merge either branch wholesale. It rebuilds a minimal Eleventy 3 static-first scaffold and records unresolved recovery work as `hmmm`.

Rollback must deploy a known-good artifact or tag rather than rewriting `main` history.
