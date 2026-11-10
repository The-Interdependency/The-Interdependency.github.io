// Usage: Eleventy loads this default-only data module to validate and render
// aggregate support totals. Keep named utility exports outside _data:
// Eleventy treats mixed named/default exports as an object, not a data function.
// The data file must already be totals-only; this module does not hide rows.
import { readFile } from 'node:fs/promises';
import { createSupportView } from '../../scripts/support-snapshot.mjs';

export default async function support() {
  return createSupportView(JSON.parse(await readFile(new URL('./supportSnapshot.json', import.meta.url), 'utf8')));
}
