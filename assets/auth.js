/* مِرصاد — بوابة الدخول: تسجيل دخول وإنشاء حساب.

   كل شيء هنا يجري في المتصفح: لا خادم يتحقق، والحسابات تُحفظ في
   localStorage. كلمة المرور تُخزَّن مُجزّأة لا نصًا صريحًا، لكن التجزئة
   بسيطة وقابلة للكسر — هذا تفادٍ لتخزينها ظاهرة، وليس تأمينًا.
   لا يُرسل شيء من هذه البيانات إلى أي جهة. */
(function () {
  'use strict';

  var loginForm = document.getElementById('loginForm');
  var signupForm = document.getElementById('signupForm');
  if (!loginForm || !signupForm) return;

  var USERS = 'mirsaad-users';

  /* الحساب التجريبي — موجود دائمًا بجانب الحسابات المنشأة */
  var DEMO = {
    email: 'staff@mirsaad.kw', pass: 'mirsaad2026',
    name: 'ريان العجمي', nameEn: 'Rayan Alajmi',
    role: 'مراجِع', roleEn: 'Reviewer'
  };

  var ROLES = {
    tech:  { ar: 'الفنّي الميداني',     en: 'Field technician' },
    eng:   { ar: 'مهندس',               en: 'Engineer' },
    rev:   { ar: 'مراجِع',              en: 'Reviewer' },
    mgr:   { ar: 'مدير المكتب',         en: 'Office manager' },
    admin: { ar: 'موظف إداري',          en: 'Administrator' }
  };

  /* تجزئة بسيطة (FNV-1a) — لتفادي تخزين كلمة المرور نصًا صريحًا فقط */
  function hash(str) {
    var h = 0x811c9dc5, i;
    for (i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return ('0000000' + h.toString(16)).slice(-8);
  }

  function readUsers() {
    try { return JSON.parse(localStorage.getItem(USERS)) || []; }
    catch (e) { return []; }
  }
  function writeUsers(list) {
    try { localStorage.setItem(USERS, JSON.stringify(list)); return true; }
    catch (e) { return false; }
  }
  function findUser(v) {
    v = (v || '').trim().toLowerCase();
    if (v === DEMO.email) return DEMO;
    var list = readUsers(), i;
    for (i = 0; i < list.length; i++) if (list[i].email === v) return list[i];
    return null;
  }

  function t(key, fallback) {
    var en = document.documentElement.lang === 'en' && window.MIRSAAD_EN;
    return en && key in window.MIRSAAD_EN ? window.MIRSAAD_EN[key] : fallback;
  }

  /* ---------- التحقق ---------- */
  var RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,24}$/;
  var THROWAWAY = ['mailinator.com','tempmail.com','temp-mail.org','guerrillamail.com',
                   '10minutemail.com','yopmail.com','trashmail.com','sharklasers.com',
                   'example.com','example.org','test.com'];

  function emailFormat(v) {
    v = (v || '').trim();
    if (!v) return t('e.required', 'أدخل بريدك الإلكتروني.');
    if (v.length > 254 || !RE.test(v)) return t('e.format', 'صيغة البريد غير صحيحة — مثال: name@company.com');
    var domain = v.split('@').pop().toLowerCase();
    if (domain.indexOf('..') !== -1) return t('e.format', 'صيغة البريد غير صحيحة — مثال: name@company.com');
    if (THROWAWAY.indexOf(domain) !== -1) return t('e.throwaway', 'استخدم بريدًا حقيقيًا، لا بريدًا مؤقتًا.');
    return '';
  }
  function nameProblem(v) {
    v = (v || '').trim();
    if (!v) return t('e.nameReq', 'أدخل اسمك الكامل.');
    if (v.length < 3) return t('e.nameShort', 'الاسم قصير جدًا.');
    if (!/[A-Za-z؀-ۿ]/.test(v)) return t('e.nameLetters', 'الاسم يجب أن يحتوي حروفًا.');
    return '';
  }
  function passProblem(v) {
    if (!v) return t('e.passReq', 'أدخل كلمة المرور.');
    if (v.length < 8) return t('e.passShort', 'كلمة المرور ٨ أحرف على الأقل.');
    return '';
  }
  function newPassProblem(v) {
    var base = passProblem(v);
    if (base) return base;
    if (!/[A-Za-z؀-ۿ]/.test(v) || !/[0-9]/.test(v))
      return t('e.passWeak', 'اجعلها تحتوي حرفًا ورقمًا على الأقل.');
    return '';
  }

  function setErr(input, box, msg) {
    box.textContent = msg;
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    input.closest('.field').classList.toggle('is-bad', !!msg);
    return !msg;
  }

  /* ---------- الجلسة ---------- */
  function signIn(user, remember) {
    var store = remember ? localStorage : sessionStorage;
    try {
      store.setItem('mirsaad-session', JSON.stringify({
        email: user.email, name: user.name, nameEn: user.nameEn,
        role: user.role, roleEn: user.roleEn, at: new Date().toISOString()
      }));
      // ولوحة التحكم (app.html) تقرأ مفتاحها الخاص بشكله الخاص،
      // فنكتبه أيضًا ليفتحها تسجيل الدخول نفسه
      store.setItem('mirsaad.session', JSON.stringify({
        userId: 'usr-001', email: user.email
      }));
    } catch (e) { return false; }
    var next = new URLSearchParams(location.search).get('next');
    var target = /^[a-z-]+\.html$/.test(next || '') ? next : 'home.html';
    document.body.classList.add('is-leaving');
    setTimeout(function () { location.href = target; }, 260);
    return true;
  }

  /* ---------- التبويبان ---------- */
  var tabIn = document.getElementById('tabIn');
  var tabUp = document.getElementById('tabUp');
  var paneIn = document.getElementById('paneIn');
  var paneUp = document.getElementById('paneUp');

  function showTab(up) {
    tabIn.classList.toggle('is-on', !up);
    tabUp.classList.toggle('is-on', up);
    tabIn.setAttribute('aria-selected', String(!up));
    tabUp.setAttribute('aria-selected', String(up));
    paneIn.hidden = up;
    paneUp.hidden = !up;
    (up ? document.getElementById('sName') : document.getElementById('email')).focus();
  }
  tabIn.addEventListener('click', function () { showTab(false); });
  tabUp.addEventListener('click', function () { showTab(true); });
  document.getElementById('goUp').addEventListener('click', function () { showTab(true); });
  document.getElementById('goIn').addEventListener('click', function () { showTab(false); });

  /* ---------- تسجيل الدخول ---------- */
  var email = document.getElementById('email');
  var pass = document.getElementById('pass');
  var remember = document.getElementById('remember');
  var emailErr = document.getElementById('emailErr');
  var passErr = document.getElementById('passErr');
  var triedIn = false;

  email.addEventListener('input', function () { if (triedIn) setErr(email, emailErr, emailFormat(email.value)); });
  pass.addEventListener('input', function () { if (triedIn) setErr(pass, passErr, passProblem(pass.value)); });

  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    triedIn = true;
    var ok = setErr(email, emailErr, emailFormat(email.value));
    ok = setErr(pass, passErr, passProblem(pass.value)) && ok;
    if (!ok) { (emailErr.textContent ? email : pass).focus(); return; }

    var user = findUser(email.value);
    if (!user) {
      setErr(email, emailErr, t('e.noAccount', 'لا يوجد حساب بهذا البريد — أنشئ حسابًا أو استخدم الحساب التجريبي.'));
      email.focus();
      return;
    }
    var given = user.hash ? hash(pass.value) : pass.value;
    var stored = user.hash || user.pass;
    if (given !== stored) {
      setErr(pass, passErr, t('e.wrongPass', 'كلمة المرور غير صحيحة.'));
      pass.select();
      return;
    }
    if (!signIn(user, remember.checked))
      setErr(email, emailErr, t('e.store', 'تعذّر حفظ الجلسة — فعّل تخزين المتصفح.'));
  });

  /* ---------- إنشاء حساب ---------- */
  var sName = document.getElementById('sName');
  var sEmail = document.getElementById('sEmail');
  var sRole = document.getElementById('sRole');
  var sPass = document.getElementById('sPass');
  var sPass2 = document.getElementById('sPass2');
  var sNameErr = document.getElementById('sNameErr');
  var sEmailErr = document.getElementById('sEmailErr');
  var sRoleErr = document.getElementById('sRoleErr');
  var sPassErr = document.getElementById('sPassErr');
  var sPass2Err = document.getElementById('sPass2Err');
  var triedUp = false;

  function emailTaken(v) {
    var fmt = emailFormat(v);
    if (fmt) return fmt;
    if (findUser(v)) return t('e.taken', 'هذا البريد مسجّل بالفعل — سجّل الدخول به.');
    return '';
  }
  function matchProblem() {
    if (!sPass2.value) return t('e.confirmReq', 'أعد كتابة كلمة المرور.');
    if (sPass2.value !== sPass.value) return t('e.mismatch', 'كلمتا المرور غير متطابقتين.');
    return '';
  }

  sName.addEventListener('input', function () { if (triedUp) setErr(sName, sNameErr, nameProblem(sName.value)); });
  sEmail.addEventListener('input', function () { if (triedUp) setErr(sEmail, sEmailErr, emailTaken(sEmail.value)); });
  sRole.addEventListener('change', function () { if (triedUp) setErr(sRole, sRoleErr, sRole.value ? '' : t('e.roleReq', 'اختر دورك في المكتب.')); });
  sPass.addEventListener('input', function () {
    if (!triedUp) return;
    setErr(sPass, sPassErr, newPassProblem(sPass.value));
    if (sPass2.value) setErr(sPass2, sPass2Err, matchProblem());
  });
  sPass2.addEventListener('input', function () { if (triedUp) setErr(sPass2, sPass2Err, matchProblem()); });

  signupForm.addEventListener('submit', function (e) {
    e.preventDefault();
    triedUp = true;
    var ok = setErr(sName, sNameErr, nameProblem(sName.value));
    ok = setErr(sEmail, sEmailErr, emailTaken(sEmail.value)) && ok;
    ok = setErr(sRole, sRoleErr, sRole.value ? '' : t('e.roleReq', 'اختر دورك في المكتب.')) && ok;
    ok = setErr(sPass, sPassErr, newPassProblem(sPass.value)) && ok;
    ok = setErr(sPass2, sPass2Err, matchProblem()) && ok;
    if (!ok) {
      var first = signupForm.querySelector('.field.is-bad input, .field.is-bad select');
      if (first) first.focus();
      return;
    }

    var role = ROLES[sRole.value];
    var user = {
      email: sEmail.value.trim().toLowerCase(),
      name: sName.value.trim(),
      nameEn: sName.value.trim(),
      role: role.ar, roleEn: role.en,
      hash: hash(sPass.value),
      at: new Date().toISOString()
    };
    var list = readUsers();
    list.push(user);
    if (!writeUsers(list)) {
      setErr(sEmail, sEmailErr, t('e.store', 'تعذّر حفظ الحساب — فعّل تخزين المتصفح.'));
      return;
    }
    signIn(user, true);
  });

  /* ---------- الحساب التجريبي بضغطة ---------- */
  var demoBtn = document.getElementById('demoBtn');
  if (demoBtn) demoBtn.addEventListener('click', function () {
    email.value = DEMO.email;
    pass.value = DEMO.pass;
    setErr(email, emailErr, '');
    setErr(pass, passErr, '');
    loginForm.requestSubmit ? loginForm.requestSubmit()
      : loginForm.dispatchEvent(new Event('submit', { cancelable: true }));
  });
})();
