import test from 'node:test';import assert from 'node:assert/strict';import { readFile } from 'node:fs/promises';
test('canon data has provenance and units', async()=>{const c=JSON.parse(await readFile('src/_data/generated/canon.json','utf8'));assert.ok(c.source.contentSha256);assert.ok(c.units.length>0);for(const u of c.units) assert.ok(u.hash);});
