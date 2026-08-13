document.addEventListener('DOMContentLoaded', function () {

  /* ═══════════════════════════════════════════
     MOBILE HAMBURGER MENU
     ═══════════════════════════════════════════ */
  var toggle = document.querySelector('.nav-toggle');
  var navList = document.querySelector('.nav ul');

  if (toggle && navList) {
    toggle.addEventListener('click', function () {
      var isOpen = toggle.classList.toggle('open');
      navList.classList.toggle('open', isOpen);
      toggle.setAttribute('aria-expanded', isOpen);
    });

    // Close menu when clicking a link
    navList.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        toggle.classList.remove('open');
        navList.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });

    // Close on outside click
    document.addEventListener('click', function (e) {
      if (!toggle.contains(e.target) && !navList.contains(e.target)) {
        toggle.classList.remove('open');
        navList.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ═══════════════════════════════════════════
     FROSTED HEADER — border appears on scroll
     ═══════════════════════════════════════════ */
  var header = document.querySelector('header');
  if (header) {
    var scrollThreshold = 20;
    var ticking = false;

    function updateHeader() {
      if (window.scrollY > scrollThreshold) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        requestAnimationFrame(updateHeader);
        ticking = true;
      }
    }, { passive: true });

    // Initial check
    updateHeader();
  }

  /* ═══════════════════════════════════════════
     PERSPECTIVE TOGGLE (Enterprise / AI)
     ═══════════════════════════════════════════ */
  var modeButtons = document.querySelectorAll('[data-mode-btn]');
  if (modeButtons.length) {
    modeButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var mode = btn.getAttribute('data-mode-btn');
        document.body.setAttribute('data-mode', mode);

        modeButtons.forEach(function (b) {
          b.classList.toggle('active', b === btn);
        });

        document.querySelectorAll('[data-panel]').forEach(function (panel) {
          var panelMode = panel.getAttribute('data-panel');
          if (panelMode === mode) {
            panel.style.display = '';
            panel.style.opacity = '0';
            panel.style.transform = 'translateY(8px)';
            requestAnimationFrame(function () {
              requestAnimationFrame(function () {
                panel.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
                panel.style.opacity = '1';
                panel.style.transform = 'none';
              });
            });
          } else {
            panel.style.display = 'none';
            panel.style.transition = '';
            panel.style.opacity = '';
            panel.style.transform = '';
          }
        });
      });
    });
  }

  /* ═══════════════════════════════════════════
     SCROLL-TRIGGERED REVEAL
     ═══════════════════════════════════════════ */
  var revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length) {
    if ('IntersectionObserver' in window) {
      var revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12 });
      revealEls.forEach(function (el) { revealObserver.observe(el); });
    } else {
      revealEls.forEach(function (el) { el.classList.add('in-view'); });
    }
  }

  /* ═══════════════════════════════════════════
     ANIMATED NUMBER COUNTERS
     ═══════════════════════════════════════════ */
  var statNums = document.querySelectorAll('.stat .num[data-count]');

  function animateCounter(el) {
    var raw = el.getAttribute('data-count');
    var finalText = el.getAttribute('data-final') || raw;
    var target = parseInt(raw, 10);

    if (isNaN(target)) {
      el.textContent = finalText;
      return;
    }

    var duration = 1600;
    var start = performance.now();
    var prefix = el.getAttribute('data-prefix') || '';
    var suffix = el.getAttribute('data-suffix') || '';

    function tick(now) {
      var elapsed = now - start;
      var progress = Math.min(elapsed / duration, 1);
      // Ease out quart
      var eased = 1 - Math.pow(1 - progress, 4);
      var current = Math.round(eased * target);

      if (progress < 1) {
        el.textContent = prefix + current + suffix;
        requestAnimationFrame(tick);
      } else {
        el.textContent = finalText;
      }
    }

    requestAnimationFrame(tick);
  }

  if (statNums.length && 'IntersectionObserver' in window) {
    var counterObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });

    statNums.forEach(function (el) { counterObserver.observe(el); });
  } else {
    statNums.forEach(function (el) {
      el.textContent = el.getAttribute('data-final') || el.getAttribute('data-count');
    });
  }

});
