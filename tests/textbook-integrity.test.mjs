// Usage: run through `npm test`; OFFLINE=1 may produce metadata-only hmmm records when no retained snapshot exists.
// Evidence boundary: verifies source identity, order, hashes, and status labels; it does not validate each chapter's substantive claims.
import { createHash } from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const expected = [
  [0, 'chapter-zero', 'Meta Energy Theory — Axioms, Postulates, and Theorems', 'The-Interdependency/metapat', 'CHAPTER_ZERO.md'],
  [1, 'chapter-one', 'The Subtractive Foundations of the Unit Carrier', 'The-Interdependency/ucns', 'docs/chapter-1.md'],
  [2, 'chapter-two', 'Measurement Without Transfer', 'The-Interdependency/edcm', 'docs/chapter-2.md'],
  [3, 'chapter-three', 'Modules That Speak for Themselves', 'The-Interdependency/skill-lib', 'docs/chapter-3.md'],
  [4, 'chapter-four', 'Canon Without Inversion', 'The-Interdependency/interdependent-lib', 'docs/chapter-4.md'],
  [5, 'chapter-five', 'One Architecture, Four Layers', 'The-Interdependency/ptcna', 'docs/chapter-5.md'],
  [6, 'chapter-six', 'The Instrument', 'The-Interdependency/a0', 'docs/chapter-6.md'],
  [7, 'chapter-seven', 'The Echo', 'The-Interdependency/zfae', 'docs/chapter-7.md']
];

test('distributed textbook manifest and generated data preserve chapters zero through seven', async () => {
  const manifest = JSON.parse(await readFile('src/_data/textbook_sources.json', 'utf8'));
  const textbook = JSON.parse(await readFile('src/_data/generated/textbook.json', 'utf8'));

  assert.equal(textbook.schema, 'interdependency.distributed-textbook/1.0.0');
  assert.equal(textbook.chapterCount, 8);
  assert.equal(manifest.length, 8);
  assert.equal(textbook.chapters.length, 8);
  assert.equal(new Set(manifest.map(chapter => chapter.slug)).size, 8);
  assert.equal(new Set(manifest.map(chapter => `${chapter.repository}:${chapter.path}`)).size, 8);

  for (const [number, slug, title, repository, path] of expected) {
    const source = manifest[number];
    const chapter = textbook.chapters[number];
    assert.deepEqual(
      [source.number, source.slug, source.title, source.repository, source.path],
      [number, slug, title, repository, path]
    );
    assert.deepEqual(
      [chapter.number, chapter.slug, chapter.title, chapter.repository, chapter.path],
      [number, slug, title, repository, path]
    );
    assert.equal(chapter.branch, 'main');
    assert.ok(chapter.summary);
    assert.ok(chapter.status);
    assert.ok(chapter.sourceUrl?.startsWith(`https://github.com/${repository}/blob/`));

    if (chapter.content) {
      assert.ok(chapter.content.includes(title));
      assert.equal(createHash('sha256').update(chapter.content).digest('hex'), chapter.contentSha256);
      assert.match(chapter.contentSha256, /^[a-f0-9]{64}$/);
      if (!chapter.fallback) {
        assert.match(chapter.commit, /^[a-f0-9]{40}$/);
        assert.match(chapter.blob, /^[a-f0-9]{40}$/);
      }
    } else {
      assert.equal(chapter.fallback, true);
      assert.ok(chapter.retrievalError);
    }
  }

  assert.equal(textbook.chapters[7].status, 'theory under development');
});
