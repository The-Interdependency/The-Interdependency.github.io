// Usage: run after `npm run build`; verifies the public artifact binds every displayed chapter to its exact source identity.
// Evidence boundary: confirms build provenance fields, not the substantive truth or cross-repository status of chapter claims.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('public build identity binds chapters zero through seven to source commits', async () => {
  const build = JSON.parse(await readFile('_site/build.json', 'utf8'));
  const textbook = JSON.parse(await readFile('src/_data/generated/textbook.json', 'utf8'));
  assert.equal(build.distributedTextbook.schema, 'interdependency.distributed-textbook/1.0.0');
  assert.equal(build.distributedTextbook.chapterCount, 8);
  assert.equal(build.distributedTextbook.complete, true);
  assert.equal(build.distributedTextbook.fallback, false);
  assert.equal(build.distributedTextbook.chapters.length, 8);

  for (let number = 0; number < 8; number += 1) {
    const publicChapter = build.distributedTextbook.chapters[number];
    const generatedChapter = textbook.chapters[number];
    assert.deepEqual(
      [publicChapter.number, publicChapter.slug, publicChapter.repository, publicChapter.path],
      [generatedChapter.number, generatedChapter.slug, generatedChapter.repository, generatedChapter.path]
    );
    assert.match(publicChapter.commit, /^[a-f0-9]{40}$/);
    assert.match(publicChapter.blob, /^[a-f0-9]{40}$/);
    assert.match(publicChapter.contentSha256, /^[a-f0-9]{64}$/);
    assert.equal(publicChapter.fallback, false);
  }
});
