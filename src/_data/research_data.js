import { readFile } from 'node:fs/promises';
import yaml from 'js-yaml';

// === MODULE_BUILD ===
// id: article_lab_research_data_adapter
//   module_name: research_data
//   module_kind: adapter
//   summary: Loads manifest-declared reviewed research source and claim ledgers into one explicit Eleventy global-data object.
//   owner: Erin Spencer
//   public_surface: research_data.sources, research_data.claims
//   internal_surface: validateLedgerPaths, readYamlList, readYamlLedgers
//   auth_boundary: none
//   storage_boundary: read the repository-owned research manifest and its declared YAML ledgers
//   network_boundary: none
//   user_data_boundary: none
//   admin_only: false
//   tests: tests/research-ledger.test.mjs, tests/generated-site.test.mjs
//   rollout: loaded automatically by Eleventy from src/_data/research_data.js
//   rollback: restore direct two-file reads and remove the manifest-declared tranche files
// === END MODULE_BUILD ===
// Usage: add a repository-local YAML ledger path to ledger-manifest.json, then reference `research_data.sources` and `research_data.claims` in Nunjucks templates.
// Limits: this adapter exposes reviewed ledger content only; it does not infer stance, truth, source relevance, or evidentiary weight.

// === BOUNDARIES ===
// id: article_lab_research_data_storage_boundary
//   summary: Reads allowlisted repository-local YAML ledgers during static-site generation and returns parsed arrays.
//   auth_boundary: none
//   storage_boundary: read beneath src/_data/research only
//   network_boundary: none
//   user_data_boundary: none
//   admin_only: false
//   pii: none
//   secrets: none
//   side_effects: none
//   owner: Erin Spencer
// === END BOUNDARIES ===

const manifestPath = 'src/_data/research/ledger-manifest.json';
const ledgerPathPattern = /^src\/_data\/research\/[a-z0-9][a-z0-9.-]*\.yml$/;

function validateLedgerPaths(paths, kind) {
  if (!Array.isArray(paths) || paths.length === 0) throw new TypeError(`${kind} ledger manifest must contain at least one path`);
  if (new Set(paths).size !== paths.length) throw new TypeError(`${kind} ledger manifest paths must be unique`);
  for (const path of paths) {
    if (typeof path !== 'string' || !ledgerPathPattern.test(path)) {
      throw new TypeError(`${kind} ledger path must remain beneath src/_data/research and end in .yml: ${String(path)}`);
    }
  }
  return paths;
}

async function readYamlList(path) {
  const parsed = yaml.load(await readFile(path, 'utf8'));
  if (!Array.isArray(parsed)) throw new TypeError(`${path} must contain a YAML list`);
  return parsed;
}

async function readYamlLedgers(paths, kind) {
  const validatedPaths = validateLedgerPaths(paths, kind);
  const ledgers = await Promise.all(validatedPaths.map(readYamlList));
  return ledgers.flat();
}

export default async function researchData() {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) throw new TypeError(`${manifestPath} must contain a JSON object`);

  const [sources, claims] = await Promise.all([
    readYamlLedgers(manifest.sources, 'source'),
    readYamlLedgers(manifest.claims, 'claim')
  ]);

  return { sources, claims };
}
