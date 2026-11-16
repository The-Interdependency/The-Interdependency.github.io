import markdownIt from 'markdown-it';
import { resolveRepositoryImageReference } from './repository-markdown-links.mjs';

function resolveSourceReference(value, sourceUrl) {
  const reference = String(value || '');
  if (!sourceUrl || !reference || reference.startsWith('//')) return reference;
  if (/^[a-z][a-z0-9+.-]*:/i.test(reference)) return reference;
  if (reference.startsWith('#')) return sourceUrl + reference;
  if (reference.startsWith('/')) {
    try {
      const source = new URL(sourceUrl);
      const parts = source.pathname.split('/').filter(Boolean);
      if (parts[2] === 'blob' && parts[3]) return source.origin + '/' + parts.slice(0, 4).join('/') + reference;
    } catch {}
  }
  try { return new URL(reference, sourceUrl).href; }
  catch { return reference; }
}

function createProjectMarkdownRenderer() {
  const md = markdownIt({ html: false, linkify: true, typographer: true });
  const linkOpen = md.renderer.rules.link_open || ((tokens, index, options, _env, self) => self.renderToken(tokens, index, options));
  md.renderer.rules.link_open = (tokens, index, options, env, self) => {
    const hrefIndex = tokens[index].attrIndex('href');
    if (hrefIndex >= 0) tokens[index].attrs[hrefIndex][1] = resolveSourceReference(tokens[index].attrs[hrefIndex][1], env?.sourceUrl);
    return linkOpen(tokens, index, options, env, self);
  };
  const image = md.renderer.rules.image || ((tokens, index, options, _env, self) => self.renderToken(tokens, index, options));
  md.renderer.rules.image = (tokens, index, options, env, self) => {
    const srcIndex = tokens[index].attrIndex('src');
    if (srcIndex >= 0) tokens[index].attrs[srcIndex][1] = resolveRepositoryImageReference(tokens[index].attrs[srcIndex][1], env?.sourceUrl);
    return image(tokens, index, options, env, self);
  };
  return md;
}

const projectMarkdown = createProjectMarkdownRenderer();

export function browserRepositoryProjection(projection) {
  const render = document => {
    if (!document) return null;
    const { content, ...publicDocument } = document;
    return {
      ...publicDocument,
      html: projectMarkdown.render(String(content || ''), { sourceUrl: document.sourceUrl })
    };
  };
  return {
    ...projection,
    documentation: projection.documentation ? {
      ...projection.documentation,
      readme: render(projection.documentation.readme),
      documents: (projection.documentation.documents || []).map(render)
    } : null
  };
}
