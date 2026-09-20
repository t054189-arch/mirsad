/* مِرصاد — تفاعلات الواجهة */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;
  var STORE = 'mirsad-theme';

  /* ---- رفع ستارة التحميل ---- */
  function ready() {
    document.body.classList.add('is-ready');
  }
  if (document.readyState === 'complete') {
    setTimeout(ready, reduced ? 0 : 600);
  } else {
    window.addEventListener('load', function () {
      setTimeout(ready, reduced ? 0 : 600);
    });
  }

  /* ---- الثيمات البديلة ---- */
  var themeBtn = document.getElementById('themeBtn');
  var themeMenu = document.getElementById('themeMenu');
  var themeOptions = document.querySelectorAll('[data-theme-set]');

  function applyTheme(name) {
    root.setAttribute('data-theme', name);
    Array.prototype.forEach.call(themeOptions, function (opt) {
      opt.setAttribute(
        'aria-checked',
        String(opt.getAttribute('data-theme-set') === name)
      );
    });
    try { localStorage.setItem(STORE, name); } catch (e) { /* التخزين غير متاح */ }
  }

  // استرجاع اختيار سابق
  try {
    var saved = localStorage.getItem(STORE);
    if (saved && document.querySelector('[data-theme-set="' + saved + '"]')) {
      applyTheme(saved);
    }
  } catch (e) { /* التخزين غير متاح */ }

  function closeThemes() {
    themeMenu.classList.remove('is-open');
    themeBtn.setAttribute('aria-expanded', 'false');
  }

  themeBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    var open = themeMenu.classList.toggle('is-open');
    themeBtn.setAttribute('aria-expanded', String(open));
  });

  Array.prototype.forEach.call(themeOptions, function (opt) {
    opt.addEventListener('click', function () {
      applyTheme(opt.getAttribute('data-theme-set'));
      closeThemes();
    });
  });

  document.addEventListener('click', function (e) {
    if (!themeMenu.contains(e.target) && e.target !== themeBtn) closeThemes();
  });

  /* ---- تثبيت الشريط عند التمرير ---- */
  var nav = document.getElementById('nav');
  function onScroll() {
    nav.classList.toggle('is-stuck', window.scrollY > 24);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---- قائمة الجوال ---- */
  var toggle = document.getElementById('navToggle');
  var links = document.querySelector('.nav__links');

  function closeMenu() {
    links.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('is-locked');
  }

  toggle.addEventListener('click', function () {
    var open = links.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('is-locked', open);
  });

  links.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') closeMenu();
  });

  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeMenu(); closeThemes(); }
  });

  /* ---- الظهور التدريجي عند التمرير ---- */
  var items = document.querySelectorAll('.reveal');

  if (reduced || !('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(items, function (el) {
      el.classList.add('is-in');
    });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

    Array.prototype.forEach.call(items, function (el) {
      io.observe(el);
    });
  }

  /* ---- عدّاد أرقام الواجهة ---- */
  var counters = document.querySelectorAll('[data-count]');
  Array.prototype.forEach.call(counters, function (el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    if (isNaN(target)) return;
    if (reduced) { el.textContent = String(target); return; }

    var started = false;
    function run() {
      if (started) return;
      started = true;
      var start = null;
      var span = 1100;
      function step(now) {
        if (start === null) start = now;
        var p = Math.min((now - start) / span, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = String(Math.round(target * eased));
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }
    setTimeout(run, 1300);
  });

  /* ---- تنقل داخلي سلس ---- */
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var id = link.getAttribute('href');
      if (id.length < 2) return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({
        behavior: reduced ? 'auto' : 'smooth',
        block: 'start'
      });
    });
  });
})();
