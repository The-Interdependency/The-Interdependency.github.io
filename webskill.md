GPT-4 generated. Context, Prompt by Erin (“Way Seer Erin”)

WebSkill: Interdependent Way site — build, deploy, and editorial operations (v0.2, 2026-05-23)

Purpose
- Make the website an aesthetically coherent, accessible, research‑informed, dynamic learning system.
- Ship via GitHub Pages with reproducible builds and clear contribution workflow.

Stack
- Eleventy (11ty) static site generator.
- Node.js 24 LTS (local and CI).
- Pagefind for static full‑text search.
- GitHub Actions → GitHub Pages deployment.

Node and package manager
- Required Node: 24.x (LTS today). Local: use .nvmrc for auto‑switching; CI: actions/setup-node@v4.
- Installer: npm. Short‑term we use `npm install` in CI to unblock; plan to commit a package‑lock.json and switch to `npm ci` for reproducible builds.

Repository layout (11ty)
- src/ — content root
  - _includes/ — layouts and components
  - _data/ — site‑wide data
  - articles/, etiquette/, addenda/, interdefinables/, lab/, contra/
- assets/ — css, images, client JS
- .eleventy.js — collections + dir mapping
- .github/workflows/build.yml — build & deploy

Content model (front matter keys)
- title, summary, tags, roles, status [draft|ready], updated, sources: [{title, href, kind}], claims: []

Editorial workflow
- Feature branches → PRs → preview build via Actions.
- Required checks: link check + a11y snapshots (todo).
- Changelog entries for meaning‑shifting edits.

Accessibility & design
- WCAG 2.2 AA baseline. Keyboard‑first nav. High contrast.
- Plain‑language structure; progressive disclosure for complexity.

Dynamic learning features (phased)
- Retrieval practice blocks; spaced revisit prompts (localStorage only).
- Glossary tooltips; cross‑refs by tags.

Site inversion (contra)
- Steel‑man critiques with citations; apply Rapoport’s Rules.

Rollout plan
- Sprint 1 (done-ish): IA + skeleton + Actions workflow + Node 24.
- Sprint 2 (in progress): Articles II–IV; Etiquette I; Lab templates (Clinician, Engineer); Contra pages (Rawls/Nozick; Commons); Glossary v1.
- Sprint 3: Remaining Articles/Etiquette/Addenda; Contra expansion; Search UI polish.
- Sprint 4: Learning features; a11y automation; docs.

Operational notes
- Accreditation line lives in footer; can be moved global‑top if desired.
- hmmm doctrine: append a “hmmm” line to mark living continuation.

Open items
- Add package‑lock.json (Node 24, npm@10) and move CI back to `npm ci`.
- Choose top 3 Lab professions after Educator (default: Clinician, Engineer, Community Organizer).
- Decide on quiz timing (per‑page now vs after migration).

hmmm
