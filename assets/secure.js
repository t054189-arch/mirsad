/* مِرصاد — طبقة الأمان المشتركة لبوابة الدخول.

   ثلاثة أشياء يجمعها هذا الملف، وكلها تعمل قبل أن تُرسل كلمة المرور
   إلى الخادم أو بعدها مباشرة:

   ١) تحدٍّ حقيقي للروبوتات (Cloudflare Turnstile) بدل مربّع «لست
      روبوتًا» الذي يضع الروبوت علامته بسطر واحد. المفتاح يوضع في
      sb.js؛ ما دام فارغًا يبقى المربّع القديم عاملًا، فالصفحة لا
      تنكسر قبل أن يصل المفتاح.

   ٢) كشف كلمات المرور المسرّبة عبر HaveIBeenPwned بأسلوب k-anonymity:
      لا تغادر كلمة المرور المتصفح، ولا تغادره بصمتها كاملة — ترسل
      خمسة أحرف من بصمة SHA-1 ويعود آلاف اللواحق، ونبحث نحن فيها. فلا
      يعرف الطرف الآخر أي كلمة سأل عنها ولا لأي حساب.

   ٣) ذاكرة «جهاز موثوق» للتحقق بخطوتين: من أدخل الرمز مرة على جهازه
      لا يُسأل عنه كل يوم. البريد لا يُكتب هنا صريحًا بل بصمته، ولا
      يُمنح هذا السجل أي سلطة: هو يقرّر السؤال عن الرمز لا الدخول
      نفسه، والدخول يبقى بيد الخادم. */
window.MIRSAAD_SEC = (function () {
  'use strict';

  var SB = window.MIRSAAD_SB;
  var SITE_KEY = (SB && SB.turnstileKey && SB.turnstileKey()) || '';

  /* ================= ١) تحدّي الروبوتات ================= */

  var boxes = {};                    /* اسم الحقل -> { el, id, token } */
  var apiAsked = false;
  var apiReady = false;

  function haveKey() { return !!SITE_KEY; }

  /* الشيفرة لا تُحمَّل إلا إذا وُجد مفتاح: بلا مفتاح لا طلب خارجيًا
     ولا أثر في الشبكة. */
  function loadApi() {
    if (apiAsked || !haveKey()) return;
    apiAsked = true;
    window.mirsaadTurnstileReady = function () {
      apiReady = true;
      for (var name in boxes) if (boxes.hasOwnProperty(name)) renderOne(name);
    };
    var s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js' +
            '?render=explicit&onload=mirsaadTurnstileReady';
    s.async = true;
    s.defer = true;
    document.head.appendChild(s);
  }

  function renderOne(name) {
    var b = boxes[name];
    if (!b || !apiReady || b.id !== null || !window.turnstile) return;
    b.id = window.turnstile.render(b.el, {
      sitekey: SITE_KEY,
      theme: document.documentElement.getAttribute('data-mode') === 'light' ? 'light' : 'dark',
      language: document.documentElement.lang === 'en' ? 'en' : 'ar',
      callback: function (token) { b.token = token; if (b.onToken) b.onToken(); },
      'expired-callback': function () { b.token = ''; },
      'error-callback': function () { b.token = ''; }
    });
  }

  /* يُستدعى مرة لكل نموذج. el هو العنصر الحاوي في الصفحة. */
  function mount(name, el, onToken) {
    if (!haveKey() || !el) return false;
    boxes[name] = { el: el, id: null, token: '', onToken: onToken };
    loadApi();
    renderOne(name);
    return true;
  }

  function token(name) {
    var b = boxes[name];
    return (b && b.token) || '';
  }

  /* بعد كل محاولة فاشلة يُستهلك الرمز ولا يصلح لطلب ثانٍ. */
  function resetBox(name) {
    var b = boxes[name];
    if (!b || b.id === null || !window.turnstile) return;
    b.token = '';
    try { window.turnstile.reset(b.id); } catch (e) { /* لا شيء */ }
  }

  /* كل رمز يصلح لطلب واحد. والتحقق بخطوتين يطلب طلبين متتاليين —
     كلمة المرور ثم إرسال الرمز — فيحتاج الثاني رمزًا جديدًا. Turnstile
     يعيد الحلّ من تلقائه في الوضع غير التفاعلي، فننتظره قليلًا ثم
     نمضي بلا رمز ونترك الخادم يقرّر. */
  function freshToken(name, waitMs) {
    if (!haveKey()) return Promise.resolve('');
    resetBox(name);
    var limit = Date.now() + (waitMs || 8000);
    return new Promise(function (resolve) {
      (function poll() {
        var tk = token(name);
        if (tk) { resolve(tk); return; }
        if (Date.now() > limit) { resolve(''); return; }
        setTimeout(poll, 200);
      })();
    });
  }

  /* ================= ٢) كلمات المرور المسرّبة ================= */

  function sha1Hex(text) {
    if (!window.crypto || !window.crypto.subtle) return Promise.reject(new Error('no-subtle'));
    var bytes = new TextEncoder().encode(text);
    return window.crypto.subtle.digest('SHA-1', bytes).then(function (buf) {
      var out = '';
      var view = new Uint8Array(buf);
      for (var i = 0; i < view.length; i++) {
        out += (view[i] < 16 ? '0' : '') + view[i].toString(16);
      }
      return out.toUpperCase();
    });
  }

  /* يردّ عدد المرات التي ظهرت فيها الكلمة في تسريبات معروفة.
     ويردّ -1 إذا تعذّر السؤال — انقطاع شبكة أو حجب. وعندها نمضي ولا
     نمنع: خدمة خارجية معطّلة يجب ألّا تقفل باب التسجيل. */
  function pwnedCount(password) {
    if (!password) return Promise.resolve(0);
    return sha1Hex(password).then(function (hash) {
      var head = hash.slice(0, 5);
      var tail = hash.slice(5);
      var ctrl = new AbortController();
      var timer = setTimeout(function () { ctrl.abort(); }, 6000);
      return fetch('https://api.pwnedpasswords.com/range/' + head, {
        signal: ctrl.signal,
        headers: { 'Add-Padding': 'true' }   /* حشو يخفي حجم الردّ */
      }).then(function (r) {
        clearTimeout(timer);
        if (!r.ok) return -1;
        return r.text().then(function (body) {
          var lines = body.split('\n');
          for (var i = 0; i < lines.length; i++) {
            var parts = lines[i].split(':');
            if (parts[0] && parts[0].trim().toUpperCase() === tail) {
              return parseInt(parts[1], 10) || 0;
            }
          }
          return 0;
        });
      }).catch(function () { clearTimeout(timer); return -1; });
    }).catch(function () { return -1; });
  }

  /* ================= رموز الاحتياط ================= */

  /* أربع مجموعات من أربعة، من أبجدية بلا حروف تشتبه بالأرقام — لا
     صفر ولا O، ولا واحد ولا I ولا L. من ينسخها بيده لا يخطئ.
     والطول يعطي نحو ثمانين بتًا من الاختيار، فلا تُخمَّن. */
  var ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

  function makeCode() {
    var bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    var out = '';
    for (var i = 0; i < 16; i++) {
      if (i && i % 4 === 0) out += '-';
      out += ALPHABET[bytes[i] % ALPHABET.length];
    }
    return out;
  }

  function sha256Hex(text) {
    var bytes = new TextEncoder().encode(text);
    return window.crypto.subtle.digest('SHA-256', bytes).then(function (buf) {
      var out = '', view = new Uint8Array(buf);
      for (var i = 0; i < view.length; i++) {
        out += (view[i] < 16 ? '0' : '') + view[i].toString(16);
      }
      return out;
    });
  }

  /* الرموز تُولَّد هنا وتُعرض مرة واحدة. ولا يغادر المتصفح إلا
     بصماتها — فلا يملك الخادم ولا نحن نسخةً منها. من أضاعها بعد
     إغلاق الشاشة يولّد غيرها، ولا يستردّها. */
  function newBackupCodes(count) {
    var codes = [];
    for (var i = 0; i < (count || 10); i++) codes.push(makeCode());
    return Promise.all(codes.map(sha256Hex)).then(function (hashes) {
      return { codes: codes, hashes: hashes };
    });
  }

  /* ================= ٣) الأجهزة الموثوقة ================= */

  var TRUST_KEY = 'mirsaad.trusted';
  var TRUST_DAYS = 30;

  /* بصمة قصيرة تكفي للتمييز بين حسابين على الجهاز نفسه، ولا تُستخرج
     منها عودةً إلى البريد. لا تُستعمل في أي قرار أمني على الخادم. */
  function tag(email) {
    var s = String(email || '').trim().toLowerCase();
    var h1 = 0x811c9dc5, h2 = 0x01000193;
    for (var i = 0; i < s.length; i++) {
      h1 = ((h1 ^ s.charCodeAt(i)) >>> 0) * 16777619 >>> 0;
      h2 = ((h2 + s.charCodeAt(i) * (i + 7)) >>> 0) * 2246822519 >>> 0;
    }
    return h1.toString(36) + '.' + h2.toString(36);
  }

  function readTrust() {
    try { return JSON.parse(localStorage.getItem(TRUST_KEY) || '{}') || {}; }
    catch (e) { return {}; }
  }

  function deviceTrusted(email) {
    var all = readTrust();
    var until = all[tag(email)];
    return typeof until === 'number' && until > Date.now();
  }

  function trustDevice(email) {
    var all = readTrust();
    var now = Date.now();
    for (var k in all) {                         /* كنس المنتهي */
      if (all.hasOwnProperty(k) && !(all[k] > now)) delete all[k];
    }
    all[tag(email)] = now + TRUST_DAYS * 24 * 60 * 60 * 1000;
    try { localStorage.setItem(TRUST_KEY, JSON.stringify(all)); }
    catch (e) { /* التخزين غير متاح: يُسأل عن الرمز كل مرة، وهذا الأسلم */ }
  }

  function forgetDevice(email) {
    var all = readTrust();
    delete all[tag(email)];
    try { localStorage.setItem(TRUST_KEY, JSON.stringify(all)); }
    catch (e) { /* لا شيء */ }
  }

  return {
    haveCaptcha: haveKey,
    mount: mount,
    token: token,
    reset: resetBox,
    freshToken: freshToken,
    pwnedCount: pwnedCount,
    newBackupCodes: newBackupCodes,
    deviceTrusted: deviceTrusted,
    trustDevice: trustDevice,
    forgetDevice: forgetDevice,
    trustDays: TRUST_DAYS
  };
})();
