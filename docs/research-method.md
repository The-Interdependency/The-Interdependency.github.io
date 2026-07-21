# Research method

Sources and claims are stored in `src/_data/research`. Stance classification is editorial review, not automated metadata inference. Missing support or dissent must render as a documented `hmmm` gap.

## Article Lab contact structure

The eight Rights Article Labs use `src/_data/article_lab.json`. Every record must include:

- a reductio ad absurdum test in both directions plus a bounded reading;
- at least four worst practices and four best practices;
- applications for medical, construction, engineering, agriculture, jurisprudence, transportation and distribution, child craft, information systems, emergency response, hospitality and sanitation, and community governance;
- at least one reviewed claim linked to a source with an explicit evidence boundary.

## Usage guidance

Add or revise operational applications in `article_lab.json`. Add research evidence separately in `sources.yml` and `claims.yml`; do not place an uncited empirical claim inside an application paragraph. Run `npm test`, `npm run build`, `npm run test:generated`, and `npm run test:browser` before publication.

An application is a bounded hypothesis about how an Article might constrain practice in a domain. It does not supersede domain standards, professional duties, law, safety rules, or the canonical text. Reductio sections deliberately test destructive overextension and destructive absolute rejection; neither is presented as the endorsed reading.
