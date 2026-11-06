/* Local interaction controller for the shared reference design. */
(() => {
  'use strict';
  const toggle = document.querySelector('.menu-toggle');
  const navigation = document.getElementById('about-navigation');
  const setMenu = open => {
    toggle.setAttribute('aria-expanded', String(open));
    navigation.classList.toggle('is-open', open);
  };
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { setMenu(false); toggle.focus(); }
  });
  matchMedia('(min-width: 992px)').addEventListener('change', () => setMenu(false));

  const topButton = document.querySelector('.back-to-top');
  const updateTop = () => { topButton.hidden = scrollY < 500; };
  addEventListener('scroll', updateTop, { passive: true });
  updateTop();
  topButton.addEventListener('click', () => scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }));
  document.querySelectorAll('.counter[data-target]').forEach(counter => { counter.textContent = counter.dataset.target + (counter.dataset.suffix || ''); });

  document.querySelectorAll('.fleet-swiper').forEach(carousel => {
    const track = carousel.querySelector('.swiper-wrapper');
    if (!track) return;
    carousel.querySelectorAll('.swiper-button-next, .swiper-button-prev').forEach(control => {
      const next = control.classList.contains('swiper-button-next');
      control.setAttribute('role', 'button');
      control.setAttribute('tabindex', '0');
      control.setAttribute('aria-label', next ? 'Next equipment' : 'Previous equipment');
      const move = () => {
        const card = track.querySelector('.swiper-slide');
        const distance = card.getBoundingClientRect().width + 25;
        track.scrollBy({ left: next ? distance : -distance, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
      };
      control.addEventListener('click', move);
      control.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); move(); } });
    });
  });

  // Keep the professional experience panels usable without an animation library.
  const tabs = [...document.querySelectorAll('.tab-btn')];
  tabs.forEach(tab => tab.addEventListener('click', () => {
    tabs.forEach(item => { item.classList.toggle('active', item === tab); item.setAttribute('aria-pressed', String(item === tab)); });
    document.querySelectorAll('.professional-experience .tab-content').forEach(panel => panel.classList.toggle('active', panel.id === tab.dataset.tab));
  }));
})();
