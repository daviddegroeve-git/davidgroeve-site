document.addEventListener('DOMContentLoaded', function () {
  var buttons = document.querySelectorAll('[data-mode-btn]');
  if (buttons.length) {
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var mode = btn.getAttribute('data-mode-btn');
        document.body.setAttribute('data-mode', mode);

        buttons.forEach(function (b) { b.classList.toggle('active', b === btn); });

        document.querySelectorAll('[data-panel]').forEach(function (panel) {
          panel.style.display = (panel.getAttribute('data-panel') === mode) ? '' : 'none';
        });
      });
    });
  }

  // Scroll-triggered reveal for .reveal elements
  var revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length) {
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15 });
      revealEls.forEach(function (el) { io.observe(el); });
    } else {
      revealEls.forEach(function (el) { el.classList.add('in-view'); });
    }
  }
});
