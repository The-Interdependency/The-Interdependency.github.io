// Usage: run `node --test tests/canon-parser.test.mjs` from the repository root.
// Evidence boundary: these fixtures witness parser structure and note splitting; they do not prove editorial completeness.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { extractNotes, parseCanon } from '../scripts/canon-parser.mjs';

test('Markdown recovery headings normalize to plain-canon parent levels', () => {
  const data = parseCanon(`# The Interdependent Way\n## Subtitle\n### Rights and Definitions of The Way\n#### Article One\nBody.\n[1] note one\n#### Article Two\nBody two.`);
  const articleOne = data.units.find(unit => unit.title === 'Article One');
  assert.equal(articleOne.level, 3);
  assert.equal(articleOne.sourceLevel, 4);
  assert.equal(articleOne.section, 'rights-and-definitions-of-the-way');
  assert.ok(data.sections.some(section => section.id === 'rights-and-definitions-of-the-way' && section.level === 2));
});

test('Interdefinables owns the Human consciousness hierarchy until Preamble', () => {
  const data = parseCanon(`The Interdependent Way\n\nAwakening\nOpening.\n\nThe Interdefinables\nDefinitions.\n\nHuman consciousness emerges from\nBinary essences meaningfully, divided; then, rooted.\nBody.\nTrinary perceptual focal states of complex system spirals: mind (body) soul\nBody.\nPreamble\nCivic claim.`);
  const interdefinables = data.units.find(unit => unit.title === 'The Interdefinables');
  const human = data.units.find(unit => unit.title === 'Human consciousness emerges from');
  const binary = data.units.find(unit => unit.title.startsWith('Binary essences'));
  const trinary = data.units.find(unit => unit.title.startsWith('Trinary perceptual'));
  const preamble = data.units.find(unit => unit.title === 'Preamble');

  assert.equal(interdefinables.level, 2);
  assert.equal(human.level, 3);
  assert.equal(human.section, 'interdefinables');
  assert.equal(human.parentId, interdefinables.id);
  assert.equal(binary.level, 4);
  assert.equal(binary.section, 'interdefinables');
  assert.equal(binary.parentId, human.id);
  assert.equal(trinary.level, 4);
  assert.equal(trinary.parentId, human.id);
  assert.equal(preamble.level, 2);
  assert.equal(preamble.section, 'preamble');
  assert.equal(data.sections.some(section => /^Human consciousness/.test(section.title)), false);
  assert.ok(data.sections.findIndex(section => section.title === 'The Interdefinables') < data.sections.findIndex(section => section.title === 'Preamble'));
  assert.ok(data.edges.some(edge => edge.type === 'heading-parent' && edge.from === human.id && edge.to === interdefinables.id));
});

test('legacy Markdown title levels cannot promote Human consciousness to a peer section', () => {
  const data = parseCanon(`# The Interdependent Way\n### The Interdefinables\nDefinitions.\n### Human consciousness emerges from:\n#### Binary essences meaningfully divided, then rooted:\nBody.\n### Preamble\nCivic claim.`);
  const interdefinables = data.units.find(unit => unit.title === 'The Interdefinables');
  const human = data.units.find(unit => /^Human consciousness/.test(unit.title));
  const binary = data.units.find(unit => unit.title.startsWith('Binary essences'));
  const preamble = data.units.find(unit => unit.title === 'Preamble');

  assert.equal(human.sourceLevel, 3);
  assert.equal(human.level, 3);
  assert.equal(human.section, 'interdefinables');
  assert.equal(human.parentId, interdefinables.id);
  assert.equal(binary.sourceLevel, 4);
  assert.equal(binary.level, 4);
  assert.equal(binary.parentId, human.id);
  assert.equal(preamble.sourceLevel, 3);
  assert.equal(preamble.level, 2);
  assert.equal(preamble.section, 'preamble');
});

test('multiple superscript note definitions on one physical line remain distinct', () => {
  assert.deepEqual(extractNotes('>¹ first tension ² second tension ³ third tension'), [
    { marker: '¹', text: 'first tension' },
    { marker: '²', text: 'second tension' },
    { marker: '³', text: 'third tension' }
  ]);
});

test('the checked-in recovery mirror yields correctly parented rights articles', async () => {
  const mirror = await readFile('canon/the_interdependent_way.md', 'utf8');
  const data = parseCanon(mirror, { repository: 'recovery', fallback: true });
  const rights = data.sections.find(section => /^Rights and Definitions/.test(section.title));
  assert.ok(rights);
  for (const title of ['Article One', 'Article Two', 'Article Three', 'Article Four', 'Article Five', 'Article Six', 'Article Seven', 'Article Eight']) {
    assert.ok(data.units.some(unit => unit.title === title && unit.section === rights.id), `${title} missing from recovery rights section`);
  }
});

test('body lines beginning with a digit are not mistaken for numbered notes', () => {
  const parsed = parseCanon('The Interdependent Way\n\nAwakening\n5d explodes out of 4d.');
  const awakening = parsed.units.find(unit => unit.title === 'Awakening');
  assert.ok(awakening);
  assert.equal(awakening.notes.length, 0);
});
