// Usage: resolve repository-relative Markdown image references against raw.githubusercontent.com while ordinary links continue to target exact GitHub blob sources.
export function resolveRepositoryImageReference(value, sourceUrl) {
  const reference = String(value || '');
  if (!sourceUrl || !reference || reference.startsWith('//')) return reference;
  if (/^[a-z][a-z0-9+.-]*:/i.test(reference)) return reference;

  try {
    const source = new URL(sourceUrl);
    const parts = source.pathname.split('/').filter(Boolean);
    if (source.hostname !== 'github.com' || parts[2] !== 'blob' || !parts[3]) return reference;

    const [owner, repo, , head, ...sourcePath] = parts;
    const rawRoot = `https://raw.githubusercontent.com/${owner}/${repo}/${head}/`;
    if (reference.startsWith('/')) return new URL(reference.slice(1), rawRoot).href;
    if (reference.startsWith('#')) return sourceUrl + reference;

    const basePath = sourcePath.length ? sourcePath.join('/') : '';
    return new URL(reference, new URL(basePath, rawRoot)).href;
  } catch {
    return reference;
  }
}
