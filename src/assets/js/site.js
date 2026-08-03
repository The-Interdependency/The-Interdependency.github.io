// === MODULE_BUILD ===
// id: optional_site_enhancement
//   purpose: Add compact mobile navigation and one-copy-action-per-text-field without hiding static content.
//   entrypoint: loaded with defer from the base layout
//   tests: tests/site-contract.test.mjs
// === END MODULE_BUILD ===

document.documentElement.classList.add('js');

const button = document.querySelector('.nav-toggle');
const nav = document.querySelector('.primary-nav');
if (button && nav) {
  button.hidden = false;
  button.addEventListener('click', () => {
    const open = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', String(!open));
    nav.dataset.open = String(!open);
  });
}

// A public field is a deliberate, self-contained reading unit: not a heading,
// navigation link, or decorative label. Keep this list aligned with the site
// component vocabulary so new content using an established field class gains a
// copy action automatically. `data-copy-field` is the escape hatch for a new
// field type that has not yet earned a shared class.
const COPYABLE_FIELD_SELECTOR = [
  '[data-copy-field]',
  '#content .hero',
  '#content .page-head',
  '#content .panel',
  '#content .provenance',
  '#content .hmmm',
  '#content .reading',
  '#content .textbook-chapter',
  '#content .source-block',
  '#content .criterion',
  '#content .journal-entry',
  '#content details',
  '#content .card',
  '#content .awakening-copy',
  '#content .awakening-text',
  '#content .awakening-provenance',
  '.site-footer .footer-provenance',
  '.site-footer .hmmm-boundary'
].join(', ');

function textForCopy(field) {
  const copy = field.cloneNode(true);
  copy.querySelectorAll('.copy-button, .copy-status, script, style, template, [data-copy-ignore]').forEach(node => node.remove());
  return copy.innerText.replace(/\n{3,}/g, '\n\n').trim();
}

function fieldLabel(field) {
  const heading = field.querySelector('h1, h2, h3, summary, strong');
  const label = heading?.textContent?.replace(/\s+/g, ' ').trim();
  return label ? `Copy ${label}` : 'Copy field text';
}

async function writeText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();
  if (!copied) throw new Error('Clipboard copy is unavailable.');
}

function addCopyControl(field) {
  if (field.dataset.copyReady === 'true' || !textForCopy(field)) return;

  const control = document.createElement('button');
  control.type = 'button';
  control.className = 'copy-button';
  control.textContent = 'Copy';
  control.setAttribute('aria-label', fieldLabel(field));

  const status = document.createElement('span');
  status.className = 'copy-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  let controlField = field;
  if (field.matches('a')) {
    // An anchor cannot contain an interactive descendant. Its copy action is
    // therefore a sibling in a small wrapper, while the copied text remains
    // exactly the card/link field.
    const wrapper = document.createElement('div');
    wrapper.className = 'copy-field copy-field-link';
    field.replaceWith(wrapper);
    wrapper.append(control, status, field);
    controlField = wrapper;
  } else if (field.matches('details')) {
    field.append(control, status);
  } else {
    field.prepend(control, status);
  }

  controlField.classList.add('copy-field');
  field.dataset.copyReady = 'true';
  control.addEventListener('click', async () => {
    try {
      await writeText(textForCopy(field));
      control.textContent = 'Copied';
      status.textContent = 'Copied to clipboard.';
      window.setTimeout(() => { control.textContent = 'Copy'; }, 1600);
    } catch {
      status.textContent = 'Copy failed. Select the text and copy it manually.';
    }
  });
}

document.querySelectorAll(COPYABLE_FIELD_SELECTOR).forEach(addCopyControl);
