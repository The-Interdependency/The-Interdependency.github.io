Webskill: Interdependent Way website — construction, operations, and governance (GitHub Pages)

Purpose
- Build and run an accessible, research‑informed, public website for The Interdependent Way using GitHub Pages, with a learning‑oriented IA, Article Lab, and a Site Inversion (contra) section.
- Optimize for durability, clarity, and continuous improvement over spectacle.

Core objectives
- Aesthetically coherent, WCAG 2.2 AA accessible, mobile‑first site.
- Information scent: any Article/Addendum concept discoverable in ≤2 clicks.
- Dynamic learning: retrieval practice, spaced revisit prompts (opt‑in, privacy‑respecting), profession‑specific Article Lab.
- Trust: steel‑manned dissent in a first‑class /contra section with citations.

Architecture (high level)
- Stack: Eleventy (11ty) static site generator + GitHub Actions → GitHub Pages.
- Search: Pagefind (static, chunked index) generated at build.
- Content model: Markdown with front matter (title, summary, tags, roles, claims, status, updated, sources[]).
- Collections: articles, etiquette, addenda, interdefinables, lab (by role), contra, glossary, resources, changelog.

Information Architecture (URLs)
- / (Home); /the-way/ (overview map); /articles/ (I–VIII with anchors); /etiquette/ (I–III); /addenda/ (consciousness, electronic‑element); /interdefinables/; /lab/; /contra/; /glossary/; /changelog/; /resources/.

Design system and a11y
- Typographic scale targeting 60–75 CPL; high contrast; generous spacing; responsive.
- Components: callouts (Note/Caution/Research), glossary tooltips, “On this page” ToC, next/previous nav.
- WCAG 2.2 AA; ARIA only when needed; keyboard and focus management guaranteed.

Editorial standards
- Plain language first; progressive disclosure (definitions → examples → edge cases).
- Citations: numbered endnotes with stable anchors; link to primary sources where possible.
- Contra: Rapoport’s Rules; state our claim, strongest counter‑position, common ground, disagreement, implications.
- Changelog: record meaning‑shifting edits (what/why/when/who/sources).

Governance and workflow
- Branching: feature branches → PR with preview → required checks (build, broken links, basic a11y snapshot) → merge to main.
- Roles: Editor (content), Maintainer (build and IA), Reviewer (a11y/content). All changes mapped to an issue or milestone.
- Definition of Done (per page):
  - Front matter complete; headings scan well; links descriptive; glossary terms linked once per section.
  - At least 1 research citation (supportive or dissenting) where claims extend beyond common knowledge.
  - QA: mobile viewport, keyboard nav, color‑contrast pass.

Article Lab (by profession)
- Template: relevance → situations/signals → minimum competencies checklist → starter scripts/patterns → metrics → pitfalls/countermeasures.
- Seed roles: educator, clinician/therapist, engineer, policymaker, organizer, parent/guardian, artist, law enforcement, infosec.

Site Inversion (/contra)
- Organized by claim; each page presents steel‑manned critique with citations, our response, and practice implications.

Analytics (privacy‑respecting)
- Focus on task success (findability), recirculation, and engaged time. Avoid cross‑site tracking.

Tech stack details
- Eleventy + Node 20; @pagefind/cli for search; markdown‑it + anchors for heading links.
- GitHub Actions: build on push to main; upload artifact; deploy via actions/deploy‑pages.

Repository layout
- /src/ (content root); /src/_includes/ (layouts); /src/_data/ (site config);
- /src/{articles, etiquette, addenda, interdefinables, lab, contra, glossary, resources, changelog}
- /assets/ (css/js/media); /.github/workflows/build.yml (CI/CD).

Milestones (initial 4 sprints)
- Sprint 1: IA confirmation; base layouts; a11y skeleton; Actions + Pagefind.
- Sprint 2: Articles I–IV + Etiquette I; Glossary v1; Lab templates for 3 roles.
- Sprint 3: Articles V–VIII + Etiquette II–III; Addenda; Contra v1 (3 critiques).
- Sprint 4: Learning features (quizzes + spaced prompts), polish, docs.

Open questions
- Visual mood (austere civic vs warmer humanist); Lab role priorities; Contra claim priorities; accreditation line placement (footer or about only?).

References (selected)
- WCAG 2.2; GitHub Pages + Actions; NN/g info‑scent; testing effect/spaced practice; UDL guidelines; Pagefind docs; Arendt/Rawls/Nozick; Ostrom/Hardin.

Maintenance checklist (per release)
- Bump deps; run build locally; verify Pagefind index; link‑check; a11y spot‑check; update changelog; tag release.

CLLD: Completion = web skill documented; repo scaffolded; CI building; content collections live; IA discoverable; plan tracked in /docs/plans; first pages published.
