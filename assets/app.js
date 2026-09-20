/* مِرصاد — النموذج التفاعلي.
   الشاشات هي شاشات المنتج نفسها، والأزرار داخلها تنقل فعلًا:
   الموافقة تمضي إلى السجل، والرفض أو التعديل يعيد إلى النتائج،
   و«بدء فحص جديد» يعود إلى المنشآت — فتُغلق الدورة بالاستخدام
   لا بالشرح. */
(function () {
  'use strict';

  var app = document.getElementById('app');
  if (!app) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var screens = Array.prototype.slice.call(app.querySelectorAll('.scr'));
  var sideItems = Array.prototype.slice.call(app.querySelectorAll('.side__item'));
  var titleEl = document.getElementById('appTitle');
  var dotsEl = document.getElementById('appDots');
  var prevBtn = document.getElementById('appPrev');
  var nextBtn = document.getElementById('appNext');
  var current = 0;
  var timers = [];

  function clearTimers() {
    timers.forEach(clearTimeout);
    timers = [];
  }

  /* ---------- نقاط التنقل: بلا أرقام، موضع فقط ---------- */
  screens.forEach(function (scr, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', String(i === 0));
    b.addEventListener('click', function () { show(i); });
    dotsEl.appendChild(b);
  });
  var dots = Array.prototype.slice.call(dotsEl.children);

  /* ---------- عنوان الشاشة يتبع اللغة ---------- */
  function titleFor(scr) {
    if (document.documentElement.lang === 'en') {
      var dict = window.MIRSAAD_EN || {};
      var key = scr.getAttribute('data-title');
      if (key in dict) return dict[key];
    }
    return scr.getAttribute('data-title-ar') || '';
  }
  function syncTitle() { titleEl.textContent = titleFor(screens[current]); }

  /* ---------- عرض شاشة ---------- */
  function show(i) {
    if (i < 0 || i >= screens.length) return;
    clearTimers();
    screens[current].classList.remove('is-on');
    current = i;
    var scr = screens[current];
    scr.classList.add('is-on');
    scr.scrollTop = 0;

    syncTitle();
    dots.forEach(function (d, n) { d.setAttribute('aria-selected', String(n === current)); });
    prevBtn.disabled = current === 0;
    nextBtn.disabled = current === screens.length - 1;

    // شاشة الدخول بلا شريط جانبي فعّال
    var side = scr.getAttribute('data-side');
    app.classList.toggle('is-auth', !side);
    sideItems.forEach(function (it) {
      it.classList.toggle('is-on', !!side && it.getAttribute('data-side') === side);
    });

    if (scr.id === 's-analyse') runAnalysis();
  }

  /* ---------- شاشة التحليل: تتقدم ثم تنتقل وحدها ---------- */
  function runAnalysis() {
    var lines = Array.prototype.slice.call(document.querySelectorAll('#analysisSteps .stepline'));
    var bar = document.getElementById('analysisBar');
    var pct = document.getElementById('analysisPct');
    var ar = document.documentElement.lang !== 'en';
    var fmt = function (n) {
      var s = String(n) + '%';
      return ar ? s.replace(/\d/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'[+d]; }).replace('%', '٪') : s;
    };

    lines.forEach(function (l) { l.classList.remove('is-done'); });
    bar.style.width = '0%';
    pct.textContent = fmt(0);

    if (reduced) {
      lines.forEach(function (l) { l.classList.add('is-done'); });
      bar.style.width = '100%';
      pct.textContent = fmt(100);
      return;                           // بلا انتقال تلقائي مع الحركة المخفّضة
    }

    lines.forEach(function (line, n) {
      timers.push(setTimeout(function () {
        line.classList.add('is-done');
        var v = Math.round(((n + 1) / lines.length) * 100);
        bar.style.width = v + '%';
        pct.textContent = fmt(v);
      }, 500 + n * 650));
    });
    timers.push(setTimeout(function () {
      if (screens[current].id === 's-analyse') show(screens.indexOf(document.getElementById('s-results')));
    }, 500 + lines.length * 650 + 900));
  }

  /* ---------- أزرار الشاشات تنقل فعلًا ---------- */
  app.addEventListener('click', function (e) {
    var go = e.target.closest('[data-go]');
    if (!go) return;
    var target = document.getElementById(go.getAttribute('data-go'));
    if (target) show(screens.indexOf(target));
  });

  prevBtn.addEventListener('click', function () { show(current - 1); });
  nextBtn.addEventListener('click', function () { show(current + 1); });

  app.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') show(document.documentElement.dir === 'rtl' ? current - 1 : current + 1);
    if (e.key === 'ArrowLeft') show(document.documentElement.dir === 'rtl' ? current + 1 : current - 1);
  });

  // العنوان يتبع تبديل اللغة
  window.MirsaadApp = { syncTitle: syncTitle };

  show(0);
})();
