/* مِرصاد — حارس التطبيق.
   يعمل قبل تحميل الحزمة: من لا جلسة له يعود إلى بوابة الدخول.

   ينبغي التنبيه: هذا حارس في المتصفح، فهو يوجّه الزائر لا يمنعه.
   الحماية الحقيقية تحتاج خادمًا يتحقق من الجلسة قبل إرسال الصفحة. */
(function () {
  'use strict';
  var KEY = 'mirsaad.session';

  var OURS = 'mirsaad-session';
  function read(k) {
    try { return sessionStorage.getItem(k) || localStorage.getItem(k); }
    catch (e) { return null; }
  }
  /* الجلسة صحيحة فقط بوجود المفتاحين — القاعدة نفسها في assets/boot.js.
     وجود أحدهما دون الآخر يعني خروجًا نصفيًا، ولو قبلناه لتقاذف المتصفح
     بين البوابة واللوحة بلا نهاية. */
  function session() {
    var board = read(KEY), ours = read(OURS);
    if (!board || !ours) return null;
    try {
      var s = JSON.parse(board);
      return s && s.email ? s : null;
    } catch (e) { return null; }
  }

  function leave() {
    try {
      localStorage.removeItem(KEY);
      sessionStorage.removeItem(KEY);
      localStorage.removeItem('mirsaad-session');
      sessionStorage.removeItem('mirsaad-session');
    } catch (e) { /* التخزين غير متاح */ }
    location.replace('index.html');
  }

  if (!session()) { leave(); return; }   // leave() يمسح المفتاحين

  // تسجيل الخروج داخل التطبيق يمسح الجلسة ولا ينتقل — فنلتقط ذلك
  setInterval(function () { if (!session()) leave(); }, 1200);

  document.addEventListener('click', function (e) {
    if (!e.target || !e.target.closest) return;

    // رابط «تسجيل الدخول» لا معنى له بعد الدخول: نجعله خروجًا
    if (e.target.closest('a[href="#/login"]')) {
      e.preventDefault(); e.stopPropagation(); leave(); return;
    }

    // «إجراء فحص جديد» يفتح صفحة الفحص في الموقع
    if (e.target.closest('a[href="#/inspections/new"]')) {
      e.preventDefault(); e.stopPropagation();
      location.href = 'inspection.html';
    }
  }, true);

  // ومن يفتح معالج التطبيق بالعنوان مباشرةً يُحوَّل إلى الخطوات أيضًا
  function routeWizard() {
    if (location.hash === '#/inspections/new') location.replace('inspection.html');
  }
  routeWizard();
  window.addEventListener('hashchange', routeWizard);
})();
