/* مِرصاد — تفاعلات الواجهة: الوضع، اللغة، الثيم، المدخل، والظهور. */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var prefersLight = window.matchMedia('(prefers-color-scheme: light)');
  var K = { theme: 'mirsaad-theme', mode: 'mirsaad-mode', lang: 'mirsaad-lang' };

  function save(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* التخزين غير متاح */ } }
  function load(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

  /* ============ الوضع: فاتح / داكن / تلقائي ============ */
  var mode = load(K.mode) || 'auto';

  function resolved() {
    return mode === 'auto' ? (prefersLight.matches ? 'light' : 'dark') : mode;
  }
  function applyMode() {
    var r = resolved();
    root.setAttribute('data-mode', r);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', getComputedStyle(root).getPropertyValue('--bg').trim());
    if (window.MirsaadScene) window.MirsaadScene.refresh();
  }
  applyMode();

  var modeBtn = document.getElementById('modeBtn');
  if (modeBtn) {
    modeBtn.addEventListener('click', function () {
      // الضغط يثبّت الوضع المعاكس لما هو ظاهر الآن
      mode = resolved() === 'dark' ? 'light' : 'dark';
      save(K.mode, mode);
      applyMode();
    });
  }
  // ما دام الوضع تلقائيًا، يتبع إعداد النظام لحظيًا
  var onSystem = function () { if (mode === 'auto') applyMode(); };
  if (prefersLight.addEventListener) prefersLight.addEventListener('change', onSystem);
  else if (prefersLight.addListener) prefersLight.addListener(onSystem);

  /* ============ عائلة الألوان ============ */
  var themeBtn = document.getElementById('themeBtn');
  var themeMenu = document.getElementById('themeMenu');
  var themeOptions = document.querySelectorAll('[data-theme-set]');

  function applyTheme(name) {
    root.setAttribute('data-theme', name);
    Array.prototype.forEach.call(themeOptions, function (o) {
      o.setAttribute('aria-checked', String(o.getAttribute('data-theme-set') === name));
    });
    save(K.theme, name);
    applyMode();
  }
  var savedTheme = load(K.theme);
  applyTheme(savedTheme && document.querySelector('[data-theme-set="' + savedTheme + '"]') ? savedTheme : 'mirsaad');

  function closeThemes() {
    if (!themeMenu) return;
    themeMenu.classList.remove('is-open');
    themeBtn.setAttribute('aria-expanded', 'false');
  }
  if (themeBtn && themeMenu) {
    themeBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = themeMenu.classList.toggle('is-open');
      themeBtn.setAttribute('aria-expanded', String(open));
    });
    Array.prototype.forEach.call(themeOptions, function (o) {
      o.addEventListener('click', function () { applyTheme(o.getAttribute('data-theme-set')); closeThemes(); });
    });
    document.addEventListener('click', function (e) {
      if (!themeMenu.contains(e.target) && !themeBtn.contains(e.target)) closeThemes();
    });
  }

  /* ============ اللغة: عربي / إنجليزي ============ */
  var EN = window.MIRSAAD_EN || {};
  var AR = {};            // النص العربي الأصلي كما جاء في الصفحة
  var nodes = document.querySelectorAll('[data-i18n]');
  var attrNodes = document.querySelectorAll('[data-i18n-attr]');

  Array.prototype.forEach.call(nodes, function (el) {
    var k = el.getAttribute('data-i18n');
    if (!(k in AR)) AR[k] = el.innerHTML;
  });
  Array.prototype.forEach.call(attrNodes, function (el) {
    var parts = el.getAttribute('data-i18n-attr').split(':');
    if (!(parts[1] in AR)) AR[parts[1]] = el.getAttribute(parts[0]) || '';
  });

  var lang = load(K.lang) === 'en' ? 'en' : 'ar';

  function applyLang(next) {
    lang = next;
    var dict = next === 'en' ? EN : AR;
    root.setAttribute('lang', next);
    root.setAttribute('dir', next === 'en' ? 'ltr' : 'rtl');
    Array.prototype.forEach.call(nodes, function (el) {
      var k = el.getAttribute('data-i18n');
      if (k in dict) el.innerHTML = dict[k];
    });
    Array.prototype.forEach.call(attrNodes, function (el) {
      var parts = el.getAttribute('data-i18n-attr').split(':');
      if (parts[1] in dict) el.setAttribute(parts[0], dict[parts[1]]);
    });
    var label = document.getElementById('langLabel');
    if (label) label.textContent = next === 'en' ? 'ع' : 'EN';
    save(K.lang, next);
    if (window.MirsaadScene) window.MirsaadScene.refresh();
  }
  applyLang(lang);

  var langBtn = document.getElementById('langBtn');
  if (langBtn) langBtn.addEventListener('click', function () { applyLang(lang === 'en' ? 'ar' : 'en'); });

  /* ============ المدخل السينمائي ============ */
  var intro = document.getElementById('intro');
  var introDone = false;

  function endIntro() {
    if (introDone) return;
    introDone = true;
    root.classList.remove('has-intro');
    root.classList.add('is-ready');
    if (intro) {
      intro.classList.add('is-gone');
      window.setTimeout(function () { if (intro.parentNode) intro.parentNode.removeChild(intro); }, 1200);
    }
  }
  function skipIntro() {
    if (introDone) return;
    if (window.MirsaadScene) window.MirsaadScene.settle();
    if (intro) intro.classList.add('is-fast');
    endIntro();
  }

  if (reduced || !root.classList.contains('has-intro')) {
    endIntro();
  } else {
    window.setTimeout(endIntro, 3100);
    var skipBtn = document.getElementById('introSkip');
    if (skipBtn) skipBtn.addEventListener('click', skipIntro);
    window.addEventListener('keydown', function onKey(e) {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        skipIntro();
        window.removeEventListener('keydown', onKey);
      }
    });
    window.addEventListener('wheel', skipIntro, { passive: true, once: true });
  }

  /* ============ الشريط والقائمة ============ */
  var nav = document.getElementById('nav');
  function onScroll() { nav.classList.toggle('is-stuck', window.scrollY > 24); }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

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
  links.addEventListener('click', function (e) { if (e.target.tagName === 'A') closeMenu(); });
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeMenu(); closeThemes(); }
  });

  /* ============ الظهور التدريجي ============ */
  var items = document.querySelectorAll('.reveal');
  if (reduced || !('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(items, function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    Array.prototype.forEach.call(items, function (el) { io.observe(el); });
  }

  /* ============ عدّاد الواجهة ============ */
  Array.prototype.forEach.call(document.querySelectorAll('[data-count]'), function (el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    if (isNaN(target)) return;
    if (reduced) { el.textContent = String(target); return; }
    var started = false;
    function run() {
      if (started) return;
      started = true;
      var start = null, span = 1100;
      function step(now) {
        if (start === null) start = now;
        var p = Math.min((now - start) / span, 1);
        el.textContent = String(Math.round(target * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }
    setTimeout(run, 3400);
  });

  /* ============ تنقل داخلي سلس ============ */
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var id = link.getAttribute('href');
      if (id.length < 2) return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    });
  });
})();
