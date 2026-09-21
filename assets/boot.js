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

  function session() {
    try {
      var raw = sessionStorage.getItem('mirsaad-session') || localStorage.getItem('mirsaad-session');
      if (!raw) return null;
      var s = JSON.parse(raw);
      return s && s.email ? s : null;
    } catch (e) { return null; }
  }
  window.MirsaadSession = session;

  // الصفحة تُعرّف نفسها بـ data-gate. الاستدلال من المسار كان يخطئ
  // حيثما لم ينتهِ العنوان بـ index.html أو بشرطة مائلة، فتدور البوابة
  // على نفسها بلا نهاية.
  var onLogin = d.hasAttribute('data-gate');
  var signedIn = !!session();

  if (!onLogin && !signedIn) {
    location.replace('index.html?next=' + encodeURIComponent(location.pathname.split('/').pop() || 'home.html'));
    return;
  }
  if (onLogin && signedIn) {
    var next = new URLSearchParams(location.search).get('next');
    location.replace(/^[a-z-]+\.html$/.test(next || '') ? next : 'home.html');
  }
})();
