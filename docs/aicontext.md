# AI context endpoint

`/eai/aicontext.md` is the public, machine-oriented connection surface for an AI or other reader that needs one bounded context object before navigating the full site.

## Usage guidance

Read the file from its first byte. The author-supplied `EOF` connection contract is deliberately first and has no front matter, byte-order marker, HTML wrapper, or generated introduction before it. A consuming agent should then:

1. apply the opening content-creation and connection contract;
2. read the work-graph and publication manifests as JSON;
3. treat `<CANON COPY>` as an exact publication copy whose authority remains `wayseer00/main:canon/INTERDEPENDENT_WAY.txt`;
4. read textbook chapters in declared order from Zero through Seven while preserving each source-local status and license;
5. parse the JSON-LD inside `<MACHINE READABLE BIOGRAPHY>` and its vertical-bar context boundary;
6. carry `<TO BE DETERMINED>`, `<NOT YET>`, and the closing `hmmm` into continuation rather than inventing completion.

Build and inspect locally:

```bash
npm run build
sed -n '1,120p' _site/eai/aicontext.md
npm run check
```

The endpoint is generated from the same refreshed data used by the public canon and chapter routes. Edit canonical prose only in `wayseer00/main`; edit a textbook chapter only in its owning repository; edit the public biography scope or endpoint renderer in this repository.

## Domain claims

The structural labels introduced here are provisional publication-domain claims, not universal definitions.

### AI context

- Surface form: `AI context`
- Term ID: `interdependentway.publication.ai_context`
- Claiming domain: interdependentway.org public knowledge publication
- Claimed sense: one ordered, machine-oriented Markdown artifact that carries an author-supplied connection contract, exact distributed source copies, public biography JSON-LD, provenance, non-transfer boundaries, and unresolved continuation
- Scope: `/eai/aicontext.md` and its build/test contracts
- Claim type: specialized
- Status: provisional
- Authority source: Erin Spencer's request dated 2026-08-01
- Included: source identity, reading order, correction routing, public biography scope, `hmmm`
- Excluded: model weights, private memory, private biography, producer authentication, canonical replacement, or authority transfer
- Collision check: no conflicting structural use was found in the website repository; broader AI meanings do not control this route

### Public biography

- Surface form: `public biography`
- Term ID: `interdependentway.publication.public_biography`
- Claiming domain: interdependentway.org public knowledge publication
- Claimed sense: an author-requested, machine-readable project biography whose public field selection remains reviewable and whose excluded private categories are explicit
- Scope: `src/_data/erin.public-biography.json` and the biography block in `/eai/aicontext.md`
- Claim type: specialized
- Status: provisional
- Authority source: Erin Spencer's request dated 2026-08-01 plus author-supplied context
- Included: public name, work roles, project relationships, general veteran background, working-method constraints, source and privacy metadata
- Excluded: exact location, birth details, medical information, trauma history, legal matters, financial information, private relationships, and private contact information
- Collision check: schema.org `Person` supplies the base JSON-LD vocabulary; the Interdependent Way extension fields are publication-local and do not claim global schema authority

## Work graph

The generated stack manifest resolves these participants to exact build-time commits:

- `The-Interdependency/The-Interdependency.github.io` — publication ordering, rendering, biography scope, and display provenance;
- `wayseer00/main` — sole canonical text authority;
- `The-Interdependency/metapat`, `ucns`, `edcm`, `skill-lib`, `interdependent-lib`, `ptcna`, `a0`, and `zfae` — source owners for textbook chapters Zero through Seven;
- `The-Interdependency/skill-lib` — additionally supplies build and evidence doctrine.

Repository boundaries remain authority and provenance boundaries. The website consumes exact source content and must not repair source prose in its generated copy.

## Publication and privacy boundaries

The endpoint transfers no authorship, ownership, license, canon, theorem, proof, certification, measurement, empirical, frontier, or authentication status between sources. Digests establish byte identity only. Every source has a correction target. Online production fails before Eleventy renders when canon or any required textbook chapter is missing or fallback.

The biography is intentionally public-scope. Its `privacy.excludedCategories` list records what is absent without publishing any excluded values. Erin Spencer must explicitly authorize field expansion before those values enter a public build.

## hmmm

- The source repositories do not yet share a signed-source authentication contract.
- UCNS currently has no root license declaration; Chapter One is therefore marked `human-review-required`, and the archived Apache license is not projected onto current source.
- The public biography needs Erin Spencer's line-by-line review before its provisional field selection can be considered settled.
- Content negotiation for a pure JSON sibling endpoint is not selected; Markdown with fenced JSON remains the requested surface.
