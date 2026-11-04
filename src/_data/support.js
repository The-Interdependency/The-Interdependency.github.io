// Usage: Eleventy loads this default-only data module to validate and render the
// owner-approved public snapshot. Keep named utility exports outside _data:
// Eleventy treats mixed named/default exports as an object, not a data function.
import { readFile } from 'node:fs/promises';
import { createSupportView } from '../../scripts/support-snapshot.mjs';

export default async function support() {
  return createSupportView(JSON.parse(await readFile(new URL('./supportSnapshot.json', import.meta.url), 'utf8')));
}
