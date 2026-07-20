import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

// === MODULE_BUILD ===
// id: workflow_action_audit
//   purpose: Refuse stale SHA-pinned or Node-20-era GitHub-owned workflow actions before build/deploy.
//   entrypoint: npm run audit:workflows
//   tests: npm run check
// === END MODULE_BUILD ===

const workflowsDir = '.github/workflows';
const minimums = new Map([
  ['actions/checkout', 5],
  ['actions/setup-node', 5],
  ['actions/configure-pages', 6],
  ['actions/upload-artifact', 7],
  ['actions/upload-pages-artifact', 5],
  ['actions/deploy-pages', 5]
]);

const shaRef = /^[a-f0-9]{40}$/i;
const usesPattern = /uses:\s*([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)@([^\s#]+)/;
const errors = [];

const entries = await readdir(workflowsDir, { withFileTypes: true });
for (const entry of entries) {
  if (!entry.isFile() || !/\.(ya?ml)$/i.test(entry.name)) continue;
  const file = join(workflowsDir, entry.name);
  const text = await readFile(file, 'utf8');
  text.split(/\r?\n/).forEach((line, index) => {
    const match = usesPattern.exec(line);
    if (!match) return;
    const action = match[1].toLowerCase();
    const ref = match[2];
    const minimum = minimums.get(action);
    if (!minimum) return;

    if (shaRef.test(ref)) {
      errors.push(`${file}:${index + 1} ${action}@${ref} is SHA-pinned; use a maintained Node 24 major tag.`);
      return;
    }

    const major = /^v(\d+)$/i.exec(ref);
    if (!major) {
      errors.push(`${file}:${index + 1} ${action}@${ref} is not a simple maintained major tag.`);
      return;
    }

    if (Number(major[1]) < minimum) {
      errors.push(`${file}:${index + 1} ${action}@${ref} is below required major v${minimum}.`);
    }
  });
}

if (errors.length) {
  console.error('Workflow action audit failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('workflow action audit passed: no deprecated GitHub action refs detected');
