// === MODULE_BUILD ===
// id: llms_instruction_builder
//   module_name: build-llms
//   module_kind: instrument
//   summary: Generates and drift-checks the canonical root llms.txt from repository-local msdmd LLMS declarations.
//   owner: Erin Spencer
//   public_surface: npm run build:llms, npm run check:llms
//   internal_surface: parseLlmsText, collectLlmsEntries, generateLlms
//   auth_boundary: none
//   storage_boundary: write
//   network_boundary: none
//   user_data_boundary: none
//   admin_only: false
//   tests: tests/llms-build.test.mjs
//   rollout: check:llms is required by npm run check; build:llms intentionally applies reviewed declaration changes
//   rollback: remove the runner, its package scripts and tests, llms.txt passthrough, and root llms.txt together
// === END MODULE_BUILD ===
// Usage: edit `LLMS` declarations beside their owning module, run `npm run build:llms`, inspect `llms.txt`, then run `npm run check:llms`; never hand-edit generated doctrine independently.

// === BOUNDARIES ===
// id: llms_instruction_builder_boundary
//   summary: Reads repository source declarations and writes only the root llms.txt when explicitly invoked with --apply.
//   auth_boundary: none
//   storage_boundary: write
//   network_boundary: none
//   user_data_boundary: none
//   admin_only: false
//   pii: none
//   secrets: none
//   side_effects: root llms.txt replacement on --apply
//   owner: Erin Spencer
// === END BOUNDARIES ===

// === CONTRACTS ===
// id: llms_root_generated_from_declarations
//   given: repository source files contain msdmd LLMS entries and the builder runs
//   then: llms.txt is generated deterministically from project_overview, key_definitions, architecture_summary, and usage_rules entries
//   class: doctrine
//
// id: llms_markdown_examples_ignored
//   given: a Markdown fenced-code example contains LLMS fence text
//   then: the example contributes no declaration to llms.txt
//   class: correctness
//
// id: llms_unknowns_visible
//   given: a required LLMS entry is absent
//   then: the generated section contains hmmm rather than invented content
//   class: safety
// === END CONTRACTS ===

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const markerByExtension = new Map([
  ['.md', '#'], ['.markdown', '#'], ['.py', '#'], ['.rb', '#'], ['.sh', '#'],
  ['.ts', '//'], ['.tsx', '//'], ['.js', '//'], ['.jsx', '//'], ['.mjs', '//'],
  ['.rs', '//'], ['.go', '//'], ['.java', '//'], ['.c', '//'], ['.cpp', '//'],
  ['.swift', '//'], ['.kt', '//'], ['.sql', '--'], ['.lua', '--'], ['.hs', '--']
]);
const skippedDirectories = new Set([
  '.git', '.venv', '.pytest_cache', '.mypy_cache', '.next', '.nuxt', '.tox',
  '__pycache__', '_site', 'build', 'dist', 'node_modules', 'target', 'test-results', 'tests', 'venv'
]);

function markdownWithoutFencedCode(text) {
  let inFence = false;
  return text.split(/\r?\n/).map(line => {
    const trimmed = line.trimStart();
    if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
      inFence = !inFence;
      return '';
    }
    return inFence ? '' : line;
  }).join('\n');
}

export function parseLlmsText(text, marker = '#', source = '<memory>') {
  const prepared = /\.md(?:own)?$/i.test(source) ? markdownWithoutFencedCode(text) : text;
  const entries = [];
  let inBlock = false;
  let current = null;
  let currentField = null;
  const opening = `${marker} === LLMS ===`;
  const closing = `${marker} === END LLMS ===`;
  const prefix = `${marker} `;

  const emit = () => {
    if (current) entries.push(current);
    current = null;
    currentField = null;
  };

  for (const rawLine of prepared.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === opening) {
      emit();
      inBlock = true;
      continue;
    }
    if (line === closing && inBlock) {
      emit();
      inBlock = false;
      continue;
    }
    if (!inBlock || !line.startsWith(prefix)) continue;
    const body = line.slice(prefix.length);
    if (body.startsWith('id:')) {
      emit();
      current = { source, id: body.slice(3).trim(), fields: {} };
      continue;
    }
    if (!current) continue;
    if (!body) {
      if (currentField) current.fields[currentField] += '\n';
      continue;
    }
    if (body.startsWith('  ') && body.includes(':')) {
      const separator = body.indexOf(':');
      currentField = body.slice(0, separator).trim();
      current.fields[currentField] = body.slice(separator + 1).trim();
      continue;
    }
    if (body.startsWith('    ') && currentField) {
      current.fields[currentField] += `\n${body.slice(4)}`;
    }
  }
  if (inBlock) emit();
  return entries;
}

async function sourceFiles(root) {
  const files = [];
  async function walk(directory) {
    const children = await readdir(directory, { withFileTypes: true });
    children.sort((left, right) => left.name.localeCompare(right.name));
    for (const child of children) {
      if (child.isDirectory()) {
        if (!skippedDirectories.has(child.name)) await walk(join(directory, child.name));
      } else if (child.isFile() && markerByExtension.has(extname(child.name).toLowerCase())) {
        files.push(join(directory, child.name));
      }
    }
  }
  await walk(root);
  return files;
}

export async function collectLlmsEntries(root = '.') {
  const absoluteRoot = resolve(root);
  const entries = [];
  for (const path of await sourceFiles(absoluteRoot)) {
    const extension = extname(path).toLowerCase();
    const source = relative(absoluteRoot, path);
    entries.push(...parseLlmsText(await readFile(path, 'utf8'), markerByExtension.get(extension), source));
  }
  return entries;
}

function contentFor(entries, id) {
  const values = entries
    .filter(entry => entry.id === id && entry.fields.content?.trim())
    .map(entry => entry.fields.content.trim());
  return values.length ? values.join('\n\n') : 'hmmm';
}

export function generateLlms(entries, repositoryName = 'The-Interdependency.github.io') {
  const definitions = entries
    .filter(entry => entry.id === 'key_definitions')
    .flatMap(entry => Object.entries(entry.fields))
    .filter(([key]) => key !== 'content')
    .map(([key, value]) => `- **${key}** = ${value.trim() || 'hmmm'}`);
  return [
    `# LLM Instructions for ${repositoryName}`,
    '',
    '## Project Overview',
    contentFor(entries, 'project_overview'),
    '',
    '## Key Definitions (never infer or expand these)',
    definitions.length ? definitions.join('\n') : '- **hmmm** = hmmm',
    '',
    '## Architecture Summary',
    contentFor(entries, 'architecture_summary'),
    '',
    '## How to Use This Repo with LLMs / Agents',
    contentFor(entries, 'usage_rules'),
    '',
    'This file is the single source of truth. If something is not explicitly stated in the files listed above, it does not exist in this repository.',
    ''
  ].join('\n');
}

async function main() {
  const root = resolve('.');
  const outputPath = join(root, 'llms.txt');
  const generated = generateLlms(await collectLlmsEntries(root));
  if (process.argv.includes('--apply')) {
    await writeFile(outputPath, generated, 'utf8');
    console.log(`wrote ${outputPath}`);
  }
  if (process.argv.includes('--check')) {
    const current = await readFile(outputPath, 'utf8').catch(() => null);
    if (current !== generated) throw new Error(`llms-build drift: ${outputPath} differs from LLMS declarations`);
    console.log('llms-build drift: pass');
  } else if (!process.argv.includes('--apply')) {
    process.stdout.write(generated);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
