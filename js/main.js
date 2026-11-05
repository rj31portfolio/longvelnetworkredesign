// Animate each counter once when it enters the viewport.
(() => {
  const counters = document.querySelectorAll('.counter');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finish = counter => {
    counter.textContent = counter.dataset.target + (counter.dataset.suffix || '');
  };
  counters.forEach(finish);
  if (reducedMotion || !('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const counter = entry.target;
      observer.unobserve(counter);
      const target = Number(counter.dataset.target);
      const suffix = counter.dataset.suffix || '';
      const start = performance.now();
      const step = now => {
        const progress = Math.min((now - start) / 1200, 1);
        counter.textContent = Math.round(target * (1 - Math.pow(1 - progress, 3))) + suffix;
        if (progress < 1) requestAnimationFrame(step);
        else finish(counter);
      };
      requestAnimationFrame(step);
    });
  }, { threshold: .35 });
  counters.forEach(counter => observer.observe(counter));
})();

(function ($) {
    "use strict";

    // Spinner
    var spinner = function () {
        setTimeout(function () {
            if ($('#spinner').length > 0) {
                $('#spinner').removeClass('show');
            }
        }, 1);
    };
    spinner();
    
    
    // Initiate the wowjs
    new WOW().init();


    // Sticky Navbar
    $(window).scroll(function () {
        if ($(this).scrollTop() > 300) {
            $('.sticky-top').addClass('shadow-sm').css('top', '0px');
        } else {
            $('.sticky-top').removeClass('shadow-sm').css('top', '-100px');
        }
    });
    
    
    // Back to top button
    $(window).scroll(function () {
        if ($(this).scrollTop() > 300) {
            $('.back-to-top').fadeIn('slow');
        } else {
            $('.back-to-top').fadeOut('slow');
        }
    });
    $('.back-to-top').click(function () {
        $('html, body').animate({scrollTop: 0}, 1500, 'easeInOutExpo');
        return false;
    });


    // Testimonials carousel
    $('.testimonial-carousel').owlCarousel({
        autoplay: true,
        smartSpeed: 1000,
        loop: true,
        nav: false,
        dots: true,
        items: 1,
        dotsData: true,
    });

    
})(jQuery);






 
