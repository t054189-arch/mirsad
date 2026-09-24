/* مِرصاد — إعداد Supabase وجلسة موحّدة للصفحات.

   المفتاح أدناه مفتاح «منشور» (publishable). وجوده في الصفحة مقصود:
   هو معرّف المشروع للعميل، لا سرّ. ما يحمي البيانات هو سياسات الصف
   (RLS) على الخادم، لا إخفاء هذا المفتاح. ولا يجوز أبدًا وضع مفتاح
   service_role هنا — ذاك يتجاوز كل سياسة.

   الجلسة الآن رمز موقّع من الخادم لا ملاحظة نكتبها بأنفسنا: من يزوّرها
   في المتصفح لا يحصل على شيء من قاعدة البيانات، لأن الخادم يتحقق من
   التوقيع قبل كل طلب. */
(function () {
  'use strict';

  var URL = 'https://kifcykrfcxlitarknsgs.supabase.co';
  var KEY = 'sb_publishable_BUCYeO5j32bc-VLFRuVLpQ_LpiBEPDA';
  var REF = 'kifcykrfcxlitarknsgs';

  /* مفتاح موقع Cloudflare Turnstile — تحدّي الروبوتات.

     هذا أيضًا مفتاح علني كسابقه: يُعرض في الصفحة بطبيعته. أما المفتاح
     السرّي فيوضع في لوحة Supabase وحدها (Authentication ← Attack
     Protection)، ولا يُكتب هنا أبدًا، لأن الخادم هو من يتحقق من
     التحدّي قبل قبول التسجيل أو الدخول.

     ما دام فارغًا، تعود البوابة إلى مربّع «لست روبوتًا» البسيط. */
  var TURNSTILE_SITE_KEY = '';

  var client = null;

  function sb() {
    if (!client) {
      if (!window.supabase || !window.supabase.createClient) return null;
      client = window.supabase.createClient(URL, KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
    }
    return client;
  }

  /* ---------- مهلة الخمول ----------
     المكتبة تجدّد الرمز تلقائيًا، فالجلسة تبقى صالحة بلا نهاية ما بقي
     المتصفح. على حاسوب مشترك في موقع العمل يعني ذلك أن من يجلس بعدك
     يجدك داخلًا. فنسجّل آخر نشاط، وننهي الجلسة بعد سكون طويل. */
  var IDLE_KEY = 'mirsaad.seen';
  var IDLE_MAX_MS = 30 * 60 * 1000;          /* نصف ساعة بلا حركة */

  function touch() {
    try { localStorage.setItem(IDLE_KEY, String(Date.now())); } catch (e) { /* لا شيء */ }
  }
  function idleTooLong() {
    try {
      var last = parseInt(localStorage.getItem(IDLE_KEY) || '0', 10);
      if (!last) { touch(); return false; }
      return (Date.now() - last) > IDLE_MAX_MS;
    } catch (e) { return false; }
  }
  function clearIdle() {
    try { localStorage.removeItem(IDLE_KEY); } catch (e) { /* لا شيء */ }
  }

  /* حرّاس الصفحات تعمل قبل رسم الصفحة، فتحتاج قراءة فورية لا وعدًا.
     مكتبة Supabase تحفظ الجلسة في هذا المفتاح، فنقرأه مباشرة ونتحقق
     من انتهاء صلاحيته — والتحقق الملزم يبقى على الخادم عند كل طلب. */
  function sessionSync() {
    try {
      var raw = localStorage.getItem('sb-' + REF + '-auth-token');
      if (!raw) return null;
      var s = JSON.parse(raw);
      if (!s || !s.access_token || !s.user) return null;
      if (s.expires_at && s.expires_at * 1000 < Date.now()) return null;
      if (needsSecondFactor(s)) return null;
      if (idleTooLong()) return null;
      return s;
    } catch (e) { return null; }
  }

  /* من فعّل تطبيق المصادقة تبقى جلسته ناقصة (aal1) بعد كلمة المرور
     حتى يُدخل رمز التطبيق. كانت الحرّاس تعدّها جلسة تامة، فمن كتب
     عنوان اللوحة وهو على شاشة الرمز دخل بلا رمز. */
  function needsSecondFactor(s) {
    var factors = (s.user && s.user.factors) || [];
    var verified = factors.some(function (f) { return f && f.status === 'verified'; });
    if (!verified) return false;
    try {
      var part = s.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(part)).aal !== 'aal2';
    } catch (e) { return true; }
  }

  function nameOf(user) {
    var m = (user && user.user_metadata) || {};
    return m.full_name || m.name || (user && user.email) || '';
  }

  /* ---------- الحساب التجريبي ----------
     جولة في الواجهة وحدها، بلا كلمة مرور منشورة وبلا حساب على الخادم.
     سبب ذلك أن اللوحة كلها بيانات افتراضية مُجمّعة داخل الحزمة، فلا شيء
     حقيقي خلفها يُحمى. والأهم: هذه الجلسة لا تحمل رمزًا من Supabase،
     فهي لا تصل إلى قاعدة البيانات أصلًا — ويوم تُضاف جداول حقيقية تبقى
     عاجزة عنها بحكم التصميم لا بحكم قاعدة قد تُنسى. */
  var DEMO_KEY = 'mirsaad.demo';
  var DEMO_MAX_MS = 60 * 60 * 1000;          /* ساعة واحدة ثم تنتهي */

  function demoStart() {
    try {
      localStorage.setItem(DEMO_KEY, JSON.stringify({ demo: true, at: Date.now() }));
      return true;
    } catch (e) { return false; }
  }
  function demoSession() {
    try {
      var raw = localStorage.getItem(DEMO_KEY);
      if (!raw) return null;
      var d = JSON.parse(raw);
      if (!d || !d.demo || !d.at) return null;
      if (Date.now() - d.at > DEMO_MAX_MS) { localStorage.removeItem(DEMO_KEY); return null; }
      return d;
    } catch (e) { return null; }
  }
  function demoEnd() {
    try { localStorage.removeItem(DEMO_KEY); } catch (e) { /* لا شيء */ }
  }

  /* الحرّاس تسأل هذه: جلسة حقيقية أو جولة تجريبية */
  function anySession() {
    return sessionSync() || demoSession();
  }

  window.MIRSAAD_SB = {
    url: URL, ref: REF,
    client: sb,
    sessionSync: sessionSync,
    demoStart: demoStart,
    demoSession: demoSession,
    demoEnd: demoEnd,
    anySession: anySession,
    touch: touch,
    clearIdle: clearIdle,
    idleMinutes: IDLE_MAX_MS / 60000,
    nameOf: nameOf,
    turnstileKey: function () { return TURNSTILE_SITE_KEY; }
  };

  /* أي حركة حقيقية من المستخدم تُجدّد المهلة */
  if (typeof document !== 'undefined') {
    ['click', 'keydown', 'pointerdown', 'scroll'].forEach(function (ev) {
      document.addEventListener(ev, touch, { passive: true, capture: true });
    });
  }
})();
