// Usage: npm test; verifies the support copy and destinations without contacting payment services.
// Boundary: source assertions do not prove payment processing or configure recurring support.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('homepage publishes unconditional researcher support with verified destinations', () => {
  const source = readFileSync('src/index.njk', 'utf8');
  assert.ok(source.includes('every dollar supports a disabled veteran, USMC, researching the bleeding edge while living on the street because fuck you.'));
  assert.ok(source.includes('No roadmap promises, no private Slack, no special favors.'));
  assert.match(source, /id="support-the-researcher" aria-labelledby="support-heading"/);
  assert.match(source, /href="https:\/\/cash\.app\/\$wayseer00"/);
  assert.match(source, /href="https:\/\/x\.com\/wayseer00"/);
  const support = source.slice(source.indexOf('<section class="awakening-copy awakening-text"'));
  assert.doesNotMatch(support, /<form|<script|subscription|tax.deduct|cloud compute/i);
});

test('shared footer points to the actual support section', () => {
  const footer = readFileSync('src/_includes/components/site-footer.njk', 'utf8');
  assert.match(footer, /href="\/#support-the-researcher">Support the Researcher<\/a>/);
});
