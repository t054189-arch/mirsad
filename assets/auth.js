/* مِرصاد — بوابة الدخول: تسجيل دخول، إنشاء حساب، وتأكيد البريد برمز.

   ما تغيّر عن النسخة السابقة:
   لم تعد الحسابات تُحفظ في المتصفح، ولم تعد كلمة المرور تُجزَّأ هنا.
   الحساب يُنشأ على خادم Supabase، وكلمة المرور تُخزَّن هناك مُجزّأة
   بخوارزمية بطيئة مخصّصة لكلمات المرور، ولا تصل هذه الصفحة أبدًا.
   والجلسة رمز موقّع من الخادم لا ملاحظة نكتبها بأنفسنا.

   ورمز الأرقام الستة يثبت أن البريد بريد صاحبه: لا يكتمل الحساب حتى
   يصل الرمز إلى الصندوق ويُعاد إدخاله هنا.

   يبقى تحذير واحد: حراسة الصفحات تجري في المتصفح لأن الموقع ثابت بلا
   خادم يقدّمه. من يزوّر الجلسة يرى الواجهة، لكنه لا ينال شيئًا من
   قاعدة البيانات: الخادم يتحقق من توقيع الرمز عند كل طلب. */
(function () {
  'use strict';

  var loginForm = document.getElementById('loginForm');
  var signupForm = document.getElementById('signupForm');
  if (!loginForm || !signupForm) return;

  var SB = window.MIRSAAD_SB;
  var sb = SB && SB.client();
  var SEC = window.MIRSAAD_SEC;

  /* ---------- تحدّي الروبوتات ----------
     بمفتاح Turnstile يصير التحدّي حقيقيًا، ويتحقق منه خادم Supabase
     قبل قبول الطلب، فلا ينفع تجاوزه من المتصفح. وبلا مفتاح يبقى
     المربّع القديم على حاله: يردّ النقر العابر لا برنامجًا آليًا. */
  var CAPTCHA = !!(SEC && SEC.haveCaptcha());

  if (CAPTCHA) {
    var robotRow = document.querySelector('.robot');
    if (robotRow) robotRow.hidden = true;
    [['in', 'inCaptcha'], ['up', 'upCaptcha']].forEach(function (pair) {
      var box = document.getElementById(pair[1]);
      if (!box) return;
      box.hidden = false;
      SEC.mount(pair[0], document.getElementById(pair[1] + 'Widget'), function () {
        document.getElementById(pair[1] + 'Err').textContent = '';
      });
    });
  }

  /* رمز التحدّي يُرفق بكل طلب مصادقة؛ بلا مفتاح يبقى الحقل فارغًا
     ويتجاهله الخادم. */
  function authOpts(which, extra) {
    var o = extra || {};
    if (CAPTCHA) o.captchaToken = SEC.token(which);
    return o;
  }
  function captchaProblem(which) {
    if (!CAPTCHA) return '';
    return SEC.token(which) ? '' : t('e.captcha', 'أكمل التحقق من أنك لست روبوتًا.');
  }
  function captchaSpent(which) {
    if (CAPTCHA) SEC.reset(which);
  }

  var ROLES = {
    tech:  { ar: 'الفنّي الميداني',     en: 'Field technician' },
    eng:   { ar: 'مهندس',               en: 'Engineer' },
    rev:   { ar: 'مراجِع',              en: 'Reviewer' },
    mgr:   { ar: 'مدير المكتب',         en: 'Office manager' },
    admin: { ar: 'موظف إداري',          en: 'Administrator' }
  };

  function t(key, fallback) {
    var en = document.documentElement.lang === 'en' && window.MIRSAAD_EN;
    return en && key in window.MIRSAAD_EN ? window.MIRSAAD_EN[key] : fallback;
  }

  /* ---------- التحقق من الصيغة ---------- */
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
  /* تنبيه: هذا التأكيد يجري في المتصفح، فهو يردّ النقر العابر لا برنامجًا
     آليًا — من يرسل الطلب بنفسه يتجاوزه. المنع الحقيقي يحتاج خادمًا. */
  function robotProblem(checked) {
    return checked ? '' : t('e.robot', 'أكّد أنك لست روبوتًا.');
  }
  function otpProblem(v) {
    v = (v || '').trim();
    if (!v) return t('e.otpReq', 'أدخل الرمز المرسل إلى بريدك.');
    if (!/^[0-9]{6}$/.test(v)) return t('e.otpFormat', 'الرمز ستة أرقام.');
    return '';
  }

  function setErr(input, box, msg) {
    box.textContent = msg;
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    input.closest('.field').classList.toggle('is-bad', !!msg);
    return !msg;
  }

  function busy(form, on) {
    var b = form.querySelector('button[type="submit"]');
    if (!b) return;
    b.disabled = on;
    b.classList.toggle('is-busy', on);
  }

  function offline(box) {
    box.textContent = t('e.offline', 'تعذّر الاتصال بالخادم. تحقق من اتصالك ثم أعد المحاولة.');
  }

  /* ---------- التبويبات ---------- */
  var tabIn = document.getElementById('tabIn');
  var tabUp = document.getElementById('tabUp');
  var paneIn = document.getElementById('paneIn');
  var paneUp = document.getElementById('paneUp');
  var paneOtp = document.getElementById('paneWait');
  var tabsw = document.querySelector('.tabsw');

  var paneTotp = document.getElementById('paneTotp');
  var paneReset = document.getElementById('paneReset');
  var paneNewPass = document.getElementById('paneNewPass');

  var paneWelcome = document.getElementById('paneWelcome');

  function hideExtras() {
    if (paneWelcome) paneWelcome.hidden = true;
    if (paneTotp) paneTotp.hidden = true;
    if (paneReset) paneReset.hidden = true;
    if (paneNewPass) paneNewPass.hidden = true;
  }

  function showTab(up) {
    paneOtp.hidden = true;
    hideExtras();
    if (tabsw) tabsw.hidden = false;
    tabIn.classList.toggle('is-on', !up);
    tabUp.classList.toggle('is-on', up);
    tabIn.setAttribute('aria-selected', String(!up));
    tabUp.setAttribute('aria-selected', String(up));
    paneIn.hidden = up;
    paneUp.hidden = !up;
    (up ? document.getElementById('sName') : document.getElementById('email')).focus();
  }
  /* شاشة الرمز نفسها تخدم حالتين: تأكيد بريد حساب جديد، والخطوة
     الثانية عند الدخول. الفرق في نوع الرمز عند التحقق، وفي خيار
     «لا تسألني على هذا الجهاز» الذي لا معنى له عند إنشاء الحساب. */
  /* شاشة واحدة تخدم ثلاث حالات: تأكيد حساب جديد، والخطوة الثانية عند
     الدخول، واستعادة كلمة المرور. الفرق في نصّها وفيما يجري بعد ضغط
     الرابط — لا في حقلٍ يُملأ، إذ لا حقل.

     والنيّة تُحفظ في تخزين الجلسة لا في الذاكرة: من يضغط الرابط قد
     يعود في لسان تبويب جديد، فتكون الصفحة قد حُمّلت من أوّلها. */
  var otpMode = 'signup';
  var PENDING = 'mirsaad.pending';

  function rememberPending(mode, addr, trust) {
    try {
      sessionStorage.setItem(PENDING, JSON.stringify({
        mode: mode, email: addr || '', trust: !!trust
      }));
    } catch (e) { /* التخزين غير متاح: يعود إلى اللوحة، وهو المعتاد */ }
  }
  function readPending() {
    try { return JSON.parse(sessionStorage.getItem(PENDING) || 'null'); }
    catch (e) { return null; }
  }
  function clearPending() {
    try { sessionStorage.removeItem(PENDING); } catch (e) { /* لا شيء */ }
  }

  var waitLead = document.getElementById('waitLead');
  var waitErr  = document.getElementById('waitErr');

  function showOtp() {
    paneIn.hidden = true;
    paneUp.hidden = true;
    paneOtp.hidden = false;
    if (tabsw) tabsw.hidden = true;
    hideExtras();
    var trustRow = document.getElementById('waitTrustRow');
    if (trustRow) trustRow.hidden = otpMode !== 'login';
    rememberPending(otpMode, pendingEmail, false);
    var trust = document.getElementById('waitTrust');
    if (trust) trust.onchange = function () {
      rememberPending(otpMode, pendingEmail, trust.checked);
    };
  }

  /* لحظة بين ضغط الرابط والدخول. الجلسة قائمة بالفعل، فالزرّ لا
     يسجّل دخولًا جديدًا — إنما يمضي. ومن أغلق الصفحة هنا يبقى داخلًا،
     لأن الجلسة تُحفظ ويُجدَّد رمزها. */
  function showWelcome(user) {
    paneIn.hidden = true;
    paneUp.hidden = true;
    paneOtp.hidden = true;
    hideExtras();
    paneWelcome.hidden = false;
    if (tabsw) tabsw.hidden = true;

    var who = document.getElementById('welcomeWho');
    var name = (SB && SB.nameOf) ? SB.nameOf(user) : '';
    who.textContent = name ? t('v.hi', 'أهلًا، ') + name : '';

    var go = document.getElementById('welcomeGo');
    go.onclick = function () { enter(); };
    go.focus();
  }

  /* نصّ الشاشة يقول ما جرى وما بقي، ويختلف باختلاف ما كان يفعله. */
  function otpLead(addr, failed) {
    if (failed) {
      if (waitLead) {
        waitLead.textContent = t('w.leadNotSent',
          'لم تُرسل رسالة. راجع السبب أدناه، ثم اطلب رسالة جديدة.');
      }
      return;
    }
    var msg;
    if (otpMode === 'login') {
      msg = t('w.leadLogin', 'كلمة المرور صحيحة. أرسلنا رسالة إلى ') + addr +
            t('w.leadLoginTail', ' — اضغط زرّ التأكيد فيها ليكتمل دخولك.');
    } else if (otpMode === 'reset') {
      msg = t('w.leadReset', 'أرسلنا رسالة إلى ') + addr +
            t('w.leadResetTail', ' — اضغط زرّ التأكيد فيها لتختار كلمة مرور جديدة. وإن لم تصلك رسالة فلا حساب على هذا البريد.');
    } else {
      msg = t('w.leadSignup', 'أرسلنا رسالة إلى ') + addr +
            t('w.leadSignupTail', ' — اضغط زرّ التأكيد فيها ليكتمل حسابك. وإن كان لك حساب على هذا البريد فلن تصلك رسالة: سجّل دخولك بدل ذلك.');
    }
    if (waitLead) waitLead.textContent = msg;
  }

  /* بعد رمز تطبيق المصادقة نمضي إلى اللوحة عادةً، وإلى شاشة كلمة
     المرور الجديدة حين تكون هذه استعادة. */
  var totpNext = 'enter';

  function showTotp() {
    paneIn.hidden = true;
    paneUp.hidden = true;
    paneOtp.hidden = true;
    hideExtras();
    paneTotp.hidden = false;
    if (tabsw) tabsw.hidden = true;
    pass.value = '';
    document.getElementById('totpCode').focus();
  }

  function showReset() {
    paneIn.hidden = true;
    paneUp.hidden = true;
    paneOtp.hidden = true;
    hideExtras();
    paneReset.hidden = false;
    if (tabsw) tabsw.hidden = true;
    var re = document.getElementById('rEmail');
    re.value = email.value.trim();      /* ما كتبه في الدخول لا يُكتب مرتين */
    re.focus();
  }

  function showNewPass() {
    paneIn.hidden = true;
    paneUp.hidden = true;
    paneOtp.hidden = true;
    hideExtras();
    paneNewPass.hidden = false;
    if (tabsw) tabsw.hidden = true;
    document.getElementById('nPass').focus();
  }
  tabIn.addEventListener('click', function () { showTab(false); });
  tabUp.addEventListener('click', function () { showTab(true); });
  document.getElementById('goUp').addEventListener('click', function () { showTab(true); });
  document.getElementById('goIn').addEventListener('click', function () { showTab(false); });

  /* ---------- الانتقال بعد نجاح الدخول ---------- */
  function enter() {
    /* حزمة لوحة التحكم مبنية مسبقًا ولا نملك مصدرها، وهي تقرأ مفتاحها
       الخاص لتعرف أن ثمة جلسة. نكتبه لها هنا حتى تعمل، ونجعل اختفاءه
       علامة خروج في guard.js. الجلسة المعتبرة تبقى جلسة Supabase؛
       هذا المفتاح إشارة للواجهة لا إثبات هوية. */
    try {
      var s = SB.sessionSync();
      localStorage.setItem('mirsaad.session', JSON.stringify({
        userId: 'usr-001',
        email: (s && s.user && s.user.email) || ''
      }));
    } catch (e) { /* التخزين غير متاح */ }

    var next = new URLSearchParams(location.search).get('next');
    var target = /^[a-z-]+\.html$/.test(next || '') ? next : 'board.html#/dashboard';
    document.body.classList.add('is-leaving');
    setTimeout(function () { location.href = target; }, 260);
  }

  /* الرابط يجب أن يعيد الزائر إلى الموقع الذي سجّل منه — محليًا كان
     أو منشورًا — لا إلى عنوان واحد مكتوب في لوحة Supabase. ويبقى
     شرط: أن يكون هذا العنوان مسموحًا في قائمة Redirect URLs، وإلا
     ردّه الخادم إلى Site URL. */
  function backHere() {
    return location.origin + location.pathname;
  }

  /* ---------- العودة من الرابط ----------
     هنا يكتمل كل شيء. الرابط في الرسالة يعيد الزائر ومعه جلسة، فنُتمّ
     ما كان يفعله: حسابٌ جديد أو دخولٌ أو استعادة.

     ونوع العودة يُفحص: روابط التسجيل والدخول تُدخل، ورابط الاستعادة
     لا يُدخل وحده بل يفتح شاشة كلمة المرور الجديدة. ولو قبلنا كل نوع
     بلا تمييز لصار رابط الاستعادة بابًا يلتفّ حول الخطوة الثانية. */
  (function () {
    var back = location.hash || '';

    /* رابط انتهت صلاحيته، أو ضُغط مرتين — والثانية لا تصلح. يعود
       الزائر بخطأ في العنوان لا بجلسة، وكان يقف أمام شاشة تقول له
       «افتح بريدك» وهو قد فتحه للتوّ. */
    if (/error=|error_code=/.test(back)) {
      var code = (back.match(/error_code=([^&]+)/) || [])[1] || '';
      try { history.replaceState(null, '', location.pathname); } catch (e) { /* لا شيء */ }
      var pend0 = readPending() || {};
      pendingEmail = pend0.email || '';
      otpMode = pend0.mode || 'signup';
      if (pendingEmail) {
        showOtp();
        /* لا نقول «اضغط الرابط» لمن ضغطه للتوّ ووجده ميّتًا. */
        if (waitLead) {
          waitLead.textContent = t('w.leadDead',
            'الرابط الذي ضغطته لم يعد صالحًا. اطلب رسالة جديدة، ثم اضغط رابطها خلال ساعة.');
        }
      }
      waitErr.textContent = /expired|otp_expired/.test(code)
        ? t('e.linkExpired', 'انتهت صلاحية الرابط أو استُعمل من قبل. اطلب رسالة جديدة من الزرّ أدناه.')
        : t('e.linkBad', 'تعذّر إتمام التحقق بهذا الرابط. اطلب رسالة جديدة من الزرّ أدناه.');
      return;
    }

    if (!/access_token=/.test(back)) return;
    if (!/type=(signup|email_change|magiclink|recovery)/.test(back)) return;
    if (!sb) return;

    var pend = readPending() || {};

    sb.auth.onAuthStateChange(function (event, session) {
      if (!session) return;
      if (event !== 'SIGNED_IN' && event !== 'INITIAL_SESSION') return;

      try { history.replaceState(null, '', location.pathname); } catch (e) { /* لا شيء */ }
      clearPending();

      pendingEmail = pend.email || (session.user && session.user.email) || '';

      /* استعادة: الرابط أثبت البريد، وبقيت كلمة المرور الجديدة. ومن
         فعّل تطبيق المصادقة يُسأل عنه قبلها. */
      if (pend.mode === 'reset') {
        otpMode = 'reset';
        if (window.MIRSAAD_AUDIT) window.MIRSAAD_AUDIT.log('password_reset_asked');
        sb.auth.mfa.getAuthenticatorAssuranceLevel().then(function (lv) {
          var d = lv && lv.data;
          if (d && d.nextLevel === 'aal2' && d.currentLevel !== 'aal2') {
            totpNext = 'newpass'; showTotp(); return;
          }
          showNewPass();
        }).catch(showNewPass);
        return;
      }

      /* دخول بخطوتين: الجهاز يُوثَّق إن طُلب ذلك قبل فتح البريد */
      if (pend.mode === 'login' && pend.trust && SEC && pendingEmail) {
        SEC.trustDevice(pendingEmail);
      }
      if (window.MIRSAAD_AUDIT) window.MIRSAAD_AUDIT.log('sign_in_otp');
      showWelcome(session.user);
    });
  })();

  /* ---------- تسجيل الدخول ---------- */
  var email = document.getElementById('email');
  var pass = document.getElementById('pass');
  var notRobot = document.getElementById('notRobot');
  var emailErr = document.getElementById('emailErr');
  var passErr = document.getElementById('passErr');
  var notRobotErr = document.getElementById('notRobotErr');
  var loginHint = document.getElementById('loginHint');
  var triedIn = false;

  email.addEventListener('input', function () { if (triedIn) setErr(email, emailErr, emailFormat(email.value)); });
  pass.addEventListener('input', function () { if (triedIn) setErr(pass, passErr, passProblem(pass.value)); });
  notRobot.addEventListener('change', function () {
    if (triedIn) setErr(notRobot, notRobotErr, robotProblem(notRobot.checked));
  });

  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    triedIn = true;
    var ok = setErr(email, emailErr, emailFormat(email.value));
    ok = setErr(pass, passErr, passProblem(pass.value)) && ok;
    var capMsg = '';
    if (CAPTCHA) {
      capMsg = captchaProblem('in');
      document.getElementById('inCaptchaErr').textContent = capMsg;
      if (capMsg) ok = false;
    } else {
      ok = setErr(notRobot, notRobotErr, robotProblem(notRobot.checked)) && ok;
    }
    if (!ok) {
      if (emailErr.textContent) email.focus();
      else if (passErr.textContent) pass.focus();
      else if (!CAPTCHA) notRobot.focus();
      return;
    }
    if (!sb) { offline(emailErr); return; }

    busy(loginForm, true);
    sb.auth.signInWithPassword({
      email: email.value.trim().toLowerCase(),
      password: pass.value,
      options: authOpts('in')
    }).then(function (r) {
      busy(loginForm, false);
      captchaSpent('in');
      if (r.error) {
        /* رسالة واحدة لكل حالات الفشل: لا نكشف أي بريد مسجَّل وأيّه لا.
           التمييز بين «لا حساب» و«كلمة مرور خاطئة» يعطي المهاجم قائمة. */
        /* حساب لم يُؤكَّد بعد: نفتح شاشة الرمز ولا نرسل تلقائيًا.
           الإرسال التلقائي كان يُبطل الرمز السابق ويستهلك حصة الإرسال،
           فيبقى المستخدم بلا رمز صالح ولا رسالة جديدة. الإرسال الآن
           بطلب صريح من المستخدم عبر «إعادة إرسال الرمز». */
        /* كان الحساب غير المؤكَّد يفتح شاشة الرمز، وكان ذلك يفضح
           وجوده: من جرّب بريدًا بأي كلمة مرور عرف من عندنا حساب ومن
           ليس عنده. فصار الردّ واحدًا في كل حالات الفشل.

           ومن لم يؤكّد بريده لا يضيع: الجملة الثانية تدلّه على
           «نسيت كلمة المرور؟» — وهي تُرسل رمزًا يؤكّد البريد ويُدخله.
           والجملة تُعرض للجميع، فلا تكشف شيئًا عن أحد. */
        setErr(pass, passErr, t('e.badLogin', 'البريد أو كلمة المرور غير صحيحة.'));
        loginHint.hidden = false;
        pass.select();
        return;
      }

      /* كلمة المرور صحيحة — وهذا وحده لا يكفي.
         على جهاز لم يُوثَّق بعد نُنهي الجلسة التي فتحها الخادم للتو،
         ونطلب رمزًا إلى البريد. فمن سرق كلمة المرور وحدها لا يبلغ
         شيئًا ما لم يفتح صندوق البريد أيضًا. */
      var addr = email.value.trim().toLowerCase();
      pendingEmail = addr;

      /* من فعّل تطبيق مصادقة فالخادم نفسه يعرف أن جلسته ناقصة حتى
         يدخل رمز التطبيق (aal1 مقابل aal2). وهذا أمتن من رمز البريد:
         لا يمرّ بصندوق بريد يمكن اختراقه. فإن وُجد، فهو الخطوة
         الثانية ولا حاجة إلى غيره — حتى على جهاز «موثوق»، لأن التطبيق
         في يد صاحبه دائمًا ولا كلفة عليه. */
      sb.auth.mfa.getAuthenticatorAssuranceLevel().then(function (lv) {
        var d = lv && lv.data;
        if (d && d.nextLevel === 'aal2' && d.currentLevel !== 'aal2') {
          showTotp();
          return;
        }
        if (SEC && !SEC.deviceTrusted(addr)) { secondStep(addr); return; }
        if (window.MIRSAAD_AUDIT) window.MIRSAAD_AUDIT.log('sign_in_password');
        enter();
      }).catch(function () {
        /* تعذّر السؤال عن مستوى التحقق: نعود إلى رمز البريد، ولا
           نُدخل أحدًا بكلمة مرور وحدها. */
        if (SEC && !SEC.deviceTrusted(addr)) { secondStep(addr); return; }
        enter();
      });
    }).catch(function () { busy(loginForm, false); captchaSpent('in'); offline(emailErr); });
  });

  /* الخطوة الثانية: إنهاء الجلسة ثم إرسال رمز إلى البريد. */
  function secondStep(addr) {
    pendingEmail = addr;
    otpMode = 'login';
    busy(loginForm, true);

    sb.auth.signOut().then(function () {
      return CAPTCHA ? SEC.freshToken('in') : '';
    }).then(function (tk) {
      return sb.auth.signInWithOtp({
        email: addr,
        options: CAPTCHA
          ? { shouldCreateUser: false, captchaToken: tk, emailRedirectTo: backHere() }
          : { shouldCreateUser: false, emailRedirectTo: backHere() }
      });
    }).then(function (r) {
      busy(loginForm, false);
      otpLead(addr);
      showOtp();
      pass.value = '';                 /* لا تبقى كلمة المرور في الحقل */
      if (r && r.error) {
        if (r.error.status === 429 || /rate limit/i.test(r.error.message || '')) {
          otpLead(pendingEmail, true);
          waitErr.textContent = t('e.rateLimit', 'تجاوزنا حدّ إرسال الرسائل للمشروع كله. انتظر ساعة، أو اربط مزوّد بريد خاصًا بك.');
          return;
        }
        otpLead(pendingEmail, true);
        waitErr.textContent = t('e.sendFail', 'تعذّر إرسال الرسالة. أعد المحاولة بعد قليل.');
        return;
      }
      startWait();                     /* مهلة قبل السماح بطلب رمز آخر */
    }).catch(function () {
      busy(loginForm, false);
      otpLead(pendingEmail);
      showOtp();
      offline(waitErr);
    });
  }

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
  var pendingEmail = '';

  function matchProblem() {
    if (!sPass2.value) return t('e.confirmReq', 'أعد كتابة كلمة المرور.');
    if (sPass2.value !== sPass.value) return t('e.mismatch', 'كلمتا المرور غير متطابقتين.');
    return '';
  }

  sName.addEventListener('input', function () { if (triedUp) setErr(sName, sNameErr, nameProblem(sName.value)); });
  sEmail.addEventListener('input', function () { if (triedUp) setErr(sEmail, sEmailErr, emailFormat(sEmail.value)); });
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
    ok = setErr(sEmail, sEmailErr, emailFormat(sEmail.value)) && ok;
    ok = setErr(sRole, sRoleErr, sRole.value ? '' : t('e.roleReq', 'اختر دورك في المكتب.')) && ok;
    ok = setErr(sPass, sPassErr, newPassProblem(sPass.value)) && ok;
    ok = setErr(sPass2, sPass2Err, matchProblem()) && ok;
    if (CAPTCHA) {
      var upMsg = captchaProblem('up');
      document.getElementById('upCaptchaErr').textContent = upMsg;
      if (upMsg) ok = false;
    }
    if (!ok) {
      var first = signupForm.querySelector('.field.is-bad input, .field.is-bad select');
      if (first) first.focus();
      return;
    }
    if (!sb) { offline(sEmailErr); return; }

    busy(signupForm, true);

    /* قبل إرسال شيء: هل هذه الكلمة معروفة للمهاجمين أصلًا؟
       السؤال لا يكشفها — خمسة أحرف من بصمتها فقط تغادر المتصفح. ولو
       تعذّر السؤال مضينا: خدمة خارجية معطّلة لا تقفل باب التسجيل. */
    SEC.pwnedCount(sPass.value).then(function (n) {
      if (n > 0) {
        busy(signupForm, false);
        setErr(sPass, sPassErr, t('e.pwned', 'هذه الكلمة ظهرت في تسريبات كلمات مرور معروفة — اختر غيرها.'));
        sPass.focus();
        return;
      }
      createAccount();
    });
  });

  function createAccount() {
    var role = ROLES[sRole.value];
    pendingEmail = sEmail.value.trim().toLowerCase();
    otpMode = 'signup';

    sb.auth.signUp({
      email: pendingEmail,
      password: sPass.value,
      options: authOpts('up', {
        emailRedirectTo: backHere(),
        data: {
          full_name: sName.value.trim(),
          role_key: sRole.value,
          role_ar: role.ar,
          role_en: role.en,
          app: 'mirsaad'
        }
      })
    }).then(function (r) {
      busy(signupForm, false);
      captchaSpent('up');
      if (r.error) {
        var m = r.error.message || '';
        /* حدّ الإرسال: الخادم لم يرسل شيئًا. لا بد أن يظهر ذلك صريحًا،
           وإلا انتظر المستخدم رسالة لن تأتي أبدًا. */
        if (r.error.status === 429 || /rate limit/i.test(m)) {
          setErr(sEmail, sEmailErr, t('e.rateLimit', 'تجاوزنا حدّ إرسال الرسائل. انتظر ساعة ثم أعد المحاولة.'));
          return;
        }
        /* Supabase يبتلع نصّ الخطأ الآتي من الخادم ويردّ رسالة واحدة
           عامة. والرفض عند الإنشاء سببه الوحيد الآن أن البريد مؤقّت
           رفضه الخادم، فنعرض الرسالة عند حقل البريد لا في فراغ. */
        if (r.error.status === 500 || /database error/i.test(m)) {
          setErr(sEmail, sEmailErr, t('e.throwaway', 'استخدم بريدًا حقيقيًا، لا بريدًا مؤقتًا.'));
          sEmail.focus();
          return;
        }
        if (/password/i.test(m)) { setErr(sPass, sPassErr, t('e.passWeak', 'اجعلها تحتوي حرفًا ورقمًا على الأقل.')); return; }
        setErr(sEmail, sEmailErr, t('e.signupFail', 'تعذّر إنشاء الحساب. تحقق من البريد ثم أعد المحاولة.'));
        return;
      }
      /* Supabase يردّ بنجاح سواء كان البريد جديدًا أو مسجَّلًا من قبل،
         فلا تكشف الصفحة أيّ الحالتين وقعت — وهذا مقصود. */
      otpLead(pendingEmail);
      showOtp();
    }).catch(function () { busy(signupForm, false); captchaSpent('up'); offline(sEmailErr); });
  }

  /* ---------- رمز التحقق ---------- */
  /* كل إرسال جديد يُبطل الرمز السابق، فلا يُطلب إلا صراحةً.
     ومهلة بين الطلبات: حصة الإرسال صغيرة ومشتركة على المشروع كله، فنقرة
     متكررة تستهلكها فيُحرم منها من يسجّل بعدك. */
  var resendBtn = document.getElementById('otpResend');
  var RESEND_WAIT_MS = 60 * 1000;
  var WAIT_KEY = 'mirsaad.resendAt';
  var waitTimer = null;

  /* المهلة محفوظة لا في الذاكرة وحدها: لو أُعيد تحميل الصفحة لبقيت
     سارية، وإلا لكان تجاوزها بضغطة تحديث. */
  function waitLeftMs() {
    try {
      var until = parseInt(localStorage.getItem(WAIT_KEY) || '0', 10);
      return Math.max(0, until - Date.now());
    } catch (e) { return 0; }
  }
  function paintWait() {
    var left = waitLeftMs();
    if (left <= 0) {
      if (waitTimer) { clearInterval(waitTimer); waitTimer = null; }
      resendBtn.disabled = false;
      resendBtn.textContent = t('o.resend', 'إعادة إرسال الرمز');
      return;
    }
    resendBtn.disabled = true;
    resendBtn.textContent = t('o.resendIn', 'إعادة الإرسال بعد ') +
                            Math.ceil(left / 1000) + t('o.sec', ' ثانية');
    if (!waitTimer) waitTimer = setInterval(paintWait, 1000);
  }
  function startWait() {
    try { localStorage.setItem(WAIT_KEY, String(Date.now() + RESEND_WAIT_MS)); }
    catch (e) { /* التخزين غير متاح */ }
    paintWait();
  }
  paintWait();                       /* مهلة سابقة قد تكون ما زالت سارية */

  function resend() {
    if (!sb || !pendingEmail || waitLeftMs() > 0) return;
    waitErr.textContent = '';
    startWait();

    /* الطريقان مختلفان: تأكيد الحساب يُعاد بـ resend، ورمزا الدخول
       بخطوتين والاستعادة يُطلبان بطلب دخول جديد. */
    var ask = otpMode !== 'signup'
      ? (CAPTCHA ? SEC.freshToken('in') : Promise.resolve('')).then(function (tk) {
          return sb.auth.signInWithOtp({
            email: pendingEmail,
            options: CAPTCHA
              ? { shouldCreateUser: false, captchaToken: tk, emailRedirectTo: backHere() }
              : { shouldCreateUser: false, emailRedirectTo: backHere() }
          });
        })
      : sb.auth.resend({ type: 'signup', email: pendingEmail, options: { emailRedirectTo: backHere() } });

    ask.then(function (r) {
      if (r && r.error) {
        if (r.error.status === 429 || /rate limit/i.test(r.error.message || '')) {
          otpLead(pendingEmail, true);
          waitErr.textContent = t('e.rateLimit', 'تجاوزنا حدّ إرسال الرسائل للمشروع كله. انتظر ساعة، أو اربط مزوّد بريد خاصًا بك.');
          return;
        }
        otpLead(pendingEmail, true);
        waitErr.textContent = t('e.sendFail', 'تعذّر إرسال الرسالة. أعد المحاولة بعد قليل.');
        return;
      }
      waitErr.textContent = t('o.sent', 'أُرسل رمز جديد. تحقق من بريدك ومن مجلد الرسائل غير المرغوب فيها.');
    }).catch(function () { offline(waitErr); });
  }

  resendBtn.addEventListener('click', resend);
  document.getElementById('otpBack').addEventListener('click', function () { showTab(false); });

  /* ---------- استعادة كلمة المرور ----------
     بلا هذا المسار يخرج من نسي كلمته من النظام إلى الأبد، فيُضطر
     المكتب إلى تبديل الكلمات يدويًا — وتلك عادة أسوأ من المشكلة.

     والاستعادة هنا بالرمز لا برابط: الموقع ثابت، والرابط يحتاج
     عنوان عودة مسجَّلًا في لوحة Supabase، والرمز لا يحتاج شيئًا.

     ولا تكون الاستعادة بابًا خلفيًا يتجاوز تطبيق المصادقة: من فعّله
     يُسأل عنه هنا أيضًا. وإلا لكان من ملك البريد وحده قد أبطل
     الخطوة الثانية كلها. */
  var resetForm = document.getElementById('resetForm');
  if (resetForm) {
    var rEmail = document.getElementById('rEmail');
    var rEmailErr = document.getElementById('rEmailErr');

    document.getElementById('goReset').addEventListener('click', showReset);
    document.getElementById('resetBack').addEventListener('click', function () { showTab(false); });

    resetForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!setErr(rEmail, rEmailErr, emailFormat(rEmail.value))) { rEmail.focus(); return; }
      if (!sb) { offline(rEmailErr); return; }

      pendingEmail = rEmail.value.trim().toLowerCase();
      otpMode = 'reset';
      busy(resetForm, true);

      (CAPTCHA ? SEC.freshToken('in') : Promise.resolve('')).then(function (tk) {
        return sb.auth.signInWithOtp({
          email: pendingEmail,
          options: CAPTCHA
            ? { shouldCreateUser: false, captchaToken: tk, emailRedirectTo: backHere() }
            : { shouldCreateUser: false, emailRedirectTo: backHere() }
        });
      }).then(function (r) {
        busy(resetForm, false);
        /* الشاشة تُفتح سواء وُجد الحساب أو لم يوجد. الفرق بين الحالتين
           لا يظهر للزائر، وإلا صارت هذه الصفحة أداةً لمعرفة من هو
           مسجَّل عندنا ومن ليس كذلك. */
        otpLead(pendingEmail);
        showOtp();
        startWait();
        if (r && r.error && (r.error.status === 429 || /rate limit/i.test(r.error.message || ''))) {
          otpLead(pendingEmail, true);
          waitErr.textContent = t('e.rateLimit', 'تجاوزنا حدّ إرسال الرسائل للمشروع كله. انتظر ساعة، أو اربط مزوّد بريد خاصًا بك.');
        }
      }).catch(function () {
        busy(resetForm, false);
        otpLead(pendingEmail);
        showOtp();
        offline(waitErr);
      });
    });
  }

  /* ---------- كلمة المرور الجديدة ---------- */
  var newPassForm = document.getElementById('newPassForm');
  if (newPassForm) {
    var nPass = document.getElementById('nPass');
    var nPass2 = document.getElementById('nPass2');
    var nPassErr = document.getElementById('nPassErr');
    var nPass2Err = document.getElementById('nPass2Err');

    newPassForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = setErr(nPass, nPassErr, newPassProblem(nPass.value));
      var m = !nPass2.value
        ? t('e.confirmReq', 'أعد كتابة كلمة المرور.')
        : (nPass2.value !== nPass.value ? t('e.mismatch', 'كلمتا المرور غير متطابقتين.') : '');
      ok = setErr(nPass2, nPass2Err, m) && ok;
      if (!ok) { (nPassErr.textContent ? nPass : nPass2).focus(); return; }
      if (!sb) { offline(nPassErr); return; }

      busy(newPassForm, true);

      /* الكلمة الجديدة تمرّ بالفحص نفسه: لا معنى لاستعادة تنتهي
         بكلمة معروفة للمهاجمين. */
      SEC.pwnedCount(nPass.value).then(function (n) {
        if (n > 0) {
          busy(newPassForm, false);
          setErr(nPass, nPassErr, t('e.pwned', 'هذه الكلمة ظهرت في تسريبات كلمات مرور معروفة — اختر غيرها.'));
          nPass.focus();
          return;
        }
        return sb.auth.updateUser({ password: nPass.value }).then(function (r) {
          if (r && r.error) {
            busy(newPassForm, false);
            setErr(nPass, nPassErr, t('e.passSaveFail', 'تعذّر حفظ كلمة المرور. أعد المحاولة.'));
            return;
          }
          if (window.MIRSAAD_AUDIT) window.MIRSAAD_AUDIT.log('password_changed');
          nPass.value = ''; nPass2.value = '';
          /* من كان داخلًا بالكلمة القديمة يخرج. لو بقيت جلسته لبقي
             المتطفّل داخلًا بعد الاستعادة التي قُصد بها طرده. */
          return sb.auth.signOut({ scope: 'others' }).catch(function () { /* لا يمنع الدخول */ })
            .then(function () { busy(newPassForm, false); enter(); });
        });
      }).catch(function () {
        busy(newPassForm, false);
        offline(nPassErr);
      });
    });
  }

  /* ---------- الحساب التجريبي ----------
     لا كلمة مرور منشورة ولا حساب على الخادم: جولة في الواجهة وحدها.
     الجلسة التجريبية لا تحمل رمز Supabase، فلا تصل إلى قاعدة البيانات
     بحال — وهذا أمتن من حساب مشترك كلمته مكتوبة في الصفحة. */
  var demoBtn = document.getElementById('demoBtn');
  if (demoBtn) demoBtn.addEventListener('click', function () {
    if (!SB.demoStart()) {
      setErr(email, emailErr, t('e.store', 'تعذّر بدء الجولة — فعّل تخزين المتصفح.'));
      return;
    }
    try {
      localStorage.setItem('mirsaad.session', JSON.stringify({ userId: 'usr-001', email: 'demo' }));
    } catch (e) { /* التخزين غير متاح */ }
    document.body.classList.add('is-leaving');
    setTimeout(function () { location.href = 'board.html#/dashboard'; }, 260);
  });
})();
