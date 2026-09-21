/* مِرصاد — حارس التطبيق.
   يعمل قبل تحميل الحزمة: من لا جلسة له يعود إلى بوابة الدخول.

   ينبغي التنبيه: هذا حارس في المتصفح، فهو يوجّه الزائر لا يمنعه.
   الحماية الحقيقية تحتاج خادمًا يتحقق من الجلسة قبل إرسال الصفحة. */
(function () {
  'use strict';
  var KEY = 'mirsaad.session';

  function session() {
    try {
      var raw = sessionStorage.getItem(KEY) || localStorage.getItem(KEY);
      if (!raw) return null;
      var s = JSON.parse(raw);
      return s && s.email ? s : null;
    } catch (e) { return null; }
  }

  function leave() {
    try {
      localStorage.removeItem(KEY);
      sessionStorage.removeItem(KEY);
    } catch (e) { /* التخزين غير متاح */ }
    location.replace('index.html');
  }

  if (!session()) { location.replace('index.html'); return; }

  // تسجيل الخروج داخل التطبيق يمسح الجلسة ولا ينتقل — فنلتقط ذلك
  setInterval(function () { if (!session()) location.replace('index.html'); }, 1200);

  document.addEventListener('click', function (e) {
    if (!e.target || !e.target.closest) return;

    // رابط «تسجيل الدخول» لا معنى له بعد الدخول: نجعله خروجًا
    if (e.target.closest('a[href="#/login"]')) {
      e.preventDefault(); e.stopPropagation(); leave(); return;
    }

    // «إجراء فحص جديد» يفتح الخطوات، كل خطوة في صفحتها
    if (e.target.closest('a[href="#/inspections/new"]')) {
      e.preventDefault(); e.stopPropagation();
      location.href = 'step-1.html';
    }
  }, true);

  // ومن يفتح معالج التطبيق بالعنوان مباشرةً يُحوَّل إلى الخطوات أيضًا
  function routeWizard() {
    if (location.hash === '#/inspections/new') location.replace('step-1.html');
  }
  routeWizard();
  window.addEventListener('hashchange', routeWizard);
})();
