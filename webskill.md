# WebSkill: Interdependent Way — Website plan and operating guide (v0.1, 2026-05-23)

Purpose
- Build and maintain a research-informed, accessible, GitHub Pages site as a dynamic learning system for The Interdependent Way.

Decision record (initial)
- Stack: Eleventy (11ty) + GitHub Actions + Pagefind search.
- IA: Home; The Way; Articles I–VIII; Etiquette I–III; Addenda; Interdefinables; Lab (by profession); Contra (site inversion); Glossary; Changelog; Resources.
- Accessibility target: WCAG 2.2 AA built into templates; inclusive, plain‑language content.
- Learning features: retrieval practice blocks, spaced revisit prompts (local-only), role pathways.
- Governance: PR-based changes, link/a11y checks in CI, public changelog.

Initial sprints
1) Base scaffolding, layouts, navigation, build/deploy, minimal content (home + one Article + one Contra + one Lab page). 2) Port remaining Articles/Etiquette. 3) Add Addenda, Interdefinables, Glossary v1. 4) Learning features, analytics, polish.

Content model (front matter keys)
- title, slug, summary, tags, roles, claims[], updated, status [draft|ready], sources[{title,href,kind}], reading_time.

Design system (baseline)
- Typographic scale (60–75 CPL), high contrast, large tap targets, keyboard focus, clear headings, descriptive links.

Citations (seed sources to verify/expand)
- WCAG 2.2 (W3C), WAI-ARIA 1.2
- Content design: GOV.UK guidance (plain language, links)
- Learning science: testing effect, spaced practice; UDL Guidelines 3.0 (CAST)
- Static search: Pagefind
- Dissent set: Arendt (power vs violence), Rawls/Nozick, Hardin vs Ostrom, learning-styles critique.

Backlog (selected)
- Glossary hover component; profession dashboards; printable summaries; audio/diagram alternates; a11y snapshot tests; zero-result search handling; cookie‑less opt‑in reminders; exportable role checklists.

Open questions
- Visual tone (austere civic vs warmer humanist)?
- Top 3 professions to seed in Lab?
- Contra priorities (which claims first)?

Change log
- 2026‑05‑23: v0.1 created; Eleventy chosen; CI workflow added; initial pages scaffolded.
