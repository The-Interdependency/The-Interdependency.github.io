import { readFile } from 'node:fs/promises';
import yaml from 'js-yaml';

// === MODULE_BUILD ===
// id: article_lab_research_data_adapter
//   module_name: research_data
//   module_kind: adapter
//   summary: Loads the reviewed research source and claim ledgers into one explicit Eleventy global-data object.
//   owner: Erin Spencer
//   public_surface: research_data.sources, research_data.claims
//   internal_surface: readYamlList
//   auth_boundary: none
//   storage_boundary: read
//   network_boundary: none
//   user_data_boundary: none
//   admin_only: false
//   tests: tests/research-ledger.test.mjs, tests/generated-site.test.mjs
//   rollout: loaded automatically by Eleventy from src/_data/research_data.js
//   rollback: restore direct template access after proving nested YAML data resolution
// === END MODULE_BUILD ===
// Usage: reference `research_data.sources` and `research_data.claims` in Nunjucks templates.
// Limits: this adapter exposes reviewed ledger content only; it does not infer stance, truth, or source relevance.

// === BOUNDARIES ===
// id: article_lab_research_data_storage_boundary
//   summary: Reads two repository-owned YAML ledgers during static-site generation and returns parsed arrays.
//   auth_boundary: none
//   storage_boundary: read
//   network_boundary: none
//   user_data_boundary: none
//   admin_only: false
//   pii: none
//   secrets: none
//   side_effects: none
//   owner: Erin Spencer
// === END BOUNDARIES ===

async function readYamlList(path) {
  const parsed = yaml.load(await readFile(path, 'utf8'));
  if (!Array.isArray(parsed)) throw new TypeError(`${path} must contain a YAML list`);
  return parsed;
}

export default async function researchData() {
  const [sources, claims] = await Promise.all([
    readYamlList('src/_data/research/sources.yml'),
    readYamlList('src/_data/research/claims.yml')
  ]);
  return { sources, claims };
}
