// Usage: run through `npm run test:generated` after a complete site build.
// Evidence boundary: verifies generated artifact contracts, not the remote Pages environment.
import { createHash } from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { connectionContract } from '../src/eai/aicontext.11ty.js';

// === CHECKS ===
// id: check_ai_context_public_discovery
//   proves: ai_context_public_discovery
//   call: self::checkAiContextPublicDiscovery
//   requires: node
//   timeout: 10
//   mutates: none
//   cleanup: none
// === END CHECKS ===

export async function checkAiContextPublicDiscovery() {
  const [home, splash, sitemap, llms] = await Promise.all([
    readFile('_site/home/index.html', 'utf8'),
    readFile('_site/index.html', 'utf8'),
    readFile('_site/sitemap.xml', 'utf8'),
    readFile('_site/llms.txt', 'utf8')
  ]);
  assert.match(home, /href="\/eai\/aicontext\.md"/);
  assert.match(home, /rel="alternate" type="text\/markdown" href="\/eai\/aicontext\.md"/);
  assert.match(splash, /rel="alternate" type="text\/markdown" href="\/eai\/aicontext\.md"/);
  assert.match(sitemap, /<loc>https:\/\/interdependentway\.org\/eai\/aicontext\.md<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/interdependentway\.org\/llms\.txt<\/loc>/);
  assert.match(llms, /machine entry point is `\/eai\/aicontext\.md`/);
  assert.match(llms, /EDCM claim requires an actual cited EDCM result record/);
}

// Usage: run only after Eleventy has generated _site, normally through npm run test:generated or npm run check.
test('generated deployment artifact contains the unified routes', async () => {
  const [splash, home, preamble, chapters, artifacts, edcmMathematics, fourCuts, fallback, articles, narratives, jackAndDiane] = await Promise.all([
    readFile('_site/index.html', 'utf8'),
    readFile('_site/home/index.html', 'utf8'),
    readFile('_site/preamble/index.html', 'utf8'),
    readFile('_site/chapters/index.html', 'utf8'),
    readFile('_site/artifacts/index.html', 'utf8'),
    readFile('_site/artifacts/edcm-mathematics/index.html', 'utf8'),
    readFile('_site/artifacts/four-cuts/index.html', 'utf8'),
    readFile('_site/fallback/index.html', 'utf8'),
    readFile('_site/articles/index.html', 'utf8'),
    readFile('_site/narratives/index.html', 'utf8'),
    readFile('_site/narratives/jack-and-diane/index.html', 'utf8')
  ]);

  assert.match(splash, /class="awakening-splash"/);
  assert.match(splash, /<h1>Awakening<\/h1>/);
  assert.match(splash, /5d explodes out of 4d/);
  assert.match(splash, /You are not alone/);
  assert.match(splash, /href="\/preamble\/"[^>]*>Read the Preamble/);
  assert.match(splash, /href="\/home\/"[^>]*>Enter the living system/);
  assert.doesNotMatch(splash, /primary-nav/);
  assert.match(home, /A way through complexity/);
  assert.match(home, /href="\/preamble\/"[^>]*>Read the Preamble/);
  assert.match(home, /href="\/chapters\/"/);
  assert.match(home, /Chapters Zero through Seven/);
  assert.match(home, /href="\/"/);
  assert.match(preamble, /One-click canon entrance/);
  assert.match(preamble, /Humanity faces extinction/);
  assert.match(preamble, /Canonical repository/);
  assert.match(chapters, /The Interdependency Textbook/);
  assert.match(chapters, /Chapters Zero through Seven/);
  assert.match(artifacts, /Artifacts/);
  assert.match(artifacts, /href="\/artifacts\/edcm-mathematics\/"/);
  assert.match(edcmMathematics, /EDCM mathematics: recovered architecture record/);
  assert.match(edcmMathematics, /ratified architecture v0\.3\.1/);
  assert.match(edcmMathematics, /not a measurement result/);
  assert.match(edcmMathematics, /ee20db72dde75f602ccf590a64047117f6bca87d/);
  assert.match(edcmMathematics, /457758fecb257532757657db4f119a52f850f318/);
  assert.match(edcmMathematics, /aria-label="Start of recovered conversational context">\|<\/p>/);
  assert.match(edcmMathematics, /aria-label="End of recovered conversational context">\|<\/p>/);
  assert.match(edcmMathematics, /<math\b/);
  assert.match(edcmMathematics, /\\mathrm\{NA\} \\ne 0/);
  assert.match(edcmMathematics, /hmmm/);
  assert.match(fourCuts, /Wealth and tax/);
  assert.match(fallback, /Emergency static edition/);
  assert.match(articles, /Publication drafts/);
  assert.match(narratives, /Living Narratives/);
  assert.match(narratives, /Jack &amp; Diane: The Longhand Threshold/);
  assert.match(jackAndDiane, /The story cannot bestow adulthood/);
  assert.match(jackAndDiane, /Jack and Diane remain minors/);
  assert.match(jackAndDiane, /status-risk">not canon/);
  assert.match(jackAndDiane, /The Longhand Journal/);
  assert.match(jackAndDiane, /The line we have not crossed/);
  for (const title of [
    'Article One: Contribution without contempt',
    'Article Two: Freedom without abandonment',
    'Article Three: Speech as demonstrated consent',
    'Article Four: Law as teachable duty',
    'Article Five: Adulthood as demonstrated competence',
    'Article Six: Authority as burden',
    'Article Seven: Definitions before governance',
    'Article Eight: Rights with living limits'
  ]) assert.match(articles, new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('distributed textbook displays all eight exact chapter sources', async () => {
  const textbook = JSON.parse(await readFile('src/_data/generated/textbook.json', 'utf8'));
  const index = await readFile('_site/chapters/index.html', 'utf8');
  const contact = [
    /Zero is not nothing/,
    /directed twofold branched angular cover/,
    /NA != 0/,
    /Modules That Speak for Themselves/,
    /meta-package/,
    /Prime Tensor Circled Neural Architecture/,
    /research[\s\S]*instrument, not a product/,
    /theory under development/
  ];

  assert.equal(textbook.chapters.length, 8);
  for (const chapter of textbook.chapters) {
    assert.match(index, new RegExp(`href="/chapters/${chapter.slug}/"`));
    assert.match(index, new RegExp(chapter.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    const html = await readFile(`_site/chapters/${chapter.slug}/index.html`, 'utf8');
    assert.match(html, /class="textbook-chapter"/);
    assert.match(html, new RegExp(`<title>Chapter ${chapter.display_number} · ${chapter.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}<\\/title>`));
    assert.match(html, new RegExp(chapter.repository.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(html, new RegExp(chapter.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(html, /Open exact source in GitHub/);
    assert.match(html, /Source evidence/);
    assert.match(html, contact[chapter.number]);
  }
  assert.match(await readFile('_site/chapters/chapter-seven/index.html', 'utf8'), /theory under development/);
});

test('Way map renders Human consciousness beneath Interdefinables and before Preamble', async () => {
  const way = await readFile('_site/way/index.html', 'utf8');
  const interdefinablesSection = way.indexOf('<strong>The Interdefinables</strong>');
  const humanHeading = way.indexOf('Human consciousness emerges from');
  const binaryHeading = way.indexOf('Binary essences meaningfully');
  const preambleSection = way.indexOf('<strong>Preamble</strong>');

  assert.ok(interdefinablesSection >= 0, 'Interdefinables section missing');
  assert.ok(humanHeading > interdefinablesSection, 'Human consciousness must appear inside Interdefinables');
  assert.ok(binaryHeading > humanHeading, 'Human consciousness child headings must follow their parent');
  assert.ok(preambleSection > binaryHeading, 'Preamble must be the next major section after Interdefinables');
  assert.match(way, /class="unit-level-3"[^>]*>[\s\S]*?Human consciousness emerges from/);
  assert.match(way, /class="unit-level-4"[^>]*>[\s\S]*?Binary essences meaningfully/);
  assert.doesNotMatch(way, /<h2>Human consciousness emerges from:?<\/h2>/);
  assert.match(way, /<details class="canon-unit"/);
  assert.match(way, /<summary class="canon-unit-summary">/);
  assert.match(way, /Select a title to display that canon unit's exact text/);
  assert.equal((way.match(/class="canon-unit-lab"/g) || []).length, 8);
  assert.match(way, /Open Article Lab/);
  assert.doesNotMatch(way, /Open unit page|Enter Lab|Source and provenance|tap to read|text open/);
});

test('generated deployment artifact contains all rights article vertical slices with research attachment', async () => {
  const pages = [
    ['article-one', /Contribution without contempt/, /From each as they will/],
    ['article-two', /Freedom without abandonment/, /None shall be enslaved/],
    ['article-three', /Speech as demonstrated consent/, /Your speech/],
    ['article-four', /Law as teachable duty/, /None shall be left ignorant/],
    ['article-five', /Adulthood as demonstrated competence/, /Political Adulthood/],
    ['article-six', /Authority as burden/, /Violence is the ultimate Authority/],
    ['article-seven', /Definitions before governance/, /Where any would converse/],
    ['article-eight', /Rights with living limits/, /The whole of the law/]
  ];

  for (const [slug, titlePattern, canonPattern] of pages) {
    const html = await readFile(`_site/articles/${slug}/index.html`, 'utf8');
    assert.match(html, titlePattern);
    assert.match(html, canonPattern);
    assert.match(html, /60–90 second script/);
    assert.match(html, /Study-only research attachment/);
    assert.match(html, /Inference boundary/);
    assert.match(html, /hmmm · study coverage/);
    assert.match(html, /hmmm/);
  }
});

test('every Rights Article Lab renders absurd-limit, practice, domain, and research sections', async () => {
  const canon = JSON.parse(await readFile('src/_data/generated/canon.json', 'utf8'));
  const articleLab = JSON.parse(await readFile('src/_data/article_lab.json', 'utf8'));
  const requiredDomains = [
    'Medical', 'Construction', 'Engineering', 'Agriculture', 'Jurisprudence',
    'Transportation and distribution', 'Child craft', 'Information systems',
    'Emergency response', 'Hospitality and sanitation', 'Community governance'
  ];

  for (const record of articleLab) {
    const unit = canon.units.find(candidate => candidate.id === record.unit_id);
    assert.ok(unit, `missing canon unit ${record.unit_id}`);
    const html = await readFile(`_site/lab/${unit.routeSlug}/index.html`, 'utf8');
    assert.match(html, /Reductio ad absurdum/);
    assert.match(html, /Worst practices and best practices/);
    assert.match(html, /Applications by domain/);
    assert.match(html, /Research field/);
    assert.match(html, /Inference boundary/);
    assert.match(html, /Only admitted research studies appear here|Research means an admitted primary study/);
    assert.match(html, /hmmm · study coverage/);
    assert.match(html, /href="https?:\/\//);
    for (const domain of requiredDomains) assert.match(html, new RegExp(domain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('public Research pages exclude legislation, standards, guidelines, frameworks, and doctrine', async () => {
  const method = await readFile('_site/research/method/index.html', 'utf8');
  const articlePages = await Promise.all([
    'article-one', 'article-two', 'article-three', 'article-four',
    'article-five', 'article-six', 'article-seven', 'article-eight'
  ].map(slug => readFile(`_site/articles/${slug}/index.html`, 'utf8')));
  const publicResearch = [method, ...articlePages].join('\n');

  assert.match(method, /Legislation is not science/);
  assert.match(method, /19<\/strong> admitted studies/);
  assert.match(method, /20<\/strong> non-study records excluded/);
  for (const excludedTitle of [
    'Guidelines on sanitation and health',
    'General comment No. 1',
    'RFC 2119',
    'National Incident Management System',
    'The Belmont Report'
  ]) assert.doesNotMatch(publicResearch, new RegExp(excludedTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('generated deployment artifact publishes verifiable build identity', async () => {
  const build = JSON.parse(await readFile('_site/build.json', 'utf8'));
  assert.equal(build.repository, 'The-Interdependency/The-Interdependency.github.io');
  assert.ok(build.commit);
  assert.match(build.generatedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(build.canonicalSource.repository, 'wayseer00/main');
  assert.equal(build.canonicalSource.path, 'canon/INTERDEPENDENT_WAY.txt');
  assert.match(build.canonicalSource.contentSha256, /^[a-f0-9]{64}$/);
});

test('generated deployment artifact publishes the complete machine-oriented AI context', async () => {
  const [aicontext, textbookRaw, biographyRaw] = await Promise.all([
    readFile('_site/eai/aicontext.md', 'utf8'),
    readFile('src/_data/generated/textbook.json', 'utf8'),
    readFile('src/_data/erin.public-biography.json', 'utf8')
  ]);
  const textbook = JSON.parse(textbookRaw);
  const biography = JSON.parse(biographyRaw);

  assert.equal(aicontext.slice(0, connectionContract.length), connectionContract);
  const canonMatch = /<CANON COPY>\n([\s\S]*?)<\/CANON COPY>/.exec(aicontext);
  const publicationMatch = /<PUBLICATION MANIFEST[^>]*>\n```json\n([\s\S]*?)\n```\n<\/PUBLICATION MANIFEST>/.exec(aicontext);
  assert.ok(canonMatch);
  assert.ok(publicationMatch);
  const publication = JSON.parse(publicationMatch[1]);
  assert.equal(createHash('sha256').update(canonMatch[1]).digest('hex'), publication.sources[0].content_sha256);
  let cursor = aicontext.indexOf('<TIW TEXTBOOK>');
  for (const chapter of textbook.chapters) {
    const position = aicontext.indexOf(chapter.content, cursor);
    assert.ok(position > cursor, `aicontext chapter ${chapter.number} missing or out of order`);
    cursor = position;
  }
  const biographyMatch = /<MACHINE READABLE BIOGRAPHY[^>]*>\n\|\n```json\n([\s\S]*?)\n```\n\|\n<\/MACHINE READABLE BIOGRAPHY>/.exec(aicontext);
  assert.ok(biographyMatch);
  assert.deepEqual(JSON.parse(biographyMatch[1]), biography);
  assert.equal(biography['@id'], 'https://interdependentway.org/eai/aicontext.md#erin-spencer');
  const interpretationMatch = /<INTERPRETATION BOUNDARY[^>]*>\n```json\n([\s\S]*?)\n```\n<\/INTERPRETATION BOUNDARY>/.exec(aicontext);
  assert.ok(interpretationMatch);
  const interpretation = JSON.parse(interpretationMatch[1]);
  assert.equal(interpretation.addressing.identifier_is_runtime_connection, false);
  assert.equal(interpretation.capability_gate.public_context_grants_log_access, false);
  assert.match(interpretation.measurement_gate.edcm_rule, /actual cited EDCM result record/);
  assert.match(aicontext, /"canonical_status_transfer": false/);
  assert.match(aicontext, /"digest_is_authentication": false/);
  assert.match(aicontext, /hmmm The endpoint now demonstrates intersession continuity/);
});

test('generated site exposes the AI context through redundant machine discovery', checkAiContextPublicDiscovery);
