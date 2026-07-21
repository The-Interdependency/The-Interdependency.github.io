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
