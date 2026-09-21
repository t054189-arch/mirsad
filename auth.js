/* مِرصاد — بوابة الدخول وإنشاء الحساب.

   تكتب الجلسة بالشكل الذي يقرأه التطبيق نفسه:
       mirsaad.session = {"userId":"…","email":"…"}
   في localStorage عند «تذكرني»، وإلا في sessionStorage — كما يفعل
   auth.signIn داخل التطبيق. واللغة تُقرأ وتُكتب في mirsaad.locale
   فتبقى البوابة والتطبيق على لغة واحدة.

   التحقق كله في المتصفح: لا خادم يتثبّت من الحساب. كلمة المرور تُخزَّن
   مُجزّأة لا نصًا صريحًا، لكن التجزئة بسيطة وقابلة للكسر — تفادٍ
   لتخزينها ظاهرة، لا تأمين. ولا يُرسل شيء إلى أي جهة. */
(function () {
  'use strict';

  var SESSION = 'mirsaad.session';
  var LOCALE  = 'mirsaad.locale';
  var USERS   = 'mirsaad.users';
  var USER_ID = 'usr-001';            // المستخدم الافتراضي في التطبيق

  var DEMO = { email: 'dalal@mirsaad.demo', pass: 'mirsaad2026',
               name: 'دلال', nameEn: 'Dalal', role: 'مراجِع', roleEn: 'Reviewer' };

  var ROLES = {
    tech:  { ar: 'الفنّي الميداني', en: 'Field technician' },
    eng:   { ar: 'مهندس',           en: 'Engineer' },
    rev:   { ar: 'مراجِع',          en: 'Reviewer' },
    mgr:   { ar: 'مدير المكتب',     en: 'Office manager' },
    admin: { ar: 'موظف إداري',      en: 'Administrator' }
  };

  /* ---------------- الترجمة ---------------- */
  var AR = {};
  var EN = {
    brand:'MIRSAAD', tag:'We inspect today… to build a safer tomorrow',
    signin:'Sign in', signup:'Create account',
    inSub:'Sign in to continue your structures’ inspections.',
    upSub:'Create your account to join your office team on Mirsaad.',
    email:'Email address', pass:'Password', remember:'Remember me',
    name:'Full name', role:'Role in the office', rolePick:'Choose your role…',
    rTech:'Field technician', rEng:'Engineer', rRev:'Reviewer or supervisor',
    rMgr:'Office manager', rAdmin:'Administrator',
    passRule:'At least 8 characters, including a letter and a digit.',
    passConfirm:'Confirm password', create:'Create account and sign in',
    noAcct:'No account yet?', haveAcct:'Already have an account?',
    demoH:'Demo account', demoGo:'Sign in with the demo account',
    note:'Demo build: the check runs in the browser, not on a server, and accounts are kept in your browser only.',
    eRequired:'Enter your email address.',
    eFormat:'That email format is not valid — e.g. name@company.com',
    eThrowaway:'Use a real address, not a disposable one.',
    eNoAccount:'No account with that email — create one, or use the demo account.',
    eWrongPass:'Incorrect password.',
    ePassReq:'Enter your password.', ePassShort:'Password must be at least 8 characters.',
    ePassWeak:'Include at least one letter and one digit.',
    eNameReq:'Enter your full name.', eNameShort:'That name is too short.',
    eNameLetters:'The name must contain letters.',
    eTaken:'That email is already registered — sign in with it instead.',
    eRoleReq:'Choose your role in the office.',
    eConfirmReq:'Type the password again.', eMismatch:'The two passwords do not match.',
    eStore:'Could not save — enable browser storage.'
  };

  /* نصوص الأخطاء لا مقابل لها في الصفحة، فتُعرَّف هنا صراحةً.
     بدونها كانت t() تُرجع نصًا فارغًا فتمر كل الأخطاء بصمت. */
  var AR_MSG = {
    eRequired:'أدخل بريدك الإلكتروني.',
    eFormat:'صيغة البريد غير صحيحة — مثال: name@company.com',
    eThrowaway:'استخدم بريدًا حقيقيًا، لا بريدًا مؤقتًا.',
    eNoAccount:'لا يوجد حساب بهذا البريد — أنشئ حسابًا أو استخدم الحساب التجريبي.',
    eWrongPass:'كلمة المرور غير صحيحة.',
    ePassReq:'أدخل كلمة المرور.',
    ePassShort:'كلمة المرور ٨ أحرف على الأقل.',
    ePassWeak:'اجعلها تحتوي حرفًا ورقمًا على الأقل.',
    eNameReq:'أدخل اسمك الكامل.',
    eNameShort:'الاسم قصير جدًا.',
    eNameLetters:'الاسم يجب أن يحتوي حروفًا.',
    eTaken:'هذا البريد مسجّل بالفعل — سجّل الدخول به.',
    eRoleReq:'اختر دورك في المكتب.',
    eConfirmReq:'أعد كتابة كلمة المرور.',
    eMismatch:'كلمتا المرور غير متطابقتين.',
    eStore:'تعذّر الحفظ — فعّل تخزين المتصفح.'
  };
  Object.keys(AR_MSG).forEach(function (k) { AR[k] = AR_MSG[k]; });

  var nodes = document.querySelectorAll('[data-t]');
  Array.prototype.forEach.call(nodes, function (el) {
    var k = el.getAttribute('data-t');
    if (!(k in AR)) AR[k] = el.textContent;
  });

  var lang = 'ar';
  try { if (localStorage.getItem(LOCALE) === 'en') lang = 'en'; } catch (e) { /* التخزين غير متاح */ }

  function t(key) {
    var v = (lang === 'en' ? EN : AR)[key] || AR[key] || EN[key];
    // مفتاح غير معرَّف يعني خطأً في الكود — لا يجوز أن يبدو نجاحًا
    return v || ('[' + key + ']');
  }

  function applyLang(next) {
    lang = next;
    document.documentElement.lang = next;
    document.documentElement.dir = next === 'en' ? 'ltr' : 'rtl';
    Array.prototype.forEach.call(nodes, function (el) {
      var k = el.getAttribute('data-t');
      var v = (next === 'en' ? EN : AR)[k];
      if (v) el.textContent = v;
    });
    document.getElementById('langLabel').textContent = next === 'en' ? 'ع' : 'EN';
    try { localStorage.setItem(LOCALE, next); } catch (e) { /* التخزين غير متاح */ }
  }
  applyLang(lang);
  document.getElementById('langBtn').addEventListener('click', function () {
    applyLang(lang === 'en' ? 'ar' : 'en');
  });

  /* ---------------- الحسابات ---------------- */
  function hash(str) {
    var h = 0x811c9dc5, i;
    for (i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return ('0000000' + h.toString(16)).slice(-8);
  }
  function readUsers() {
    try { return JSON.parse(localStorage.getItem(USERS)) || []; } catch (e) { return []; }
  }
  function findUser(v) {
    v = (v || '').trim().toLowerCase();
    if (v === DEMO.email) return DEMO;
    var list = readUsers(), i;
    for (i = 0; i < list.length; i++) if (list[i].email === v) return list[i];
    return null;
  }

  /* ---------------- التحقق ---------------- */
  var RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,24}$/;
  var THROWAWAY = ['mailinator.com','tempmail.com','temp-mail.org','guerrillamail.com',
                   '10minutemail.com','yopmail.com','trashmail.com','sharklasers.com',
                   'example.com','example.org','test.com'];

  function emailFormat(v) {
    v = (v || '').trim();
    if (!v) return t('eRequired');
    if (v.length > 254 || !RE.test(v)) return t('eFormat');
    var d = v.split('@').pop().toLowerCase();
    if (d.indexOf('..') !== -1) return t('eFormat');
    if (THROWAWAY.indexOf(d) !== -1) return t('eThrowaway');
    return '';
  }
  function nameProblem(v) {
    v = (v || '').trim();
    if (!v) return t('eNameReq');
    if (v.length < 3) return t('eNameShort');
    if (!/[A-Za-z؀-ۿ]/.test(v)) return t('eNameLetters');
    return '';
  }
  function passProblem(v) {
    if (!v) return t('ePassReq');
    if (v.length < 8) return t('ePassShort');
    return '';
  }
  function newPassProblem(v) {
    var b = passProblem(v);
    if (b) return b;
    if (!/[A-Za-z؀-ۿ]/.test(v) || !/[0-9]/.test(v)) return t('ePassWeak');
    return '';
  }
  function setErr(input, box, msg) {
    box.textContent = msg;
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    input.closest('.field').classList.toggle('is-bad', !!msg);
    return !msg;
  }

  /* ---------------- الدخول ---------------- */
  function enter(user, remember) {
    // نفس الشكل الذي يكتبه التطبيق، فيتعرّف عليه فور تحميله
    var payload = JSON.stringify({ userId: USER_ID, email: user.email });
    try {
      (remember ? localStorage : sessionStorage).setItem(SESSION, payload);
    } catch (e) { return false; }
    document.body.classList.add('is-leaving');
    setTimeout(function () { location.href = 'app.html#/dashboard'; }, 240);
    return true;
  }

  /* ---------------- التبويبان ---------------- */
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

  /* ---------------- نموذج الدخول ---------------- */
  var email = document.getElementById('email');
  var pass = document.getElementById('pass');
  var remember = document.getElementById('remember');
  var emailErr = document.getElementById('emailErr');
  var passErr = document.getElementById('passErr');
  var triedIn = false;

  email.addEventListener('input', function () { if (triedIn) setErr(email, emailErr, emailFormat(email.value)); });
  pass.addEventListener('input', function () { if (triedIn) setErr(pass, passErr, passProblem(pass.value)); });

  document.getElementById('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    triedIn = true;
    var ok = setErr(email, emailErr, emailFormat(email.value));
    ok = setErr(pass, passErr, passProblem(pass.value)) && ok;
    if (!ok) { (emailErr.textContent ? email : pass).focus(); return; }

    var user = findUser(email.value);
    if (!user) { setErr(email, emailErr, t('eNoAccount')); email.focus(); return; }

    var given = user.hash ? hash(pass.value) : pass.value;
    if (given !== (user.hash || user.pass)) {
      setErr(pass, passErr, t('eWrongPass'));
      pass.select();
      return;
    }
    if (!enter(user, remember.checked)) setErr(email, emailErr, t('eStore'));
  });

  /* ---------------- نموذج إنشاء الحساب ---------------- */
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
    var f = emailFormat(v);
    if (f) return f;
    if (findUser(v)) return t('eTaken');
    return '';
  }
  function matchProblem() {
    if (!sPass2.value) return t('eConfirmReq');
    if (sPass2.value !== sPass.value) return t('eMismatch');
    return '';
  }

  sName.addEventListener('input', function () { if (triedUp) setErr(sName, sNameErr, nameProblem(sName.value)); });
  sEmail.addEventListener('input', function () { if (triedUp) setErr(sEmail, sEmailErr, emailTaken(sEmail.value)); });
  sRole.addEventListener('change', function () { if (triedUp) setErr(sRole, sRoleErr, sRole.value ? '' : t('eRoleReq')); });
  sPass.addEventListener('input', function () {
    if (!triedUp) return;
    setErr(sPass, sPassErr, newPassProblem(sPass.value));
    if (sPass2.value) setErr(sPass2, sPass2Err, matchProblem());
  });
  sPass2.addEventListener('input', function () { if (triedUp) setErr(sPass2, sPass2Err, matchProblem()); });

  document.getElementById('signupForm').addEventListener('submit', function (e) {
    e.preventDefault();
    triedUp = true;
    var ok = setErr(sName, sNameErr, nameProblem(sName.value));
    ok = setErr(sEmail, sEmailErr, emailTaken(sEmail.value)) && ok;
    ok = setErr(sRole, sRoleErr, sRole.value ? '' : t('eRoleReq')) && ok;
    ok = setErr(sPass, sPassErr, newPassProblem(sPass.value)) && ok;
    ok = setErr(sPass2, sPass2Err, matchProblem()) && ok;
    if (!ok) {
      var first = document.querySelector('#signupForm .field.is-bad input, #signupForm .field.is-bad select');
      if (first) first.focus();
      return;
    }

    var role = ROLES[sRole.value];
    var user = {
      email: sEmail.value.trim().toLowerCase(),
      name: sName.value.trim(), nameEn: sName.value.trim(),
      role: role.ar, roleEn: role.en,
      hash: hash(sPass.value), at: new Date().toISOString()
    };
    var list = readUsers();
    list.push(user);
    try { localStorage.setItem(USERS, JSON.stringify(list)); }
    catch (err) { setErr(sEmail, sEmailErr, t('eStore')); return; }
    enter(user, true);
  });

  /* ---------------- الحساب التجريبي ---------------- */
  document.getElementById('demoBtn').addEventListener('click', function () {
    email.value = DEMO.email;
    pass.value = DEMO.pass;
    setErr(email, emailErr, '');
    setErr(pass, passErr, '');
    var f = document.getElementById('loginForm');
    f.requestSubmit ? f.requestSubmit() : f.dispatchEvent(new Event('submit', { cancelable: true }));
  });
})();
