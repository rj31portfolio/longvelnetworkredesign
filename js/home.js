(() => {
  'use strict';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const header = document.querySelector('#header');
  const menuButton = document.querySelector('.navbar-toggler');
  menuButton.addEventListener('click', () => {
    const expanded = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(expanded));
    document.querySelectorAll('#header .navbar-collapse').forEach(menu => menu.classList.toggle('show', expanded));
  });
  const closeMenu = () => {
    menuButton.setAttribute('aria-expanded', 'false');
    document.querySelectorAll('#header .navbar-collapse').forEach(menu => menu.classList.remove('show'));
  };
  header.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });

  document.querySelectorAll('.accordion-button').forEach(button => {
    const panel = document.querySelector(button.dataset.bsTarget);
    button.setAttribute('aria-controls', panel.id);
    button.setAttribute('aria-expanded', String(panel.classList.contains('show')));
    button.addEventListener('click', () => {
      const shouldOpen = !panel.classList.contains('show');
      document.querySelectorAll('.accordion-button').forEach(other => {
        other.classList.add('collapsed');
        other.setAttribute('aria-expanded', 'false');
      });
      document.querySelectorAll('.accordion-collapse').forEach(other => other.classList.remove('show'));
      panel.classList.toggle('show', shouldOpen);
      button.classList.toggle('collapsed', !shouldOpen);
      button.setAttribute('aria-expanded', String(shouldOpen));
    });
  });

  // Native scroll snapping keeps every product accessible, including without a CDN.
  function carousel(root, previous, next) {
    const track = root.querySelector('.swiper-wrapper');
    track.tabIndex = 0;
    track.setAttribute('role', 'region');
    track.setAttribute('aria-label', root.classList.contains('fleet-swiper') ? 'Network products' : 'Customer testimonials');
    [previous, next].forEach((control, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = control.className;
      button.innerHTML = control.innerHTML;
      button.setAttribute('aria-label', index ? 'Next items' : 'Previous items');
      control.replaceWith(button);
      button.addEventListener('click', () => {
        const distance = track.querySelector('.swiper-slide').getBoundingClientRect().width + 20;
        track.scrollBy({ left: (index ? 1 : -1) * distance, behavior: reducedMotion ? 'instant' : 'smooth' });
      });
    });
  }
  carousel(document.querySelector('.fleet-swiper'), document.querySelector('.fleet-swiper .swiper-button-prev'), document.querySelector('.fleet-swiper .swiper-button-next'));
  carousel(document.querySelector('.testi-swiper'), document.querySelector('.testi-prev'), document.querySelector('.testi-next'));

  const marquee = document.querySelector('#trust marquee');
  const brandTrack = document.createElement('div');
  brandTrack.className = 'brand-track';
  // Two sets make a seamless loop. The second set is decorative.
  const brands = Array.from(marquee.querySelectorAll('img')).slice(0, 7);
  for (let set = 0; set < 2; set++) {
    const group = document.createElement('div');
    group.className = 'brand-group';
    if (set) group.setAttribute('aria-hidden', 'true');
    brands.forEach((brand, i) => {
      const logo = brand.cloneNode();
      logo.alt = set ? '' : `Partner brand ${i + 1}`;
      group.append(logo);
    });
    brandTrack.append(group);
  }
  marquee.replaceWith(brandTrack);

  // Flatten the article cards into the reference's four-column layout.
  const blogGrid = document.querySelector('#blog .row');
  const articles = [document.querySelector('.blog-feature-card'), ...document.querySelectorAll('.blog-list-item')];
  blogGrid.replaceChildren(...articles);

  // Turn the two original benefit columns into a compact grid, retaining all copy.
  const whyGrid = document.querySelector('.why-sec .row');
  document.querySelectorAll('.why-item').forEach(item => whyGrid.append(item));
  whyGrid.querySelectorAll('.why-col').forEach(column => column.remove());

  if (!reducedMotion && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    document.querySelectorAll('#about .right, .feature-card, .why-item, .testimonial-card, #blog .row > a').forEach((item, index) => {
      item.classList.add('reveal');
      item.style.setProperty('--delay', `${index % 4 * 65}ms`);
      observer.observe(item);
    });
  }
})();
