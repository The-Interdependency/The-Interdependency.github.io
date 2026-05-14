# Website Best Practices Skill

Compiled for the Wayseer public site on 2026-05-14.

## Purpose
Use this skill when upgrading public-facing website pages. The goal is not spectacle. The goal is orientation, trust, accessibility, performance, and clear paths into dense material.

## Source-grounded principles

1. First screen must orient.
   - A visitor should quickly understand what the site is, who it is for, and what to do next.
   - Dense source/canon text should remain available, but should not be the first unavoidable wall.

2. Use semantic HTML first.
   - Prefer native landmarks and elements: header, nav, main, section, article, aside, footer.
   - Use meaningful heading order.
   - Use descriptive link text, not vague repeated labels.

3. Accessibility is structural, not decorative.
   - Maintain WCAG-oriented contrast.
   - Provide visible focus states.
   - Include skip links.
   - Keep touch/click targets large enough.
   - Respect reduced-motion preferences.

4. Performance supports trust.
   - Minimize JavaScript unless it serves a clear purpose.
   - Avoid large render-blocking dependencies for static pages.
   - Use system fonts unless custom typography is essential.
   - Stabilize layout to avoid visual jumps.

5. Navigation should create paths, not piles.
   - The homepage should route readers by intent: newcomer, explorer, researcher, contributor/supporter.
   - Canon should be framed as source material entered deliberately.
   - Article Lab should be presented as the interpreted bridge between raw text and public understanding.

6. Public-facing text must be complete enough to reduce confusion.
   - Name what the reader is seeing.
   - Explain why it exists.
   - State what to do next.
   - Do not hide uncertainty; mark living/incomplete work honestly.

## Wayseer site application

Homepage pattern:
- Global nav
- Hero with one clear statement
- Three primary reader paths
- Current work / Article Lab bridge
- Canon boundary note
- Support / continuity path
- Footer with hmmm

Canon index pattern:
- Explain canon as source material
- Offer Article Lab before raw articles
- Provide deliberate entry points into raw canon

Quality checklist before completion:
- [ ] Homepage does not begin with raw canon text.
- [ ] Primary CTA appears above the fold.
- [ ] Article Lab link works.
- [ ] Canon remains accessible but contextualized.
- [ ] Links have descriptive labels.
- [ ] Page uses semantic landmarks.
- [ ] Focus states are visible.
- [ ] Mobile layout is single-column and readable.
- [ ] No unnecessary JavaScript added.
- [ ] hmmm boundary appears.

## Anti-patterns
- Dumping raw source text at the first contact point.
- Adding visual noise to compensate for unclear structure.
- Creating many equal CTAs above the fold.
- Hiding canon entirely.
- Shipping pages with broken internal paths.
