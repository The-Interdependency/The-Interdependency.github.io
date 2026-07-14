// === MODULE_BUILD ===
// id: optional_site_enhancement
//   purpose: Add a compact mobile navigation toggle without hiding static content.
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
