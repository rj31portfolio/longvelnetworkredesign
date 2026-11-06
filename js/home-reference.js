(() => {
  'use strict';
  if (!document.body.classList.contains('reference-home')) return;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  if (reducedMotion.matches) return;
  document.querySelectorAll('.carousel-caption, .hero-visual').forEach(item => item.classList.add('home-enter'));
  if (!('IntersectionObserver' in window)) return;
  const elements = document.querySelectorAll('#about .left, #our-services .feature-card, #product-sec .heading, .why-item, #blog .row > a, #sub-banner');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.remove('is-pending');
      entry.target.classList.add('is-arrived');
      observer.unobserve(entry.target);
    });
  }, { threshold: .08 });
  elements.forEach(item => {
    item.classList.add('home-reveal', 'is-pending');
    observer.observe(item);
  });
  reducedMotion.addEventListener('change', event => {
    if (!event.matches) return;
    elements.forEach(item => item.classList.remove('is-pending'));
    observer.disconnect();
  });
})();
