(() => {
  'use strict';
  const toggle = document.querySelector('.menu-toggle');
  const navigation = document.querySelector('#about-navigation');
  const setMenu = open => {
    toggle.setAttribute('aria-expanded', String(open));
    navigation.classList.toggle('is-open', open);
  };
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      toggle.focus();
    }
  });
  window.matchMedia('(min-width: 992px)').addEventListener('change', () => setMenu(false));

  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const selectTab = selected => tabs.forEach(tab => {
    const active = tab === selected;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    document.getElementById(tab.getAttribute('aria-controls')).hidden = !active;
  });
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) {
        event.preventDefault();
        selectTab(tabs[next]);
        tabs[next].focus();
      }
    });
  });

  const reviews = [...document.querySelectorAll('[data-review]')];
  let currentReview = 0;
  document.querySelectorAll('[data-review-step]').forEach(button => {
    button.addEventListener('click', () => {
      currentReview = (currentReview + Number(button.dataset.reviewStep) + reviews.length) % reviews.length;
      reviews.forEach((review, index) => { review.hidden = index !== currentReview; });
      document.querySelector('#review-position').textContent = `${String(currentReview + 1).padStart(2, '0')} / ${String(reviews.length).padStart(2, '0')}`;
    });
  });

  const topButton = document.querySelector('.back-to-top');
  const updateTopButton = () => { topButton.hidden = window.scrollY < 500; };
  window.addEventListener('scroll', updateTopButton, { passive: true });
  updateTopButton();
  topButton.addEventListener('click', () => window.scrollTo({
    top: 0,
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
  }));
})();
