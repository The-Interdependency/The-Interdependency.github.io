import test from 'node:test';import assert from 'node:assert/strict';import { readFile } from 'node:fs/promises';
test('repo route count equals public repo count', async()=>{const r=JSON.parse(await readFile('src/_data/generated/repos.json','utf8'));assert.equal(r.publicRepoCount,r.generatedRouteCount);assert.equal(new Set(r.repositories.map(x=>x.slug)).size,r.repositories.length);});
