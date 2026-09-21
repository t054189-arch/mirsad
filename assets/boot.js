/* مِرصاد — يعمل قبل أول رسم على كل صفحة.
   يضبط الوضع واللغة فلا تومض الصفحة، ويحرس صفحات التطبيق.

   تنبيه: هذا الحارس يعمل في المتصفح، فهو يوجّه الزائر لا يمنعه.
   الحماية الحقيقية تحتاج خادمًا يتحقق من الجلسة قبل إرسال الصفحة. */
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

  function read(key) {
    try { return sessionStorage.getItem(key) || localStorage.getItem(key); }
    catch (e) { return null; }
  }
  function clearAll() {
    try {
      localStorage.removeItem('mirsaad-session');
      sessionStorage.removeItem('mirsaad-session');
      localStorage.removeItem('mirsaad.session');
      sessionStorage.removeItem('mirsaad.session');
    } catch (e) { /* التخزين غير متاح */ }
  }
  /* الجلسة تُكتب بمفتاحين: مفتاحنا ومفتاح لوحة التحكم. تسجيل الخروج من
     داخل اللوحة يمسح مفتاحها وحده، فلو اكتفينا بمفتاحنا لأعدنا الزائر
     إليها وأعادنا حارسها إلى البوابة — تقاذف بلا نهاية. فالجلسة صحيحة
     فقط حين يوجد المفتاحان، وأي اختلال يمسحهما معًا. */
  function session() {
    var ours = read('mirsaad-session');
    var board = read('mirsaad.session');
    if (!ours || !board) {
      if (ours || board) clearAll();
      return null;
    }
    try {
      var s = JSON.parse(ours);
      return s && s.email ? s : null;
    } catch (e) { clearAll(); return null; }
  }
  window.MirsaadSession = session;

  var onLogin = /(^|\/)index\.html$/.test(location.pathname) || /\/$/.test(location.pathname);
  var signedIn = !!session();

  if (!onLogin && !signedIn) {
    location.replace('index.html?next=' + encodeURIComponent(location.pathname.split('/').pop() || 'home.html'));
    return;
  }
  if (onLogin && signedIn) {
    var next = new URLSearchParams(location.search).get('next');
    location.replace(/^[a-z-]+\.html$/.test(next || '') ? next : 'app.html#/dashboard');
  }
})();
