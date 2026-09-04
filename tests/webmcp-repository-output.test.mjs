import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';


test('repository changes invalidate stale human-visible output', async () => {
  const source = await readFile('src/assets/js/webmcp.js', 'utf8');
  const handlerStart = source.indexOf("repositorySelect?.addEventListener('change'");
  const handlerEnd = source.indexOf("document.querySelector('[data-selected-action=\"inspect\"]')", handlerStart);
  assert.ok(handlerStart >= 0 && handlerEnd > handlerStart);

  const handler = source.slice(handlerStart, handlerEnd);
  assert.match(handler, /clearSelectedSkill\(\)/);
  assert.match(handler, /showHumanMessage\(/);
  assert.match(handler, /Previous skill or handoff output cleared/);
  assert.ok(
    handler.indexOf('showHumanMessage(') < handler.indexOf('setSkillStageEnabled(repository)'),
    'stale output must be replaced before the new repository skill stage is presented'
  );
});


test('invalidated async submits cannot overwrite current output or status', async () => {
  const source = await readFile('src/assets/js/webmcp.js', 'utf8');

  assert.match(source, /let handoffRevision = 0;/);
  assert.match(source, /const invalidatePublishedHandoff = reason => \{\s*handoffRevision \+= 1;\s*clearPublishedHandoff\(reason\);/s);
  assert.match(source, /const submissionRevision = \+\+handoffRevision;/);
  assert.match(source, /const published = await publishHandoffTool\(handoff\);\s*if \(handoffRevision !== submissionRevision\) return;/s);
  assert.match(
    source,
    /if \(controller\.signal\.aborted \|\| handoffController !== controller \|\| currentHandoff !== handoff\) return false;/
  );
});
