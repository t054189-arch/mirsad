/* مِرصاد — حارس التطبيق.
   يعمل قبل تحميل الحزمة: من لا جلسة له يعود إلى بوابة الدخول.

   ينبغي التنبيه: هذا حارس في المتصفح، فهو يوجّه الزائر لا يمنعه. ما
   تغيّر أن الجلسة صارت رمزًا موقّعًا من خادم Supabase لا ملاحظة نكتبها
   بأنفسنا، فمن يزوّرها يرى الواجهة وحدها. */
(function () {
  'use strict';

  /* الصفحة العامة خارج ولاية الحارس: تُقرأ بلا حساب، فلا يطردها
     ولا يضع فيها رابط أمان الحساب. */
  if (document.documentElement.hasAttribute('data-public')) return;

  function session() {
    return window.MIRSAAD_SB ? window.MIRSAAD_SB.anySession() : null;
  }

  /* الحزمة المبنية تكتب مفتاحها الخاص وتمسحه عند الخروج من داخلها.
     لا نملك مصدرها لنغيّره، فنعامل اختفاء المفتاح كطلب خروج، ونبطل
     عندها جلسة Supabase نفسها — وإلا لبقي الرمز صالحًا بعد «الخروج». */
  var APP_KEY = 'mirsaad.session';
  function appFlag() {
    try { return !!localStorage.getItem(APP_KEY); } catch (e) { return false; }
  }

  function leave() {
    /* السجلّ يُكتب قبل إبطال الجلسة: بعدها لا تبقى صلاحية للكتابة.
       ولا ننتظره — خروج يتأخر بسبب سطر سجلّ خروجٌ سيّئ. */
    if (window.MIRSAAD_AUDIT && !(window.MIRSAAD_SB && window.MIRSAAD_SB.demoSession())) {
      window.MIRSAAD_AUDIT.log('sign_out');
    }
    try { localStorage.removeItem(APP_KEY); } catch (e) { /* لا شيء */ }
    if (window.MIRSAAD_SB) { window.MIRSAAD_SB.demoEnd(); window.MIRSAAD_SB.clearIdle(); }
    var sb = window.MIRSAAD_SB && window.MIRSAAD_SB.client();
    var go = function () { location.replace('index.html'); };
    if (!sb) { go(); return; }
    try { sb.auth.signOut().then(go, go); } catch (e) { go(); }
  }

  if (!session()) { leave(); return; }

  /* ما سبق قراءةٌ من التخزين المحلي، وهي تُزوَّر بسطر واحد في وحدة
     التحكم. فنسأل الخادم أيضًا: getUser يرسل الرمز ويطلب التحقق من
     توقيعه وصلاحيته هناك، فلا ينفع رمز منتهٍ ولا ملفَّق ولا رمز حساب
     حُذف أو أُوقف بعد دخوله.

     الجولة التجريبية مستثناة: لا رمز لها أصلًا، ولا تصل إلى قاعدة
     البيانات بحال. */
  function verifyWithServer() {
    var SB = window.MIRSAAD_SB;
    if (!SB || SB.demoSession()) return;
    var sb = SB.client();
    if (!sb) return;
    sb.auth.getUser().then(function (r) {
      if (!r || !r.data || !r.data.user) {
        /* رمز لم يعد الخادم يعترف به: يُمسح، وإلا أُعيدت المحاولة به
           عند كل تحميل وبقي الزائر يدور. */
        if (r && SB.isStale && SB.isStale(r.error)) SB.dropStaleSession();
        leave();
      }
    }).catch(function () {
      /* انقطاع شبكة لا يعني جلسة باطلة: لا نطرد أحدًا بسببه. */
    });
  }

  verifyWithServer();
  setInterval(verifyWithServer, 5 * 60 * 1000);

  setInterval(function () {
    if (!session()) { location.replace('index.html'); return; }
    if (!appFlag()) leave();          // خروج من داخل اللوحة
  }, 1200);

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

  /* حزمة اللوحة مبنية مسبقًا ولا نملك مصدرها، فلا سبيل إلى إضافة
     بند في قائمتها. ونحتاج بابًا إلى صفحة الأمان، فنضع رابطًا صغيرًا
     ثابتًا في زاوية الصفحة. الجولة التجريبية لا حساب لها فلا يظهر. */
  function addSecurityLink() {
    if (document.querySelector('.mirsaad-seclink')) return;
    if (/security\.html$/.test(location.pathname)) return;
    if (window.MIRSAAD_SB && window.MIRSAAD_SB.demoSession()) return;
    var a = document.createElement('a');
    a.className = 'mirsaad-seclink';
    a.href = 'security.html';
    a.textContent = document.documentElement.lang === 'en'
      ? 'Account security' : 'أمان الحساب';
    document.body.appendChild(a);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addSecurityLink);
  } else {
    addSecurityLink();
  }

  // ومن يفتح معالج التطبيق بالعنوان مباشرةً يُحوَّل إلى الخطوات أيضًا
  function routeWizard() {
    if (location.hash === '#/inspections/new') location.replace('inspection.html');
  }
  routeWizard();
  window.addEventListener('hashchange', routeWizard);
})();
