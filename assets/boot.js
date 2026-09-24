/* مِرصاد — يعمل قبل أول رسم على كل صفحة.
   يضبط الوضع واللغة فلا تومض الصفحة، ويحرس صفحات التطبيق.

   تنبيه باقٍ: هذا الحارس يعمل في المتصفح، فهو يوجّه الزائر لا يمنعه،
   لأن الموقع ثابت ولا خادم يقدّم صفحاته. ما تغيّر أن الجلسة صارت رمزًا
   موقّعًا من خادم Supabase: من يزوّرها هنا يرى الواجهة وحدها، ولا ينال
   شيئًا من قاعدة البيانات لأن الخادم يتحقق من التوقيع عند كل طلب. */
(function () {
  var d = document.documentElement;
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

  var mode = get('mirsaad-mode') || 'auto';
  var lang = get('mirsaad-lang') || 'ar';
  var dark = mode === 'dark' ||
             (mode === 'auto' && !window.matchMedia('(prefers-color-scheme: light)').matches);
  d.setAttribute('data-mode', dark ? 'dark' : 'light');
  d.setAttribute('lang', lang);
  d.setAttribute('dir', lang === 'en' ? 'ltr' : 'rtl');

  function session() {
    return window.MIRSAAD_SB ? window.MIRSAAD_SB.anySession() : null;
  }
  window.MirsaadSession = function () {
    var s = session();
    if (!s) return null;
    /* جولة تجريبية: هوية معروضة فقط، لا حساب ولا وصول إلى بيانات */
    if (s.demo) {
      return {
        email: 'demo', name: 'ريان العجمي', nameEn: 'Rayan Alajmi',
        role: 'مراجِع (عرض تجريبي)', roleEn: 'Reviewer (demo)'
      };
    }
    var m = (s.user && s.user.user_metadata) || {};
    return {
      email: s.user.email,
      name: m.full_name || s.user.email,
      nameEn: m.full_name || s.user.email,
      role: m.role_ar || '',
      roleEn: m.role_en || ''
    };
  };

  /* ---------- جسر الهوية إلى حزمة اللوحة ----------

     حزمة اللوحة (app.js) مبنية مسبقًا، وتقرأ هويةَ صاحب الجلسة من
     مفتاح ‎mirsaad.session‎ وحده. فيُكتب هنا من الجلسة المعتبرة — جلسة
     Supabase أو الجولة التجريبية — قبل أوّل رسم وفي كل تحميل، فلا
     يعرض المستخدمُ اسمَ غيره ولا اسمًا باقيًا من جلسة سابقة.

     ولا اسم مكتوب هنا: ما يُكتب هو ما في الجلسة نفسها. وحين لا جلسة
     يُمحى المفتاح، فلا تبقى هوية بعد الخروج. */
  function bridge() {
    var KEY = 'mirsaad.session';
    try {
      var who = window.MirsaadSession();
      if (!who) {
        localStorage.removeItem(KEY);
        sessionStorage.removeItem(KEY);
        return;
      }
      /* الحزمة تقرأ الاسم بلغتيه، وتقرأ المعرّف باسم userId — ولا
         تُمسّ هويتُها الداخلية (id) فيبقى ربط بياناتها سليمًا. */
      localStorage.setItem(KEY, JSON.stringify({
        userId: who.email,
        email: who.email,
        name: { ar: who.name, en: who.nameEn || who.name }
      }));
    } catch (e) { /* التخزين غير متاح */ }
  }
  window.MirsaadBridge = bridge;
  bridge();

  // الصفحة تُعرّف نفسها بـ data-gate. الاستدلال من المسار كان يخطئ
  // حيثما لم ينتهِ العنوان بـ index.html أو بشرطة مائلة، فتدور البوابة
  // على نفسها بلا نهاية.
  /* الصفحة العامة تُقرأ بلا دخول، فلا بطاقة هوية فيها ولا زرّ خروج.
     يُعلن قبل أوّل رسم فلا يومض شيء. */
  if (d.toggleAttribute) d.toggleAttribute('data-signed', !!session());

  var onLogin = d.hasAttribute('data-gate');
  /* صفحة عامة تُعرّف نفسها بـ data-public: لا حارس يطردها ولا بوابة
     تجذبها. الصفحة أدرى بنفسها من الاستدلال على المسار. */
  if (d.hasAttribute('data-public')) return;

  var signedIn = !!session();

  if (!onLogin && !signedIn) {
    location.replace('index.html?next=' + encodeURIComponent(location.pathname.split('/').pop() || 'home.html'));
    return;
  }
  if (onLogin && signedIn) {
    var next = new URLSearchParams(location.search).get('next');
    location.replace(/^[a-z-]+\.html$/.test(next || '') ? next : 'board.html#/dashboard');
  }
})();
