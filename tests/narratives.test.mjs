import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const narrative = JSON.parse(await readFile('src/_data/jack_and_diane.json', 'utf8'));

test('Jack and Diane narrative is structured, fictional, and canon-bounded', () => {
  assert.equal(narrative.schema, 'interdependency.living-narrative/1.0.0');
  assert.equal(narrative.id, 'jack-and-diane');
  assert.equal(narrative.status, 'fictional interpretation');
  assert.equal(narrative.canonContact.source, 'wayseer00/main:canon/INTERDEPENDENT_WAY.txt');
  assert.match(narrative.canonContact.boundary, /fiction/i);
  assert.match(narrative.editorialBoundary.threshold, /does not establish adulthood/i);
  assert.match(narrative.editorialBoundary.civil, /remain minors/i);
  assert.match(narrative.editorialBoundary.incompletion, /physical maturity/i);
});

test('the two journal keepers and every entry preserve identity and order', () => {
  assert.deepEqual(narrative.characters.map(({ id, age }) => [id, age]), [['jack', 14], ['diane', 13]]);
  const characterIds = new Set(narrative.characters.map(character => character.id));
  assert.ok(narrative.entries.length >= 8);
  assert.deepEqual(narrative.entries.map(entry => entry.sequence), narrative.entries.map((_, index) => index + 1));
  for (const entry of narrative.entries) {
    assert.ok(characterIds.has(entry.author), `unknown author ${entry.author}`);
    assert.ok(entry.title?.trim());
    assert.ok(entry.body.length >= 2);
    assert.ok(entry.evidence.length >= 2);
  }
});

test('the opening ledger leaves every unearned threshold visibly incomplete', () => {
  const criteria = new Map(narrative.criteria.map(item => [item.name, item.status]));
  assert.equal(criteria.get('Handwritten Articles'), 'complete');
  assert.equal(criteria.get('Original personal Preamble'), 'in progress');
  assert.equal(criteria.get('Self-sufficient interdependency'), 'not yet claimed');
  assert.equal(criteria.get('Political Circle'), 'not formed');
  assert.ok(narrative.continuationPrompts.length >= 5);
});

test('narrative templates expose fiction, civil, canon, and hmmm boundaries', async () => {
  const [index, story] = await Promise.all([
    readFile('src/narratives/index.njk', 'utf8'),
    readFile('src/narratives/jack-and-diane.njk', 'utf8')
  ]);
  assert.match(index, /do not count as research evidence/i);
  assert.match(story, /status-risk">not canon/);
  assert.match(story, /editorialBoundary\.civil/);
  assert.match(story, /canonContact\.source/);
  assert.match(story, /<section class="hmmm">/);
});
