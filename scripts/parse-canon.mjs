import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { parseCanon } from './canon-parser.mjs';

// === MODULE_BUILD ===
// id: canon_structure_materializer
//   module_name: parse-canon
//   module_kind: worker
//   summary: Reads the selected canon snapshot and writes provenance-bearing generated canon data.
//   owner: Erin Spencer
//   public_surface: npm run refresh:canon
//   internal_surface: parseCanon invocation and generated JSON write
//   auth_boundary: none
//   storage_boundary: write
//   network_boundary: none
//   user_data_boundary: none
//   admin_only: false
//   tests: tests/canon-parser.test.mjs, tests/canon-integrity.test.mjs
//   rollout: invoked after scripts/fetch-canon.mjs in refresh:data
//   rollback: restore the previous parser implementation and generated-data contract
// === END MODULE_BUILD ===
// Usage: run `npm run refresh:canon`; inspect `src/_data/generated/canon.json` and its source provenance.
// Limits: this materializer trusts only the selected snapshot and does not decide whether interpretation is canon.

// === BOUNDARIES ===
// id: canon_materialization_boundary
//   summary: Reads canon snapshots and writes generated canon JSON.
//   auth_boundary: none
//   storage_boundary: write
//   network_boundary: none
//   user_data_boundary: none
//   admin_only: false
//   pii: none
//   secrets: none
//   side_effects: generated canon file
//   owner: Erin Spencer
// === END BOUNDARIES ===

const provenance = JSON.parse(await readFile('src/_data/snapshots/canon.provenance.json', 'utf8'));
const raw = await readFile('src/_data/snapshots/canon.last-known-good.md', 'utf8');
const text = raw.replace(/^---\n[\s\S]*?\n---\n/, '');
const data = parseCanon(text, provenance);

await mkdir('src/_data/generated', { recursive: true });
await writeFile('src/_data/generated/canon.json', JSON.stringify(data, null, 2));
console.log(`units ${data.units.length}; notes ${data.notes.length}; longest route ${Math.max(...data.units.map(unit => unit.routeSlug.length))}`);
