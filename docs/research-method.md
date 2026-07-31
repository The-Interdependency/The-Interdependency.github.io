# Research method

|∆|Only primary research studies and systematic evidence-synthesis studies count as Research.|∆| Legislation is not science. Treaties, standards, guidelines, frameworks, doctrine, legal analysis, policy reports, editorials, narrative reviews, protocols without results, and AI summaries may be preserved as non-study context, but they never count toward Research coverage or stance.

The historical source and claim YAML files in `src/_data/research` are candidate-intake ledgers. `source-admissions-*.yml` classifies every candidate. The Eleventy adapter fails closed: only `admit-study` records with `record_class: research_study` and claims whose every source is admitted reach `research_data.sources` or `research_data.claims`.

## Admission

A primary study must state a research question or objective, reproducible methods, analysis, results, and limitations. Eligible designs include experiments and trials, observational studies, qualitative and mixed-methods research, quasi-experiments, natural experiments, replications, and formal or simulation studies that are labeled non-empirical.

A systematic synthesis must declare its search, selection, and synthesis or mapping method. Systematic reviews, scoping reviews, evidence maps, and meta-analyses can qualify. A narrative review does not qualify merely because it cites studies or is peer reviewed.

Institutional authority, prestige, peer review, and citation counts are not record classes. Unclear records remain excluded with `hmmm` until full text establishes a qualifying method and result.

## Claim contract

Every published study-linked claim records:

- the exact canonical unit;
- stance: `support`, `dissent`, `mixed`, or `limit`;
- a bounded study result;
- the separate Article relation;
- the inference gap;
- source IDs that all resolve to admitted studies;
- an exact full-text locator or an explicit provisional `hmmm`;
- verification status and review date.

`verified-full-text` is allowed only when the locator names a page, table, figure, appendix, or Results section. Abstract-only, indirect, or locator-free claims stay `provisional-full-text-locator-needed`. One study is provisional contact; a broad conclusion needs a systematic synthesis or convergent independent studies.

## Search and appraisal

Search in both supporting and challenging directions. Record databases, queries, dates, eligibility rules, screening decisions, and Article-level gaps. Do not manufacture support/dissent symmetry: “no qualifying study found” is a valid result.

Use design-appropriate risk-of-bias reasoning rather than one universal score. Record population or corpus, place, time, method, outcomes, effect or result, uncertainty, limitations, funding, conflicts, preregistration, data and code availability, and correction or retraction status when available. Check corrections and retractions on admission and during scheduled review.

## Usage guidance

1. Add a candidate source to a manifest-declared `sources*.yml` file.
2. Add exactly one decision to `source-admissions-*.yml`.
3. Add or revise the smallest bounded claim in `claims*.yml`.
4. For an admissible claim, add its result, Article relation, inference gap, locator, status, and review date to `claim-reviews-*.yml`.
5. Update the relevant record in `evidence-gaps-*.yml`.
6. Run:

   ```sh
   npm run check
   npm run test:browser
   ```

The public method page shows the live admission totals, provisional locator count, and all Article-level `hmmm` gaps.

## Provenance and authority

Research never changes canon. The controlling text remains `wayseer00/main:canon/INTERDEPENDENT_WAY.txt`; generated research and interpretation are subordinate contact layers.

This migration followed `The-Interdependency/skill-lib` at commit `289d4959f7920efc214f180cca3443d8090f4095`, using the `the-interdependency`, `canon`, and `skill-usage` procedures. Repo-local skill copies are not treated as canonical.

## hmmm

The 2026-07-31 migration is a strict screen of the existing candidate ledger, not a comprehensive systematic review. Exact full-text locators, duplicate independent screening, design-specific risk-of-bias appraisals, funding and conflict extraction, and scheduled correction/retraction checks remain incomplete and must not be inferred.
