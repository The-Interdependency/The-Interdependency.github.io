// Read repository-owned MSDMD bytes as data. Both the build and live refresh use this module.
import { parse } from 'acorn';

export const COLLECTION_BYTE_LIMIT = 32 * 1024 * 1024;
const RAW_ORIGIN = 'https://raw.githubusercontent.com';
const V2 = '2.0.0';
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);

export async function fetchCollection(repo, head) {
  if (!/^[\w.-]{1,100}$/.test(repo) || /^\.{1,2}$/.test(repo) || !/^[\da-f]{40}$/i.test(head)) {
    throw new Error('A repository name and exact Git commit are required');
  }
  const url = new URL('/The-Interdependency/' + repo + '/' + head + '/' + repo + '_msdmd.ts', RAW_ORIGIN);
  const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw Object.assign(new Error('Collection request returned HTTP ' + response.status), { status: response.status });
  const oversized = () => new Error('Collection exceeds the ' + COLLECTION_BYTE_LIMIT + '-byte reading limit');
  if (Number(response.headers?.get('content-length')) > COLLECTION_BYTE_LIMIT) {
    await response.body?.cancel();
    throw oversized();
  }
  // The response body is uncompressed by fetch. Count those bytes even for a chunked or compressed transfer.
  if (!response.body) {
    const bytes = new TextEncoder().encode(await response.text());
    if (bytes.length > COLLECTION_BYTE_LIMIT) throw oversized();
    return bytes;
  }
  const chunks = [];
  let length = 0;
  const reader = response.body.getReader();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > COLLECTION_BYTE_LIMIT) {
        await reader.cancel();
        throw oversized();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}

function literal(node, allowChunks = false) {
  if (node?.type === 'Literal' && !node.regex && !node.bigint) return node.value;
  if (node?.type === 'UnaryExpression' && node.operator === '-' && typeof node.argument?.value === 'number') return -node.argument.value;
  if (node?.type === 'ArrayExpression') return node.elements.map(item => literal(item));
  if (node?.type === 'ObjectExpression') {
    return Object.fromEntries(node.properties.map(prop => {
      if (prop.type !== 'Property' || prop.kind !== 'init' || prop.computed || prop.shorthand || prop.method) throw new Error('Expected a literal collection field');
      const key = prop.key.type === 'Identifier' ? prop.key.name : prop.key.value;
      if (typeof key !== 'string') throw new Error('Expected a string field name');
      return [key, literal(prop.value, allowChunks && key === 'facts')];
    }));
  }
  if (allowChunks && node?.type === 'CallExpression' && node.callee?.name === 'mergeMsdmdFactChunks') {
    return flattenFacts(node.arguments.map(arg => literal(arg)));
  }
  throw new Error('Collection contains a nonliteral expression');
}

function flattenFacts(chunks) {
  if (!Array.isArray(chunks) || !chunks.every(chunk => Array.isArray(chunk) && chunk.every(object))) {
    throw new Error('Expected arrays of native fact records');
  }
  return chunks.flat();
}

function decodeModule(text) {
  // Fast path for the canonical generator. Its JSON strings cannot contain literal line breaks.
  // Accept its exact top-level facts wrapper here. Other layouts go through the data-only AST reader below.
  const prefix = /^import \{ defineMsdmdCollectionV2(?:, mergeMsdmdFactChunks)? \} from "[^"\r\n]+";\r?\n\s*export default defineMsdmdCollectionV2\(/;
  const start = prefix.exec(text);
  if (start && text.endsWith(');')) {
    let json = text.slice(start[0].length, -2);
    const chunkStart = /^  "facts": mergeMsdmdFactChunks\(\r?$/m;
    try {
      if (!chunkStart.test(json)) return { collection: JSON.parse(json), version: V2 };
      json = json.replace(chunkStart, '  "facts": [').replace(/^  \)(,?)\r?$/m, '  ]$1');
      const collection = JSON.parse(json);
      collection.facts = flattenFacts(collection.facts);
      return { collection, version: V2 };
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
    }
  }
  const module = parse(text, { ecmaVersion: 2024, sourceType: 'module' });
  const statements = module.body.filter(item => item.type !== 'ImportDeclaration' && item.type !== 'EmptyStatement');
  const declaration = statements[0]?.declaration;
  // Some hand-authored collections bind the exported collection to a named constant.
  const call = declaration?.type === 'VariableDeclaration' && declaration.declarations.length === 1
    ? declaration.declarations[0].init : declaration;
  const helper = call?.callee?.name;
  if (statements.length !== 1 || !['ExportDefaultDeclaration', 'ExportNamedDeclaration'].includes(statements[0]?.type)
    || call?.type !== 'CallExpression' || call.arguments.length !== 1 || call.arguments[0].type !== 'ObjectExpression'
    || !['defineMsdmdCollection', 'defineMsdmdCollectionV2'].includes(helper)) throw new Error('Unsupported MSDMD module');
  const version = helper === 'defineMsdmdCollectionV2' ? V2 : '1.0.0';
  return { collection: literal(call.arguments[0], version === V2), version };
}

export function parseCollectionText(input) {
  const text = String(input).trim();
  const { collection: c, version } = text.startsWith('{') ? { collection: JSON.parse(text) } : decodeModule(text);
  const schema = c?.schema_version ?? '1.0.0';
  if (!object(c) || !['1.0.0', V2].includes(schema) || (version && schema !== version)) throw new Error('Unsupported MSDMD collection version');
  const arrays = schema === V2
    ? ['declarations', 'gaps', 'edges', 'facts', 'reader_manifests', 'reader_runs', 'discovery', 'conflicts', 'diagnostics']
    : ['declarations', 'gaps', ...(c.edges === undefined ? [] : ['edges'])];
  if (!c.repo || !arrays.every(key => Array.isArray(c[key]) && c[key].every(object))) throw new Error('Incomplete MSDMD collection');
  if (schema === V2 && (c.schema !== 'the-interdependency.msdmd-collection'
    || c.source?.repository !== c.repo || c.coverage?.native_facts !== c.facts.length
    || c.coverage?.supplemental_declarations !== c.declarations.length)) throw new Error('Schema-2 identity or coverage disagrees with its records');
  return c;
}

export function matchesRepository(c, name) {
  return c.repo === name || c.repo === 'The-Interdependency/' + name;
}

export function collectionCounts(c) {
  return {
    declarations: c.declarations.length, gaps: c.gaps.length, edges: c.edges?.length ?? 0,
    nativeFacts: c.facts?.length ?? null, diagnostics: c.diagnostics?.length ?? null,
    conflicts: c.conflicts?.length ?? null
  };
}
