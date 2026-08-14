document.addEventListener('DOMContentLoaded', function () {

  /* ═══════════════════════════════════════════
     RANDOM HERO VIDEO
     ═══════════════════════════════════════════ */
  var heroVideoSource = document.querySelector('#heroVideo source');
  var heroVideo = document.getElementById('heroVideo');
  if (heroVideoSource && heroVideo) {
    var videos = ['assets/DavidGroeveWorking.mp4', 'assets/DavidTeachingAIUniversity.mp4'];
    var randomVideo = videos[Math.floor(Math.random() * videos.length)];
    if (heroVideoSource.getAttribute('src') !== randomVideo) {
      heroVideoSource.setAttribute('src', randomVideo);
      heroVideo.load();
    }
  }

  /* ═══════════════════════════════════════════
     MOBILE HAMBURGER MENU
     ═══════════════════════════════════════════ */
  var toggle = document.querySelector('.nav-toggle');
  var navOverlay = document.getElementById('mobileNavOverlay');
  var navClose = document.getElementById('mobileNavClose');

  function closeMenu() {
    // Play exit animation, then actually hide
    navOverlay.classList.add('closing');
    toggle.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    // Total exit duration: last item delay (0.18s) + animation duration (0.26s) ≈ 460ms
    setTimeout(function () {
      navOverlay.classList.remove('open', 'closing');
      document.body.style.overflow = '';
    }, 460);
  }

  if (toggle && navOverlay) {
    toggle.addEventListener('click', function () {
      if (navOverlay.classList.contains('open')) {
        closeMenu();
      } else {
        navOverlay.classList.remove('closing');
        navOverlay.classList.add('open');
        toggle.classList.add('open');
        toggle.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';
      }
    });

    // X close button
    if (navClose) {
      navClose.addEventListener('click', closeMenu);
    }

    // Close menu when clicking a nav link (with exit animation)
    navOverlay.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        closeMenu();
      });
    });
  }
  // Keep navList reference for booking modal close logic
  var navList = navOverlay;

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



  /* ═══════════════════════════════════════════
     PDF VIEWER (PDF.js)
     ═══════════════════════════════════════════ */
  (function () {
    var overlay       = document.getElementById('pdfModalOverlay');
    var closeBtn      = document.getElementById('pdfModalClose');
    var viewport      = document.getElementById('pdfViewport');
    var loading       = document.getElementById('pdfLoading');
    var titleEl       = document.getElementById('pdfModalTitle');
    var pageInfoEl    = document.getElementById('pdfPageInfo');
    var zoomLabel     = document.getElementById('pdfZoomLabel');
    var prevBtn       = document.getElementById('pdfPrevPage');
    var nextBtn       = document.getElementById('pdfNextPage');
    var zoomInBtn     = document.getElementById('pdfZoomIn');
    var zoomOutBtn    = document.getElementById('pdfZoomOut');
    var zoomFitBtn    = document.getElementById('pdfZoomFit');
    var downloadBtn   = document.getElementById('pdfDownloadBtn');

    if (!overlay) return; // No PDF modal on this page

    var pdfDoc        = null;
    var currentScale  = 1.5;
    var totalPages    = 0;
    var currentPage   = 1;
    var renderTask    = null;
    var currentPdfUrl = '';
    var pdfLoaded     = false;
    var pdfjsLib      = null;

    /* Lazy-load PDF.js from CDN on first use */
    function loadPdfJs(cb) {
      if (pdfjsLib) { cb(); return; }
      var script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = function () {
        pdfjsLib = window['pdfjs-dist/build/pdf'];
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        cb();
      };
      document.head.appendChild(script);
    }

    /* Open modal */
    function openModal(url, label) {
      currentPdfUrl = url;
      currentPage   = 1;
      pdfDoc        = null;
      pdfLoaded     = false;

      // Update title and download link
      titleEl.textContent     = label || 'PDF Viewer';
      downloadBtn.href        = url;
      downloadBtn.setAttribute('download', url.split('/').pop());

      // Show loading, clear old pages
      while (viewport.firstChild && viewport.firstChild !== loading) {
        viewport.removeChild(viewport.firstChild);
      }
      loading.style.display = 'flex';

      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';

      loadPdfJs(function () {
        pdfjsLib.getDocument(url).promise.then(function (doc) {
          pdfDoc     = doc;
          totalPages = doc.numPages;
          pdfLoaded  = true;
          renderAllPages();
        }).catch(function (err) {
          loading.innerHTML = '<span style="color:rgba(255,80,80,0.8)">Failed to load PDF.</span>';
          console.error('PDF.js error:', err);
        });
      });
    }

    /* Render ALL pages stacked vertically */
    function renderAllPages() {
      // Remove old canvases
      var old = viewport.querySelectorAll('.pdf-page-wrapper');
      old.forEach(function (el) { el.remove(); });
      loading.style.display = 'flex';

      var rendered = 0;
      for (var i = 1; i <= totalPages; i++) {
        renderPage(i, function () {
          rendered++;
          if (rendered === totalPages) {
            loading.style.display = 'none';
            updatePageInfo();
            scrollToPage(currentPage);
          }
        });
      }
    }

    function renderPage(num, done) {
      var pageIndex = num; // capture
      pdfDoc.getPage(num).then(function (page) {
        var viewport2 = page.getViewport({ scale: currentScale });
        var wrapper   = document.createElement('div');
        wrapper.className = 'pdf-page-wrapper';
        wrapper.id        = 'pdfPage' + pageIndex;

        var canvas    = document.createElement('canvas');
        canvas.width  = viewport2.width;
        canvas.height = viewport2.height;
        wrapper.appendChild(canvas);

        // Insert at correct position
        var existingWrappers = viewport.querySelectorAll('.pdf-page-wrapper');
        var inserted = false;
        for (var k = 0; k < existingWrappers.length; k++) {
          var existingNum = parseInt(existingWrappers[k].id.replace('pdfPage', ''), 10);
          if (existingNum > pageIndex) {
            viewport.insertBefore(wrapper, existingWrappers[k]);
            inserted = true;
            break;
          }
        }
        if (!inserted) viewport.insertBefore(wrapper, loading);

        var ctx = canvas.getContext('2d');
        page.render({ canvasContext: ctx, viewport: viewport2 }).promise.then(function () {
          if (done) done();
        });
      });
    }

    /* Calculate fit-to-width scale */
    function getFitScale() {
      var availableWidth = viewport.clientWidth - 40; // 20px padding each side
      return pdfDoc ? pdfDoc.getPage(1).then(function (page) {
        var vp = page.getViewport({ scale: 1 });
        return Math.max(0.5, availableWidth / vp.width);
      }) : Promise.resolve(1.5);
    }

    function applyZoom(newScale) {
      currentScale = Math.min(3, Math.max(0.25, newScale));
      zoomLabel.textContent = Math.round(currentScale * 100) + '%';
      if (pdfLoaded) renderAllPages();
    }

    function updatePageInfo() {
      pageInfoEl.textContent = currentPage + ' / ' + totalPages;
    }

    function scrollToPage(num) {
      var target = document.getElementById('pdfPage' + num);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    /* Track visible page via IntersectionObserver */
    function observePages() {
      if (!('IntersectionObserver' in window)) return;
      var obs = new IntersectionObserver(function (entries) {
        var best = { ratio: 0, num: currentPage };
        entries.forEach(function (e) {
          if (e.intersectionRatio > best.ratio) {
            best.ratio = e.intersectionRatio;
            best.num   = parseInt(e.target.id.replace('pdfPage', ''), 10);
          }
        });
        if (best.ratio > 0) {
          currentPage = best.num;
          updatePageInfo();
        }
      }, { root: viewport, threshold: [0, 0.25, 0.5, 0.75, 1] });

      viewport.querySelectorAll('.pdf-page-wrapper').forEach(function (el) {
        obs.observe(el);
      });
    }

    /* Close modal */
    function closeModal() {
      overlay.classList.remove('open');
      document.body.style.overflow = '';
    }

    /* ── Event listeners ── */
    closeBtn.addEventListener('click', closeModal);

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal();
    });

    document.addEventListener('keydown', function (e) {
      if (!overlay.classList.contains('open')) return;
      if (e.key === 'Escape') closeModal();
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        if (currentPage < totalPages) { currentPage++; scrollToPage(currentPage); updatePageInfo(); }
      }
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        if (currentPage > 1) { currentPage--; scrollToPage(currentPage); updatePageInfo(); }
      }
    });

    prevBtn.addEventListener('click', function () {
      if (currentPage > 1) { currentPage--; scrollToPage(currentPage); updatePageInfo(); }
    });
    nextBtn.addEventListener('click', function () {
      if (currentPage < totalPages) { currentPage++; scrollToPage(currentPage); updatePageInfo(); }
    });

    zoomInBtn.addEventListener('click',  function () { applyZoom(currentScale + 0.25); });
    zoomOutBtn.addEventListener('click', function () { applyZoom(currentScale - 0.25); });

    zoomFitBtn.addEventListener('click', function () {
      getFitScale().then(function (s) { applyZoom(s); });
    });

    /* Mouse-wheel zoom with Ctrl/Cmd held */
    viewport.addEventListener('wheel', function (e) {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        applyZoom(currentScale + (e.deltaY < 0 ? 0.15 : -0.15));
      }
    }, { passive: false });

    /* Wire up all .resume-row-name links on the page */
    document.querySelectorAll('.resume-row-name[data-pdf]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        openModal(link.getAttribute('data-pdf'), link.getAttribute('data-label'));
      });
    });

    // Update zoom label initial value
    zoomLabel.textContent = Math.round(currentScale * 100) + '%';
  })();

  /* ═══════════════════════════════════════════
     SHARE DROPDOWNS
     ═══════════════════════════════════════════ */
  var shareToggles = document.querySelectorAll('.resume-share-toggle');
  
  if (shareToggles.length > 0) {
    // Toggle dropdown when clicking the share button
    shareToggles.forEach(function (toggle) {
      toggle.addEventListener('click', function (e) {
        e.stopPropagation(); // Prevent document click from immediately closing it
        
        var dropdown = this.nextElementSibling;
        var isCurrentlyOpen = dropdown.classList.contains('show');
        
        // First, close all other open dropdowns
        document.querySelectorAll('.share-dropdown.show').forEach(function (el) {
          el.classList.remove('show');
          el.previousElementSibling.setAttribute('aria-expanded', 'false');
        });
        
        // Then toggle the clicked one
        if (!isCurrentlyOpen) {
          dropdown.classList.add('show');
          this.setAttribute('aria-expanded', 'true');
        }
      });
    });

    // Close any open dropdowns when clicking anywhere else on the page
    document.addEventListener('click', function (e) {
      document.querySelectorAll('.share-dropdown.show').forEach(function (el) {
        el.classList.remove('show');
        el.previousElementSibling.setAttribute('aria-expanded', 'false');
      });
    });

    // Prevent closing when clicking inside the dropdown itself
    document.querySelectorAll('.share-dropdown').forEach(function (dropdown) {
      dropdown.addEventListener('click', function (e) {
        e.stopPropagation();
      });
    });
  }

});

