/* مِرصاد — صفحة أمان الحساب.

   ثلاثة أشياء يملكها صاحب الحساب هنا بيده: تطبيق المصادقة، وإنهاء
   الجلسات على كل الأجهزة، وقراءة سجلّ دخوله.

   والتفعيل نفسه يتم على الخادم: Supabase يولّد السرّ ويتحقق من أول
   رمز قبل أن يعتمد العامل. فلا يكفي أن نصدّق المتصفح. */
(function () {
  'use strict';

  var SB = window.MIRSAAD_SB;
  var sb = SB && SB.client();
  var AUDIT = window.MIRSAAD_AUDIT;
  if (!sb) return;

  /* الجولة التجريبية لا حساب لها: لا عوامل تحقق ولا جلسات ولا سجلّ.
     فبدل أن نعرض عليها ثلاثة أقسام معطّلة، نردّها إلى اللوحة. */
  if (SB.demoSession()) { location.replace('board.html#/dashboard'); return; }

  function t(key, fallback) {
    var en = document.documentElement.lang === 'en' && window.MIRSAAD_EN;
    return en && key in window.MIRSAAD_EN ? window.MIRSAAD_EN[key] : fallback;
  }

  var mfaState = document.getElementById('mfaState');
  var mfaOff = document.getElementById('mfaOff');
  var mfaOn = document.getElementById('mfaOn');
  var mfaSetup = document.getElementById('mfaSetup');
  var mfaQr = document.getElementById('mfaQr');
  var mfaSecret = document.getElementById('mfaSecret');
  var mfaForm = document.getElementById('mfaForm');
  var mfaCode = document.getElementById('mfaCode');
  var mfaErr = document.getElementById('mfaErr');

  var pendingFactorId = '';

  /* ---------- اسم صاحب الحساب ---------- */
  sb.auth.getUser().then(function (r) {
    var u = r && r.data && r.data.user;
    if (!u) return;
    var el = document.getElementById('secWho');
    var meta = u.user_metadata || {};
    el.textContent = meta.full_name || u.email || el.textContent;
  }).catch(function () { /* الاسم زينة، لا يوقف الصفحة */ });

  /* ---------- حالة تطبيق المصادقة ---------- */
  function paintMfa() {
    sb.auth.mfa.listFactors().then(function (r) {
      var list = (r && r.data && r.data.totp) || [];
      var on = list.length > 0;
      mfaState.textContent = on
        ? t('s2.mfaOn', 'مفعَّل — يُطلب الرمز عند كل دخول.')
        : t('s2.mfaOff', 'غير مفعَّل — الخطوة الثانية تصل إلى بريدك.');
      mfaOn.hidden = !on;
      mfaOff.hidden = on;
      mfaSetup.hidden = true;
      if (on) paintCodesLeft();
    }).catch(function () {
      mfaState.textContent = t('s2.mfaUnknown', 'تعذّر قراءة حالة التحقق. حدّث الصفحة.');
    });
  }
  paintMfa();

  /* ---------- التفعيل ---------- */
  document.getElementById('mfaStart').addEventListener('click', function () {
    mfaErr.textContent = '';
    /* عامل معلّق من محاولة سابقة لم تكتمل يمنع تسجيل عامل جديد،
       فنزيله أولًا بدل أن نُظهر خطأً لا حيلة للمستخدم فيه. */
    sb.auth.mfa.listFactors().then(function (r) {
      var all = (r && r.data && r.data.all) || [];
      var stale = all.filter(function (f) { return f.status !== 'verified'; });
      return Promise.all(stale.map(function (f) {
        return sb.auth.mfa.unenroll({ factorId: f.id });
      }));
    }).then(function () {
      return sb.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'mirsaad-' + Date.now()
      });
    }).then(function (r) {
      if (!r || r.error) throw new Error('enroll');
      pendingFactorId = r.data.id;
      var totp = r.data.totp || {};
      /* Supabase يردّ الرمز صورةً جاهزة؛ والسرّ مكتوبًا لمن يُدخله
         يدويًا أو يقرأ بصعوبة. */
      if (totp.qr_code) mfaQr.src = totp.qr_code;
      mfaSecret.textContent = totp.secret || '';
      mfaSetup.hidden = false;
      mfaCode.focus();
    }).catch(function () {
      mfaErr.textContent = t('s2.mfaStartFail', 'تعذّر بدء التفعيل. أعد المحاولة بعد قليل.');
    });
  });

  mfaCode.addEventListener('input', function () {
    mfaCode.value = mfaCode.value.replace(/[^0-9]/g, '').slice(0, 6);
  });

  mfaForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!/^[0-9]{6}$/.test(mfaCode.value)) {
      mfaErr.textContent = t('e.otpFormat', 'الرمز ستة أرقام.');
      return;
    }
    mfaErr.textContent = '';
    var btn = mfaForm.querySelector('button[type="submit"]');
    btn.disabled = true;

    sb.auth.mfa.challenge({ factorId: pendingFactorId }).then(function (c) {
      if (!c || c.error) throw new Error('challenge');
      return sb.auth.mfa.verify({
        factorId: pendingFactorId,
        challengeId: c.data.id,
        code: mfaCode.value
      });
    }).then(function (v) {
      btn.disabled = false;
      if (v && v.error) {
        mfaErr.textContent = t('e.totpBad', 'الرمز غير صحيح. تحقق من التطبيق وأعد المحاولة.');
        mfaCode.select();
        return;
      }
      mfaCode.value = '';
      if (AUDIT) AUDIT.log('mfa_enrolled');
      loadLog();
      /* الرموز تُعرض فور التفعيل لا بعده: القفل صار حقيقيًا، ومن
         أغلق الصفحة بلا رموز يفقد حسابه يوم يفقد هاتفه. */
      issueCodes().catch(function () {
        mfaErr.textContent = t('s2.codesFail', 'فُعِّل التطبيق، لكن تعذّر توليد رموز الاحتياط. ولّدها من الزرّ.');
        paintMfa();
      });
    }).catch(function () {
      btn.disabled = false;
      mfaErr.textContent = t('e.totpBad', 'الرمز غير صحيح. تحقق من التطبيق وأعد المحاولة.');
    });
  });

  /* ---------- رموز الاحتياط ----------
     تُولَّد في المتصفح وتُعرض مرة واحدة. ولا يغادره منها إلا بصماتها،
     فلا يملك الخادم نسخة يقرؤها أحد. */
  var mfaCodes = document.getElementById('mfaCodes');
  var codesList = document.getElementById('codesList');
  var codesLeft = document.getElementById('codesLeft');

  function paintCodesLeft() {
    sb.rpc('backup_codes_left').then(function (r) {
      var n = (r && typeof r.data === 'number') ? r.data : null;
      if (n === null) { codesLeft.textContent = ''; return; }
      codesLeft.textContent = n > 0
        ? t('s2.codesLeft', 'رموز احتياط متبقية: ') + n
        : t('s2.codesNone', 'لا رموز احتياط. لو فقدت هاتفك لن تدخل. ولّد رموزًا الآن.');
    }).catch(function () { codesLeft.textContent = ''; });
  }

  function issueCodes() {
    return SEC.newBackupCodes(10).then(function (made) {
      return sb.rpc('set_backup_codes', { hashes: made.hashes }).then(function (r) {
        if (r && r.error) throw new Error('store');
        codesList.textContent = '';
        made.codes.forEach(function (c) {
          var li = document.createElement('li');
          li.textContent = c;               /* نصًّا لا شيفرة */
          codesList.appendChild(li);
        });
        mfaCodes.hidden = false;
        mfaOn.hidden = true;
        mfaOff.hidden = true;
      });
    });
  }

  document.getElementById('codesDone').addEventListener('click', function () {
    mfaCodes.hidden = true;
    codesList.textContent = '';           /* لا تبقى في الصفحة بعد إغلاقها */
    paintMfa();
  });

  document.getElementById('codesNew').addEventListener('click', function () {
    var b = document.getElementById('codesNew');
    b.disabled = true;
    issueCodes().catch(function () {
      removeErr.textContent = t('s2.codesFail', 'تعذّر توليد الرموز. أعد المحاولة.');
    }).then(function () { b.disabled = false; });
  });

  /* ---------- الإيقاف ---------- */
  var removeErr = document.getElementById('mfaRemoveErr');
  var removeBtn = document.getElementById('mfaRemove');
  var removeArmed = false;

  removeBtn.addEventListener('click', function () {
    /* إيقاف التحقق بخطوتين يُضعف الحساب، فلا يقع بنقرة واحدة عابرة. */
    if (!removeArmed) {
      removeArmed = true;
      removeBtn.textContent = t('s2.mfaRemoveSure', 'اضغط ثانيةً للتأكيد');
      setTimeout(function () {
        removeArmed = false;
        removeBtn.textContent = t('s2.mfaRemove', 'إيقاف تطبيق المصادقة');
      }, 5000);
      return;
    }
    removeArmed = false;
    removeErr.textContent = '';
    removeBtn.disabled = true;

    sb.auth.mfa.listFactors().then(function (r) {
      var all = (r && r.data && r.data.all) || [];
      return Promise.all(all.map(function (f) {
        return sb.auth.mfa.unenroll({ factorId: f.id });
      }));
    }).then(function () {
      removeBtn.disabled = false;
      removeBtn.textContent = t('s2.mfaRemove', 'إيقاف تطبيق المصادقة');
      if (AUDIT) AUDIT.log('mfa_removed');
      paintMfa();
      loadLog();
    }).catch(function () {
      removeBtn.disabled = false;
      removeErr.textContent = t('s2.mfaRemoveFail', 'تعذّر الإيقاف. أعد المحاولة بعد قليل.');
    });
  });

  /* ---------- إنهاء الجلسات ---------- */
  var killBtn = document.getElementById('killAll');
  var killArmed = false;

  killBtn.addEventListener('click', function () {
    if (!killArmed) {
      killArmed = true;
      killBtn.textContent = t('s2.sessSure', 'اضغط ثانيةً للتأكيد');
      setTimeout(function () {
        killArmed = false;
        killBtn.textContent = t('s2.sessKill', 'إنهاء الجلسات على كل الأجهزة');
      }, 5000);
      return;
    }
    killBtn.disabled = true;
    /* السجلّ يُكتب قبل الخروج: بعده لا تبقى صلاحية للكتابة. */
    var done = AUDIT ? AUDIT.log('sign_out_all') : Promise.resolve();
    done.then(function () {
      /* global يُبطل رموز التحديث في كل مكان لا في هذا المتصفح وحده. */
      return sb.auth.signOut({ scope: 'global' });
    }).then(function () {
      try { localStorage.removeItem('mirsaad.session'); } catch (e) { /* لا شيء */ }
      location.replace('index.html');
    }).catch(function () {
      killBtn.disabled = false;
      killBtn.textContent = t('s2.sessKill', 'إنهاء الجلسات على كل الأجهزة');
    });
  });

  /* ---------- سجلّ الدخول ---------- */
  var KINDS = {
    sign_in_password: ['دخول بكلمة المرور', 'Signed in with password'],
    sign_in_otp:      ['دخول برمز البريد', 'Signed in with an emailed code'],
    sign_in_totp:     ['دخول برمز تطبيق المصادقة', 'Signed in with the authenticator app'],
    sign_out:         ['خروج', 'Signed out'],
    sign_out_all:     ['إنهاء الجلسات على كل الأجهزة', 'Signed out on every device'],
    mfa_enrolled:     ['تفعيل تطبيق المصادقة', 'Authenticator app turned on'],
    mfa_removed:      ['إيقاف تطبيق المصادقة', 'Authenticator app turned off'],
    mfa_failed:       ['رمز تطبيق مصادقة خاطئ', 'Wrong authenticator code']
  };

  /* اسم المتصفح وحده يكفي للتعرّف؛ ولا نعرض سلسلة الوكيل كاملة فهي
     طويلة ولا تُقرأ. */
  function browserOf(ua) {
    if (!ua) return '';
    if (/Edg\//.test(ua)) return 'Edge';
    if (/OPR\//.test(ua)) return 'Opera';
    if (/Firefox\//.test(ua)) return 'Firefox';
    if (/Chrome\//.test(ua)) return 'Chrome';
    if (/Safari\//.test(ua)) return 'Safari';
    return '';
  }
  function deviceOf(ua) {
    if (!ua) return '';
    if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
    if (/Android/.test(ua)) return 'Android';
    if (/Macintosh/.test(ua)) return 'Mac';
    if (/Windows/.test(ua)) return 'Windows';
    if (/Linux/.test(ua)) return 'Linux';
    return '';
  }

  function when(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var en = document.documentElement.lang === 'en';
    try {
      return d.toLocaleString(en ? 'en-GB' : 'ar-KW', {
        dateStyle: 'medium', timeStyle: 'short'
      });
    } catch (e) { return d.toISOString().slice(0, 16).replace('T', ' '); }
  }

  var logList = document.getElementById('logList');

  function loadLog() {
    if (!AUDIT) return;
    AUDIT.recent(25).then(function (rows) {
      logList.textContent = '';
      if (!rows.length) {
        var none = document.createElement('li');
        none.className = 'sec__logempty';
        none.textContent = t('s2.logNone', 'لا أحداث بعد. سيظهر هنا كل دخول قادم.');
        logList.appendChild(none);
        return;
      }
      var en = document.documentElement.lang === 'en';
      rows.forEach(function (row) {
        var li = document.createElement('li');

        var what = document.createElement('span');
        what.className = 'sec__logwhat';
        var pair = KINDS[row.kind];
        what.textContent = pair ? (en ? pair[1] : pair[0]) : row.kind;

        var meta = document.createElement('span');
        meta.className = 'sec__logmeta';
        var bits = [when(row.at)];
        var b = browserOf(row.agent), d = deviceOf(row.agent);
        if (b || d) bits.push([b, d].filter(Boolean).join(' · '));
        meta.textContent = bits.join('  —  ');

        li.appendChild(what);
        li.appendChild(meta);
        logList.appendChild(li);
      });
    });
  }
  loadLog();
})();
