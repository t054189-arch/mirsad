/* مِرصاد — نموذج تسجيل الدخول.

   الحسابات التجريبية مكتوبة هنا، فالتحقق يجري في المتصفح لا على خادم.
   هذا يعني أن كلمة المرور مقروءة لمن يفتح هذا الملف — مقبول في نموذج
   عرض، وغير مقبول في نظام حقيقي. الجلسة تُحفظ في المتصفح وحده،
   ولا يُرسل البريد إلى أي جهة. */
(function () {
  'use strict';

  var form = document.getElementById('loginForm');
  if (!form) return;

  var email = document.getElementById('email');
  var pass = document.getElementById('pass');
  var remember = document.getElementById('remember');
  var emailErr = document.getElementById('emailErr');
  var passErr = document.getElementById('passErr');

  /* الحسابات التجريبية — أضف حسابًا هنا ليعمل في العرض */
  var ACCOUNTS = [
    { email: 'eng@mirsaad.kw', pass: 'mirsaad2026', name: 'م. ريان العجمي', nameEn: 'Eng. Rayan Alajmi' }
  ];
  function findAccount(v) {
    v = v.trim().toLowerCase();
    for (var i = 0; i < ACCOUNTS.length; i++) {
      if (ACCOUNTS[i].email.toLowerCase() === v) return ACCOUNTS[i];
    }
    return null;
  }

  /* بريد واقعي: اسم، @، نطاق بنقطة، وامتداد حرفي من حرفين فأكثر */
  var RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,24}$/;
  /* نطاقات مؤقتة شائعة — تُرفض لأن المطلوب بريد واقعي */
  var THROWAWAY = ['mailinator.com','tempmail.com','temp-mail.org','guerrillamail.com',
                   '10minutemail.com','yopmail.com','trashmail.com','sharklasers.com',
                   'example.com','example.org','test.com'];

  function t(key, fallback) {
    var en = document.documentElement.lang === 'en' && window.MIRSAAD_EN;
    return en && key in window.MIRSAAD_EN ? window.MIRSAAD_EN[key] : fallback;
  }

  function emailProblem(v) {
    v = v.trim();
    if (!v) return t('e.required', 'أدخل بريدك الإلكتروني.');
    if (v.length > 254 || !RE.test(v)) return t('e.format', 'صيغة البريد غير صحيحة — مثال: name@company.com');
    var domain = v.split('@').pop().toLowerCase();
    if (domain.indexOf('..') !== -1) return t('e.format', 'صيغة البريد غير صحيحة — مثال: name@company.com');
    if (THROWAWAY.indexOf(domain) !== -1) return t('e.throwaway', 'استخدم بريدًا حقيقيًا، لا بريدًا مؤقتًا.');
    return '';
  }
  function accountProblem(v) {
    if (!findAccount(v)) return t('e.noAccount', 'لا يوجد حساب بهذا البريد — استخدم الحساب التجريبي بالأسفل.');
    return '';
  }
  function passProblem(v) {
    if (!v) return t('e.passReq', 'أدخل كلمة المرور.');
    if (v.length < 8) return t('e.passShort', 'كلمة المرور ٨ أحرف على الأقل.');
    return '';
  }

  function setErr(input, box, msg) {
    box.textContent = msg;
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    input.closest('.field').classList.toggle('is-bad', !!msg);
  }

  // التحقق بعد أول محاولة فقط، حتى لا نوبّخ المستخدم وهو يكتب
  var tried = false;
  email.addEventListener('input', function () { if (tried) setErr(email, emailErr, emailProblem(email.value)); });
  pass.addEventListener('input', function () { if (tried) setErr(pass, passErr, passProblem(pass.value)); });
  email.addEventListener('blur', function () { if (email.value) setErr(email, emailErr, emailProblem(email.value)); });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    tried = true;
    var ep = emailProblem(email.value) || accountProblem(email.value);
    var pp = passProblem(pass.value);
    setErr(email, emailErr, ep);
    setErr(pass, passErr, pp);
    if (ep) { email.focus(); return; }
    if (pp) { pass.focus(); return; }

    var account = findAccount(email.value);
    if (pass.value !== account.pass) {
      setErr(pass, passErr, t('e.wrongPass', 'كلمة المرور غير صحيحة.'));
      pass.select();
      return;
    }

    var store = remember.checked ? localStorage : sessionStorage;
    try {
      store.setItem('mirsaad-session', JSON.stringify({
        email: account.email,
        name: account.name,
        nameEn: account.nameEn,
        at: new Date().toISOString()
      }));
    } catch (err) {
      setErr(email, emailErr, t('e.store', 'تعذّر حفظ الجلسة — فعّل تخزين المتصفح.'));
      return;
    }

    var next = new URLSearchParams(location.search).get('next');
    var target = /^[a-z-]+\.html$/.test(next || '') ? next : 'home.html';
    document.body.classList.add('is-leaving');
    setTimeout(function () { location.href = target; }, 260);
  });

  /* زر واحد يملأ الحساب التجريبي ويدخل */
  var demoBtn = document.getElementById('demoBtn');
  if (demoBtn) demoBtn.addEventListener('click', function () {
    email.value = ACCOUNTS[0].email;
    pass.value = ACCOUNTS[0].pass;
    setErr(email, emailErr, '');
    setErr(pass, passErr, '');
    form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit', { cancelable: true }));
  });
})();
