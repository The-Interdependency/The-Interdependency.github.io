# Website Best Practices Skill

Use this skill when improving the Wayseer public site or any durable public-facing web surface.

## Source basis

This skill was compiled from current web practice research and primary guidance:
- W3C WAI: clear, consistent navigation; multiple ways to navigate; orientation cues; accessible labels.
- W3C WCAG navigable guidance: structure, headings, focus order, and user orientation are core accessibility concerns.
- W3C WAI menus tutorial: keyboard focus order and operable navigation must preserve meaning.
- MDN accessibility guidance: semantic HTML gives browsers and assistive technology built-in hooks; use correct elements, good link text, alt text, labels, and keyboard-accessible controls.
- web.dev performance guidance: fast pages require attention to Core Web Vitals, unused code, asset weight, and stable UI behavior.

## Operating doctrine

A website is not a storage closet. It is a receiving room, map, library, and invitation.

For the Wayseer site specifically:
1. **Orientation before canon.** New visitors must first receive context, not raw dense source text.
2. **Canon by choice.** Source material stays accessible, but never as an unavoidable first wall.
3. **One primary action above the fold.** The homepage should guide readers toward the Article Lab / guided path.
4. **Layered comprehension.** Offer beginner, interpreter, collaborator, and source-reader pathways.
5. **No orphan shelves.** Every important page should be reachable from obvious navigation or a directory page.
6. **Accessibility is structure, not decoration.** Semantic regions, headings, focus states, contrast, and good link text are mandatory.
7. **Performance by restraint.** Static HTML/CSS, no unnecessary frameworks, no heavy scripts, no visual spectacle that slows comprehension.
8. **Trust signals.** Tell visitors what the site is, who maintains it, how to support it, and how unfinished areas are marked.
9. **Mobile-first.** The site must work at narrow widths before desktop refinement.
10. **hmmm boundary.** Unfinishedness should be honest, explicit, and contained.

## Homepage checklist

- [ ] Descriptive title and meta description.
- [ ] Skip link.
- [ ] Sticky or clearly placed navigation.
- [ ] Hero answers: what is this, why care, what should I do next?
- [ ] Primary CTA visible without scrolling.
- [ ] Secondary CTA for source/canon access.
- [ ] Three or four role-based entry cards.
- [ ] Clear explanation of site structure.
- [ ] Support path present but not coercive.
- [ ] Footer includes ownership/maintenance context and hmmm.

## Accessibility checklist

- [ ] `lang` attribute present.
- [ ] Semantic landmarks: `nav`, `main`, `section`, `footer`.
- [ ] Headings in logical order.
- [ ] Keyboard focus visible.
- [ ] Links describe destination; avoid vague “click here.”
- [ ] Contrast sufficient for body text and controls.
- [ ] Motion respects `prefers-reduced-motion`.
- [ ] Layout does not require horizontal scrolling on mobile.

## Performance checklist

- [ ] Keep CSS small and inline only where useful for a static page.
- [ ] Avoid render-blocking external assets unless necessary.
- [ ] Avoid JavaScript on informational pages unless it directly improves comprehension.
- [ ] Use system fonts unless a brand font is essential.
- [ ] Avoid unoptimized large images above the fold.
- [ ] Maintain stable layout: no late-loading elements that shift text.

## Information architecture pattern

Recommended top-level navigation:

1. Start / Home
2. Guided Path / Article Lab
3. Concepts
4. Projects
5. About a0
6. Canon
7. Support

Recommended homepage section order:

1. Navigation
2. Hero: orientation first, canon by choice
3. Role-based paths
4. What the site contains
5. Current work / upgrades
6. Support / collaboration
7. Boundary note
8. Footer

## Quality bar

A page is not complete until a first-time reader can answer:
- What is this?
- Who is it for?
- Where should I start?
- Where is the original source?
- What is unfinished?
- How can I help or continue?

hmmm
