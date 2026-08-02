// Usage: run `node --test tests/llms-build.test.mjs`; it verifies declaration parsing, fenced-example exclusion, visible unknowns, and committed llms.txt drift without network access.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { collectLlmsEntries, generateLlms, parseLlmsText } from '../scripts/build-llms.mjs';

// === CHECKS ===
// id: check_llms_root_generated_from_declarations
//   proves: llms_root_generated_from_declarations
//   call: self::checkLlmsRootGeneratedFromDeclarations
//   requires: node
//   timeout: 10
//   mutates: none
//   cleanup: none
//
// id: check_llms_markdown_examples_ignored
//   proves: llms_markdown_examples_ignored
//   call: self::checkLlmsMarkdownExamplesIgnored
//   requires: node
//   timeout: 10
//   mutates: none
//   cleanup: none
//
// id: check_llms_unknowns_visible
//   proves: llms_unknowns_visible
//   call: self::checkLlmsUnknownsVisible
//   requires: node
//   timeout: 10
//   mutates: none
//   cleanup: none
// === END CHECKS ===

export async function checkLlmsRootGeneratedFromDeclarations() {
  const generated = generateLlms(await collectLlmsEntries('.'));
  assert.equal(await readFile('llms.txt', 'utf8'), generated);
  assert.match(generated, /machine entry point is `\/eai\/aicontext\.md`/);
  assert.match(generated, /EDCM claim requires an actual cited EDCM result record/);
}

export function checkLlmsMarkdownExamplesIgnored() {
  const fixture = '# before\n```text\n# === LLMS ===\n# id: project_overview\n#   content: counterfeit\n# === END LLMS ===\n```\n';
  assert.deepEqual(parseLlmsText(fixture, '#', 'fixture.md'), []);
}

export function checkLlmsUnknownsVisible() {
  const generated = generateLlms([], 'fixture');
  assert.match(generated, /## Project Overview\nhmmm/);
  assert.match(generated, /\*\*hmmm\*\* = hmmm/);
  assert.match(generated, /## How to Use This Repo with LLMs \/ Agents\nhmmm/);
}

test('root llms.txt is generated from colocated declarations', checkLlmsRootGeneratedFromDeclarations);
test('Markdown fenced examples cannot become LLM declarations', checkLlmsMarkdownExamplesIgnored);
test('missing LLM declarations remain visible as hmmm', checkLlmsUnknownsVisible);
