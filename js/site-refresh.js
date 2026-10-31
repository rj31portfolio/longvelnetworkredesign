/* Shared navigation also works when the external Bootstrap script is unavailable. */
(() => {
  'use strict';
  // Legacy heading animations remove spaces between words. Restore normal text
  // wrapping after those scripts run, including when their CDN fails to load.
  document.querySelectorAll('.heading').forEach(heading => {
    const words = [...heading.querySelectorAll(':scope > .word')];
    if (words.length) heading.textContent = words.map(word => word.textContent).join(' ');
  });
  const header = document.querySelector('#header');
  if (!header) return;
  const toggle = header.querySelector('.navbar-toggler');
  const menus = [...header.querySelectorAll('.navbar-collapse')];
  if (toggle) {
    // One controller owns both menu panels; avoid competing Bootstrap handlers.
    toggle.removeAttribute('data-bs-toggle');
    toggle.removeAttribute('data-bs-target');
    toggle.setAttribute('aria-controls', menus.map(menu => menu.id).join(' '));
    const setOpen = open => {
      toggle.setAttribute('aria-expanded', String(open));
      menus.forEach(menu => menu.classList.toggle('show', open));
    };
    // The homepage already provides the same local navigation controller.
    if (!document.body.classList.contains('home-redesign')) {
      toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
      header.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setOpen(false)));
      document.addEventListener('keydown', event => { if (event.key === 'Escape') setOpen(false); });
    }
    window.matchMedia('(min-width: 992px)').addEventListener('change', () => setOpen(false));
  }
  const current = location.pathname.split('/').pop() || 'index.html';
  const activePage = current === 'product-detail.html' ? 'product.html'
    : current === 'about-us.html' ? 'portfolio.html'
    : document.querySelector('#s-blog') ? 'blog.html' : current;
  header.querySelectorAll('.nav-link').forEach(link => {
    const active = link.getAttribute('href') === activePage;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
})();
