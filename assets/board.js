/* مِرصاد — وصل لوحة التحكم بقشرة الموقع.

   الحزمة (app.js) مصغّرة بلا مصدر، فلا تُعدَّل. هذا الملفّ يسوّي من
   الخارج ما لا يسوّيه التنسيق وحده، ويحمل ما كان يتولّاه guard.js حين
   كانت اللوحة موقعًا قائمًا بذاته — فالحراسة الآن لـ assets/boot.js
   كسائر صفحات الموقع، ولا حارسان. */
(function () {
  'use strict';

  var root = document.getElementById('root');
  if (!root) return;

  /* ---------- شجرة الوصول ----------
     الحزمة ترسم <main> خاصًّا بها داخل <main> الصفحة، واثنان لا يصحّان.
     فيبقى متنُ الحزمة ويُسلب دورُه لا محتواه. */
  function tidy() {
    var inner = root.querySelector('main');
    if (inner && inner.getAttribute('role') !== 'presentation') {
      inner.setAttribute('role', 'presentation');
    }
  }
  tidy();

  var scheduled = false;
  new MutationObserver(function () {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(function () { scheduled = false; tidy(); });
  }).observe(root, { childList: true, subtree: true });

  /* ---------- روابط الحزمة التي للموقع فيها صفحة ---------- */
  function leave() {
    try {
      localStorage.removeItem('mirsaad-session');
      sessionStorage.removeItem('mirsaad-session');
      localStorage.removeItem('mirsaad.session');
      sessionStorage.removeItem('mirsaad.session');
    } catch (e) { /* التخزين غير متاح */ }
    location.replace('index.html');
  }

  document.addEventListener('click', function (e) {
    if (!e.target || !e.target.closest) return;

    // «تسجيل الدخول» داخل اللوحة لا معنى له بعد الدخول: نجعله خروجًا
    if (e.target.closest('a[href="#/login"]')) {
      e.preventDefault(); e.stopPropagation(); leave(); return;
    }

    // «إجراء فحص جديد» للموقع صفحته الخاصة، وهي أتمّ من معالج الحزمة
    if (e.target.closest('a[href="#/inspections/new"]')) {
      e.preventDefault(); e.stopPropagation();
      location.href = 'inspection.html';
    }
  }, true);

  // ومن يفتح المعالج بالعنوان مباشرةً يُحوَّل إلى الصفحة أيضًا
  function routeWizard() {
    if (location.hash === '#/inspections/new') location.replace('inspection.html');
  }
  routeWizard();
  window.addEventListener('hashchange', routeWizard);

  /* الخروج من داخل الحزمة يمسح الجلسة ولا ينتقل، فنلتقط ذلك */
  setInterval(function () {
    if (window.MirsaadSession && !window.MirsaadSession()) leave();
  }, 1200);
})();
