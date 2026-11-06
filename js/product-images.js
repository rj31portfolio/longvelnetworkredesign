/* Accessible enlarged views of existing equipment photographs. */
(() => {
  'use strict';
  const triggers = document.querySelectorAll('[data-product-preview]');
  if (!triggers.length) return;
  const dialog = document.createElement('dialog');
  dialog.className = 'product-image-dialog';
  dialog.setAttribute('aria-labelledby', 'product-preview-title');
  dialog.innerHTML = '<div class="preview-heading"><h2 id="product-preview-title"></h2><button class="preview-close" type="button" aria-label="Close enlarged image">&times;</button></div><img class="preview-image" alt=""><a class="preview-link" target="_blank" rel="noopener">Open original image &#8599;</a>';
  document.body.appendChild(dialog);
  const image = dialog.querySelector('.preview-image');
  let opener;
  triggers.forEach(trigger => trigger.addEventListener('click', () => {
    opener = trigger;
    const source = trigger.querySelector('img');
    image.src = source.getAttribute('src');
    image.alt = source.alt;
    dialog.querySelector('h2').textContent = source.alt;
    dialog.querySelector('.preview-link').href = source.getAttribute('src');
    dialog.showModal();
  }));
  dialog.querySelector('.preview-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => opener?.focus());
})();
