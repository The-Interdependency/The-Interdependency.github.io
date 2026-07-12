import { constants } from 'node:fs';
import { readdir, open, writeFile, mkdir } from 'node:fs/promises';
import { join, relative, basename, extname } from 'node:path';
import { createHash } from 'node:crypto';

const ignored = new Set(['.git', 'node_modules', '_site']);
const ignoredArtifactDirectories = new Set(['src/artifacts']);
const safeTextExtensions = new Set(['.md', '.txt', '.json', '.yml', '.yaml', '.csv', '.html', '.svg']);
const maxExcerptBytes = 4096;
const noFollow = constants.O_NOFOLLOW || 0;

async function findArtifactDirs(root = '.') {
  const found = [];
  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || ignored.has(entry.name)) continue;
      const fullPath = join(dir, entry.name);
      if (/^artifacts?$/i.test(entry.name) && !ignoredArtifactDirectories.has(fullPath)) found.push(fullPath);
      await walk(fullPath);
    }
  }
  await walk(root);
  return found.sort();
}

async function readOpenedFile(fullPath) {
  let handle;
  try {
    handle = await open(fullPath, constants.O_RDONLY | noFollow);
    const info = await handle.stat();
    if (!info.isFile()) return null;
    const buffer = await handle.readFile();
    return { info, buffer };
  } catch (error) {
    if (['ENOENT', 'EISDIR', 'ELOOP'].includes(error.code)) return null;
    throw error;
  } finally {
    await handle?.close();
  }
}

async function listFiles(dir) {
  const files = [];
  async function walk(current) {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }
      const opened = await readOpenedFile(fullPath);
      if (!opened) continue;
      const { info, buffer } = opened;
      const extension = extname(entry.name).toLowerCase();
      const textSafe = safeTextExtensions.has(extension);
      files.push({
        name: entry.name,
        path: relative('.', fullPath),
        relativePath: relative(dir, fullPath),
        extension: extension || 'none',
        sizeBytes: buffer.length,
        modifiedAt: info.mtime.toISOString(),
        sha256: createHash('sha256').update(buffer).digest('hex'),
        textSafe,
        excerpt: textSafe ? buffer.subarray(0, maxExcerptBytes).toString('utf8') : null,
        truncated: textSafe && buffer.length > maxExcerptBytes
      });
    }
  }
  await walk(dir);
  return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

const directories = [];
for (const dir of await findArtifactDirs()) {
  directories.push({
    name: basename(dir),
    path: relative('.', dir),
    files: await listFiles(dir)
  });
}

const inventory = {
  generatedAt: new Date().toISOString(),
  directories,
  directoryCount: directories.length,
  fileCount: directories.reduce((sum, dir) => sum + dir.files.length, 0),
  hmmm: directories.length
    ? []
    : ['No folder named artifact or artifacts was found in this repository checkout. The page remains live and will populate when such a folder is added.']
};

await mkdir('src/_data/generated', { recursive: true });
await writeFile('src/_data/generated/artifacts.json', `${JSON.stringify(inventory, null, 2)}\n`);
console.log(`artifacts ${inventory.directoryCount} directories ${inventory.fileCount} files`);
