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
