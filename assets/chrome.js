/* مِرصاد — ما تشترك فيه كل الصفحات: اللغة، الوضع، الشريط الجانبي،
   والخروج. شاشة التحليل انتقلت إلى assets/flow.js لأنها صارت تنتظر
   جواب سير العمل لا مؤقّتًا. */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var prefersLight = window.matchMedia('(prefers-color-scheme: light)');
  var K = { mode: 'mirsaad-mode', lang: 'mirsaad-lang', session: 'mirsaad-session' };

  function save(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* التخزين غير متاح */ } }
  function load(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

  /* ---------- الوضع ---------- */
  var mode = load(K.mode) || 'auto';
  function resolved() { return mode === 'auto' ? (prefersLight.matches ? 'light' : 'dark') : mode; }
  function applyMode() {
    root.setAttribute('data-mode', resolved());
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', getComputedStyle(root).getPropertyValue('--bg').trim());
    if (window.MirsaadScene) window.MirsaadScene.refresh();
  }
  applyMode();

  var modeBtn = document.getElementById('modeBtn');
  if (modeBtn) modeBtn.addEventListener('click', function () {
    mode = resolved() === 'dark' ? 'light' : 'dark';
    save(K.mode, mode);
    applyMode();
  });
  var onSystem = function () { if (mode === 'auto') applyMode(); };
  if (prefersLight.addEventListener) prefersLight.addEventListener('change', onSystem);
  else if (prefersLight.addListener) prefersLight.addListener(onSystem);

  /* ---------- اللغة ---------- */
  var EN = window.MIRSAAD_EN || {};
  var AR = {};
  var nodes = document.querySelectorAll('[data-i18n]');
  var attrNodes = document.querySelectorAll('[data-i18n-attr]');

  Array.prototype.forEach.call(nodes, function (el) {
    var k = el.getAttribute('data-i18n');
    if (!(k in AR)) AR[k] = el.innerHTML;
  });
  Array.prototype.forEach.call(attrNodes, function (el) {
    var p = el.getAttribute('data-i18n-attr').split(':');
    if (!(p[1] in AR)) AR[p[1]] = el.getAttribute(p[0]) || '';
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
      var p = el.getAttribute('data-i18n-attr').split(':');
      if (p[1] in dict) el.setAttribute(p[0], dict[p[1]]);
    });
    var label = document.getElementById('langLabel');
    if (label) label.textContent = next === 'en' ? 'ع' : 'EN';
    save(K.lang, next);
    if (whoSync) whoSync();
    if (window.MirsaadScene) window.MirsaadScene.refresh();
    /* ما رسمه JavaScript ليس في لقطة nodes أعلاه، فيُعاد رسمه على الخبر */
    try { document.dispatchEvent(new CustomEvent('mirsaad:lang', { detail: next })); }
    catch (e) { /* متصفح بلا CustomEvent */ }
  }
  applyLang(lang);

  var langBtn = document.getElementById('langBtn');
  if (langBtn) langBtn.addEventListener('click', function () { applyLang(lang === 'en' ? 'ar' : 'en'); });

  /* ---------- هوية من سجّل دخوله ---------- */
  var whoSync = null;
  var who = document.getElementById('whoAmI');
  if (who && window.MirsaadSession) {
    var s = window.MirsaadSession();
    if (s) {
      // الاسم والدور يتبعان اللغة
      whoSync = function () {
        var en = document.documentElement.lang === 'en';
        var name = (en ? s.nameEn : s.name) || s.email;
        var role = en ? s.roleEn : s.role;
        who.querySelector('b').textContent = name;
        var tag = who.querySelector('.who__role');
        if (tag) tag.textContent = role || '';
        who.setAttribute('title', s.email);
      };
      whoSync();
    }
  }

  /* ---------- الخروج ---------- */
  var outBtn = document.getElementById('outBtn');
  if (outBtn) outBtn.addEventListener('click', function () {
    try {
      localStorage.removeItem(K.session);
      sessionStorage.removeItem(K.session);
      localStorage.removeItem('mirsaad.session');
      sessionStorage.removeItem('mirsaad.session');
    } catch (e) { /* التخزين غير متاح */ }
    location.href = 'index.html';
  });

  /* ---------- الشريط الجانبي على الجوال ---------- */
  var side = document.getElementById('sidenav');
  var sideBtn = document.getElementById('sideToggle');
  if (side && sideBtn) {
    sideBtn.addEventListener('click', function () {
      var open = side.classList.toggle('is-open');
      sideBtn.setAttribute('aria-expanded', String(open));
      document.body.classList.toggle('is-locked', open);
    });
    side.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        side.classList.remove('is-open');
        sideBtn.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('is-locked');
      }
    });
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        side.classList.remove('is-open');
        sideBtn.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('is-locked');
      }
    });
  }

})();
