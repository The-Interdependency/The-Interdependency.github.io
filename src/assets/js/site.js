// === MODULE_BUILD ===
// id: optional_site_enhancement
//   purpose: Add compact navigation and export actions for each substantive text field without hiding static content.
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
  copy.querySelectorAll('.field-actions, .copy-status, script, style, template, [data-copy-ignore]').forEach(node => node.remove());
  return copy.innerText.replace(/\n{3,}/g, '\n\n').trim();
}

function fieldTitle(field) {
  const heading = field.querySelector('h1, h2, h3, summary, strong');
  return heading?.textContent?.replace(/\s+/g, ' ').trim() || document.title.replace(/\s+·\s+.*$/, '').trim() || 'field-text';
}

function fieldLabel(field, action) {
  const title = fieldTitle(field);
  return title ? `${action} ${title}` : `${action} field text`;
}

function fieldFilename(field, extension) {
  const filename = fieldTitle(field)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'field-text';
  return `${filename}.${extension}`;
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

function downloadMarkdown(field) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([`${textForCopy(field)}\n`], { type: 'text/markdown;charset=utf-8' }));
  link.download = fieldFilename(field, 'md');
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 0);
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function printPdf(field) {
  const printWindow = window.open('', '_blank', 'popup');
  if (!printWindow) return false;
  printWindow.opener = null;

  const title = fieldTitle(field);
  printWindow.document.open();
  printWindow.document.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{max-width:50rem;margin:2rem auto;padding:0 1rem;color:#111;font:12pt/1.5 system-ui,sans-serif}h1{font-family:Georgia,serif;font-size:20pt;line-height:1.2}pre{white-space:pre-wrap;font:inherit}</style></head><body><h1>${escapeHtml(title)}</h1><pre>${escapeHtml(textForCopy(field))}</pre></body></html>`);
  printWindow.document.close();
  printWindow.focus();
  window.setTimeout(() => printWindow.print(), 100);
  return true;
}

function addCopyControl(field) {
  if (field.dataset.copyReady === 'true' || !textForCopy(field)) return;

  const actions = document.createElement('div');
  actions.className = 'field-actions';
  actions.setAttribute('data-copy-ignore', '');

  const copyControl = document.createElement('button');
  copyControl.type = 'button';
  copyControl.className = 'copy-button';
  copyControl.textContent = 'Copy';
  copyControl.setAttribute('aria-label', fieldLabel(field, 'Copy'));

  const markdownControl = document.createElement('button');
  markdownControl.type = 'button';
  markdownControl.className = 'copy-button';
  markdownControl.textContent = '.md';
  markdownControl.setAttribute('aria-label', fieldLabel(field, 'Download Markdown for'));

  const pdfControl = document.createElement('button');
  pdfControl.type = 'button';
  pdfControl.className = 'copy-button';
  pdfControl.textContent = 'PDF';
  pdfControl.setAttribute('aria-label', fieldLabel(field, 'Print or save as PDF for'));

  actions.append(copyControl, markdownControl, pdfControl);

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
    wrapper.append(actions, status, field);
    controlField = wrapper;
  } else if (field.matches('details')) {
    field.append(actions, status);
  } else {
    field.prepend(actions, status);
  }

  controlField.classList.add('copy-field');
  field.dataset.copyReady = 'true';
  copyControl.addEventListener('click', async () => {
    try {
      await writeText(textForCopy(field));
      copyControl.textContent = 'Copied';
      status.textContent = 'Copied to clipboard.';
      window.setTimeout(() => { copyControl.textContent = 'Copy'; }, 1600);
    } catch {
      status.textContent = 'Copy failed. Select the text and copy it manually.';
    }
  });
  markdownControl.addEventListener('click', () => {
    downloadMarkdown(field);
    status.textContent = 'Markdown download started.';
  });
  pdfControl.addEventListener('click', () => {
    status.textContent = printPdf(field) ? 'Print dialog opened. Choose Save as PDF to download.' : 'PDF export was blocked. Allow pop-ups and try again.';
  });
}

document.querySelectorAll(COPYABLE_FIELD_SELECTOR).forEach(addCopyControl);
