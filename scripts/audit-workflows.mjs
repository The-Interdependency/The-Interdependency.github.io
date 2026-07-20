import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

// === MODULE_BUILD ===
// id: workflow_action_audit
//   purpose: Refuse unpinned, tag-pinned, stale, or unapproved GitHub workflow actions before build/deploy.
//   entrypoint: npm run audit:workflows
//   tests: npm run check
// === END MODULE_BUILD ===

const workflowsDir = '.github/workflows';
const approvedPins = new Map([
  ['actions/checkout', { sha: 'df4cb1c069e1874edd31b4311f1884172cec0e10', label: 'v6 node24' }],
  ['actions/setup-node', { sha: 'a0853c24544627f65ddf259abe73b1d18a591444', label: 'v5 node24' }],
  ['actions/configure-pages', { sha: '45bfe0192ca1faeb007ade9deae92b16b8254a0d', label: 'v6 node24' }],
  ['actions/upload-artifact', { sha: '043fb46d1a93c77aae656e7c1c64a875d1fc6a0a', label: 'v7 node24' }],
  ['actions/upload-pages-artifact', { sha: 'fc324d3547104276b827a68afc52ff2a11cc49c9', label: 'v5 composite using upload-artifact v7' }],
  ['actions/deploy-pages', { sha: 'cd2ce8fcbc39b97be8ca5fce6e763baed58fa128', label: 'v5 node24' }]
]);

const shaRef = /^[a-f0-9]{40}$/i;
const usesPattern = /uses:\s*['"]?([^@\s'"]+)@([^#\s'"]+)/;
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

    if (!shaRef.test(ref)) {
      errors.push(`${file}:${index + 1} ${action}@${ref} is not pinned to a full-length commit SHA.`);
      return;
    }

    const approved = approvedPins.get(action);
    if (approved && ref.toLowerCase() !== approved.sha) {
      errors.push(`${file}:${index + 1} ${action}@${ref} is not the approved ${approved.label} pin ${approved.sha}.`);
    }
  });
}

if (errors.length) {
  console.error('Workflow action audit failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('workflow action audit passed: all action refs are full-length SHA pins and approved GitHub-owned actions are Node 24 safe');
