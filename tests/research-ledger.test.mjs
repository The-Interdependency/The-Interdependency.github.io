import test from 'node:test';import assert from 'node:assert/strict';import { readFile } from 'node:fs/promises';import yaml from 'js-yaml';
test('research ledgers parse', async()=>{assert.ok(Array.isArray(yaml.load(await readFile('src/_data/research/sources.yml','utf8'))));assert.ok(Array.isArray(yaml.load(await readFile('src/_data/research/claims.yml','utf8'))));});
