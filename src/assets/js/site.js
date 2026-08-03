// === MODULE_BUILD ===
// id: optional_site_enhancement
//   purpose: Add compact navigation and structure-preserving export actions for each substantive text field without hiding static content.
//   entrypoint: loaded with defer from the base layout
//   tests: tests/site-contract.test.mjs, tests/post-merge-reconciliation.test.mjs
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

const TITLE_SELECTOR = 'h1, h2, h3, .m-title, .ref-title, summary, strong';
const EXPORT_IGNORE_SELECTOR = '.field-actions, .copy-status, script, style, template, [data-copy-ignore]';

function cleanClone(field) {
  const copy = field.cloneNode(true);
  copy.querySelectorAll(EXPORT_IGNORE_SELECTOR).forEach(node => node.remove());
  return copy;
}

function textForCopy(field) {
  return cleanClone(field).innerText.replace(/\n{3,}/g, '\n\n').trim();
}

function fieldTitle(field) {
  const heading = field.querySelector(TITLE_SELECTOR);
  return heading?.textContent?.replace(/\s+/g, ' ').trim()
    || document.title.replace(/\s+·\s+.*$/, '').trim()
    || 'field-text';
}

function textWithoutRepeatedTitle(field) {
  const copy = cleanClone(field);
  const heading = copy.querySelector(TITLE_SELECTOR);
  if (heading && heading.textContent.replace(/\s+/g, ' ').trim() === fieldTitle(field)) heading.remove();
  return copy.innerText.replace(/\n{3,}/g, '\n\n').trim();
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

function markdownEscape(value) {
  return value.replace(/([\\`*_[\]<>])/g, '\\$1');
}

function inlineMarkdown(node) {
  if (node.nodeType === Node.TEXT_NODE) return markdownEscape(node.textContent || '');
  if (node.nodeType !== Node.ELEMENT_NODE) return '';
  const tag = node.tagName.toLowerCase();
  const content = Array.from(node.childNodes).map(inlineMarkdown).join('');
  if (tag === 'a') {
    const href = node.getAttribute('href');
    return href ? `[${content.trim() || href}](${new URL(href, document.baseURI).href})` : content;
  }
  if (tag === 'code') return `\`${(node.textContent || '').replace(/`/g, '\\`')}\``;
  if (tag === 'strong' || tag === 'b') return `**${content}**`;
  if (tag === 'em' || tag === 'i') return `*${content}*`;
  if (tag === 'br') return '  \n';
  return content;
}

function blockMarkdown(node, depth = 0) {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent?.trim() ? `${markdownEscape(node.textContent.trim())}\n\n` : '';
  if (node.nodeType !== Node.ELEMENT_NODE) return '';
  if (node.matches(EXPORT_IGNORE_SELECTOR)) return '';
  const tag = node.tagName.toLowerCase();
  const headingLevel = /^h([1-6])$/.exec(tag);
  if (headingLevel) return `${'#'.repeat(Number(headingLevel[1]))} ${inlineMarkdown(node).trim()}\n\n`;
  if (tag === 'p') return `${inlineMarkdown(node).trim()}\n\n`;
  if (tag === 'pre') return `\`\`\`\n${node.textContent || ''}\n\`\`\`\n\n`;
  if (tag === 'blockquote') return `${(node.innerText || '').split('\n').map(line => `> ${line}`).join('\n')}\n\n`;
  if (tag === 'ul' || tag === 'ol') {
    return `${Array.from(node.children).map((item, index) => {
      const marker = tag === 'ol' ? `${index + 1}.` : '-';
      return `${'  '.repeat(depth)}${marker} ${inlineMarkdown(item).trim()}`;
    }).join('\n')}\n\n`;
  }
  if (tag === 'dl') {
    return `${Array.from(node.children).map(child => child.tagName === 'DT'
      ? `**${inlineMarkdown(child).trim()}**`
      : `${inlineMarkdown(child).trim()}\n`).join('\n')}\n`;
  }
  if (tag === 'hr') return '---\n\n';
  return Array.from(node.childNodes).map(child => blockMarkdown(child, depth + 1)).join('');
}

function markdownForField(field) {
  const copy = cleanClone(field);
  return blockMarkdown(copy).replace(/\n{3,}/g, '\n\n').trim();
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
  link.href = URL.createObjectURL(new Blob([`${markdownForField(field)}\n`], { type: 'text/markdown;charset=utf-8' }));
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
  const body = textWithoutRepeatedTitle(field);
  printWindow.document.open();
  printWindow.document.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{max-width:50rem;margin:2rem auto;padding:0 1rem;color:#111;font:12pt/1.5 system-ui,sans-serif}h1{font-family:Georgia,serif;font-size:20pt;line-height:1.2}pre{white-space:pre-wrap;font:inherit}</style></head><body><h1>${escapeHtml(title)}</h1><pre>${escapeHtml(body)}</pre></body></html>`);
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
  const copyControl = Object.assign(document.createElement('button'), { type: 'button', className: 'copy-button', textContent: 'Copy' });
  copyControl.setAttribute('aria-label', fieldLabel(field, 'Copy'));
  const markdownControl = Object.assign(document.createElement('button'), { type: 'button', className: 'copy-button', textContent: '.md' });
  markdownControl.setAttribute('aria-label', fieldLabel(field, 'Download Markdown for'));
  const pdfControl = Object.assign(document.createElement('button'), { type: 'button', className: 'copy-button', textContent: 'PDF' });
  pdfControl.setAttribute('aria-label', fieldLabel(field, 'Print or save as PDF for'));
  actions.append(copyControl, markdownControl, pdfControl);
  const status = document.createElement('span');
  status.className = 'copy-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  let controlField = field;
  if (field.matches('a')) {
    const wrapper = document.createElement('div');
    wrapper.className = 'copy-field copy-field-link';
    field.replaceWith(wrapper);
    wrapper.append(actions, status, field);
    controlField = wrapper;
    if (field.matches('.card')) field.style.paddingTop = '4.75rem';
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

if (document.querySelector('[data-gonol-lab]')) {
  import('/assets/js/gonol-reconciliation.js').catch(() => {
    const status = document.querySelector('[data-gonol-status]');
    if (status) status.textContent = 'Strict receipt reconciliation could not load; do not treat generated receipts as portable evidence.';
  });
}
