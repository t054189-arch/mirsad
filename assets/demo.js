/* مِرصاد — الجولة المُرشدة.

   ليست فيديو ولا موقعًا ثانيًا: تقود الموقعَ نفسه. تفتح صفحاته
   الحقيقية بالترتيب، وتُبرز عناصره الحقيقية، وتملأ حقوله الحقيقية،
   وتضغط أزراره الحقيقية — فما يراه المُقيّم هو مِرصاد يعمل.

   الحساب: الجولة التجريبية القائمة في assets/sb.js — بلا كلمة مرور
   منشورة، وبلا رمز من Supabase، فلا تصل إلى قاعدة البيانات بحال. ولم
   يُنشأ لها مسار دخول ثانٍ: تُضغط زرّ الجولة نفسه في البوابة.

   الحالة في التخزين، فتعبر الجولةُ تنقّلَ الصفحات — والموقع صفحات
   حقيقية لا تطبيقًا ذا صفحة واحدة. */
(function () {
  'use strict';

  /* ---------------------------------------------------------------
     مفتاح التشغيل.

     كان مغلقًا حتى يُطمأنّ إلى التنقّل العادي، وقد اطمُئنّ إليه، فهو
     مفتوح. والعطب الذي أغلقه أوّلًا: حالة الجولة كانت في ‎localStorage‎
     بلا مدّة ولا حدّ، فمن بدأها ثمّ حدّث الصفحة أو عاد في زيارة أخرى
     تُمسك به عند كل تحميل وتنقله إلى حيث بلغت لا إلى حيث طلب — يبدو
     ذلك تجمّدًا وتراكبَ صفحتين، وليس خللًا في التوجيه.

     ودونه الآن ثلاثة أقفال، فلا يعود:
       · الحالة في ‎sessionStorage‎ وحده — لِلسان واحد، تموت بموته.
       · ومعها ختمُ وقت: جولةٌ تُركت عشر دقائق تسقط وحدها.
       · ولا تُستأنف إلا على انتقالٍ وقّعته الجولة نفسها (‎expect‎)،
         فالتحديث وصولٌ بلا توقيع: يُنهيها ولا يعيدها.
     ولا تبدأ إلا من ضغطة الزرّ: لا شيء يشغّلها عند تحميل الصفحة.
     --------------------------------------------------------------- */
  var ENABLED = true;

  var KEY = 'mirsaad.tour';
  var STALE_MS = 10 * 60 * 1000;          /* جولة مهجورة تسقط بعد عشر دقائق */
  var d = document.documentElement;
  function en() { return d.getAttribute('lang') === 'en'; }
  function T(o) { return en() ? o.en : o.ar; }

  /* ---------- المراحل الثماني في الشريط ---------- */
  var RAIL = [
    { k: 'login',    ar: 'تسجيل الدخول',           en: 'Login' },
    { k: 'board',    ar: 'لوحة التحكم',            en: 'Dashboard' },
    { k: 'new',      ar: 'فحص جديد',               en: 'New inspection' },
    { k: 'evidence', ar: 'بيانات الفحص',           en: 'Evidence' },
    { k: 'ai',       ar: 'تحليل الذكاء الاصطناعي', en: 'AI analysis' },
    { k: 'compare',  ar: 'المقارنة',               en: 'Comparison' },
    { k: 'review',   ar: 'مراجعة المستخدم',        en: 'User review' },
    { k: 'report',   ar: 'التقرير النهائي',        en: 'Final report' }
  ];

  /* ---------- بيانات العرض ---------- */
  var DEMO = {
    site:      { ar: 'جسر تجريبي – الكويت', en: 'Demo Bridge – Kuwait' },
    type:      { ar: 'فحص دوري',            en: 'Periodic inspection' },
    component: { ar: 'سطح خرساني لجسر',     en: 'Concrete bridge deck' },
    notes:     { ar: 'فحص ظاهري لسطح الجسر الخرساني. لوحظت عيوب سطحية محتملة تحتاج مراجعة.',
                 en: 'Surface inspection performed on the concrete deck. Potential visible surface defects require further review.' }
  };

  function page() {
    var n = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    return n.replace('.html', '') || 'index';
  }

  /* ---------- الحالة ----------

     في ‎sessionStorage‎ لا ‎localStorage‎: تعبر تنقّل الصفحات في اللسان
     الواحد — وهو ما تحتاجه الجولة — وتموت بموته، فلا تلاحق صاحبها إلى
     زيارة أخرى. ومعها ختمُ وقت: جولةٌ تُركت ولم تتقدّم تسقط وحدها. */
  function read() {
    try {
      var s = JSON.parse(sessionStorage.getItem(KEY) || 'null');
      if (!s) return null;
      if (!s.t || Date.now() - s.t > STALE_MS) { forget(); return null; }
      return s;
    } catch (e) { return null; }
  }
  function write(s) {
    try {
      if (!s) return forget();
      s.t = Date.now();
      sessionStorage.setItem(KEY, JSON.stringify(s));
    } catch (e) { /* التخزين غير متاح */ }
  }
  function forget() {
    try {
      sessionStorage.removeItem(KEY);
      /* ومن علِقت عنده الحالة القديمة في التخزين الدائم، تُمحى عنه */
      localStorage.removeItem(KEY);
    } catch (e) { /* التخزين غير متاح */ }
  }

  /* حالةٌ قديمة باقية من قبل الإصلاح تُمحى عند أوّل تحميل، فلا يبقى
     أحدٌ ممسوكًا بجولة بدأها في زيارة ماضية. */
  try { if (localStorage.getItem(KEY)) localStorage.removeItem(KEY); } catch (e) { /* لا شيء */ }

  var state = read();
  var stop = false;                       /* أُلغيت الجولة في هذه الصفحة */

  /* ---------- انتظار يحترم الإيقاف ---------- */
  function wait(ms) {
    return new Promise(function (resolve) {
      var left = ms, last = Date.now();
      (function tick() {
        if (stop) return;
        var now = Date.now();
        if (!state.paused) left -= now - last;
        last = now;
        if (left <= 0) return resolve();
        requestAnimationFrame(tick);
      })();
    });
  }
  function until(test, cap) {
    var end = Date.now() + (cap || 20000);
    return new Promise(function (resolve) {
      (function tick() {
        if (stop) return;
        if (test() || Date.now() > end) return resolve(test());
        requestAnimationFrame(tick);
      })();
    });
  }

  /* ---------- قشرة الجولة ---------- */
  var ui = {};
  function chrome() {
    /* قشرة واحدة لا غير: إن بقيت واحدة من تحميل سابق تُنزع أوّلًا */
    var stale = document.querySelectorAll('.dmo');
    for (var i = 0; i < stale.length; i++) stale[i].remove();

    var root = document.createElement('div');
    root.className = 'dmo';
    root.setAttribute('dir', d.getAttribute('dir') || 'rtl');
    root.innerHTML =
      '<div class="dmo__ring" hidden></div>' +
      '<div class="dmo__say" hidden><b class="dmo__tag"></b><p class="dmo__txt"></p></div>' +
      '<div class="dmo__rail" role="list"></div>' +
      '<div class="dmo__bar">' +
        '<span class="dmo__mode"></span>' +
        '<button type="button" class="dmo__b" data-a="play"></button>' +
        '<button type="button" class="dmo__b" data-a="again"></button>' +
        '<button type="button" class="dmo__b dmo__b--x" data-a="exit"></button>' +
      '</div>';
    document.body.appendChild(root);
    ui.root = root;
    ui.ring = root.querySelector('.dmo__ring');
    ui.say  = root.querySelector('.dmo__say');
    ui.tag  = root.querySelector('.dmo__tag');
    ui.txt  = root.querySelector('.dmo__txt');
    ui.rail = root.querySelector('.dmo__rail');
    ui.play = root.querySelector('[data-a="play"]');

    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-a]');
      if (!b) return;
      var a = b.getAttribute('data-a');
      if (a === 'play') setPaused(!state.paused);
      if (a === 'again') restart();
      if (a === 'exit') exit();
    });
    paintRail();
    paintBar();
  }

  function paintRail() {
    var now = railIndex();
    ui.rail.innerHTML = RAIL.map(function (s, i) {
      var cls = 'dmo__step' + (i === now ? ' is-now' : (i < now ? ' is-done' : ''));
      return '<span class="' + cls + '" role="listitem">' +
             '<i>' + String(i + 1).padStart(2, '0') + '</i>' +
             '<b>' + T(s) + '</b></span>';
    }).join('');
  }

  function paintBar() {
    ui.root.querySelector('.dmo__mode').textContent = T({ ar: 'وضع التجربة', en: 'Demo mode' });
    ui.play.textContent = state.paused ? T({ ar: '▶ متابعة', en: '▶ Continue' })
                                       : T({ ar: '⏸ إيقاف مؤقت', en: '⏸ Pause' });
    ui.root.querySelector('[data-a="again"]').textContent = T({ ar: '↻ إعادة العرض', en: '↻ Restart' });
    ui.root.querySelector('[data-a="exit"]').textContent =
      T({ ar: '✕ إنهاء الجولة', en: '✕ Exit demo' });
  }

  function setPaused(v) {
    state.paused = v;
    write(state);
    ui.root.classList.toggle('is-paused', v);
    paintBar();
  }

  /* ---------- الإبراز والشرح ---------- */
  function spot(el) {
    if (!el) { ui.ring.hidden = true; return null; }
    try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) { el.scrollIntoView(); }
    var r = el.getBoundingClientRect();
    if (!r.width && !r.height) { ui.ring.hidden = true; return null; }
    var pad = 6;
    ui.ring.hidden = false;
    ui.ring.style.top = (r.top - pad) + 'px';
    ui.ring.style.left = (r.left - pad) + 'px';
    ui.ring.style.width = (r.width + pad * 2) + 'px';
    ui.ring.style.height = (r.height + pad * 2) + 'px';
    return r;
  }

  function say(tag, text, el, low) {
    ui.say.hidden = false;
    ui.tag.textContent = tag || '';
    ui.tag.hidden = !tag;
    ui.txt.textContent = text;
    /* البطاقة لا تحجب ما تشرحه: تقف تحته إن كان في أعلى الشاشة وفوقه
       إن كان في أسفلها، وتتوسّط حين لا عنصر. */
    var r = el ? el.getBoundingClientRect() : null;
    if (!r) {
      ui.say.className = 'dmo__say ' + (low ? 'dmo__say--low' : 'dmo__say--mid');
      ui.say.style.top = '';
      return;
    }
    ui.say.className = 'dmo__say';
    /* تُقاس البطاقة بعد ملئها، فيُعرف أين تتّسع. والعنصر المُبرَز قد
       يطول حتى لا يبقى تحته ولا فوقه متّسع، فتنزل إلى أسفل الشاشة فوق
       لوح التحكّم — ولا تقف فوق ما تشرحه بحال. */
    var h = ui.say.offsetHeight, gap = 14, edge = 12, bar = 76;
    var below = window.innerHeight - r.bottom - bar;
    var above = r.top - edge;
    var top;
    if (below >= h + gap) top = r.bottom + gap;
    else if (above >= h + gap) top = r.top - h - gap;
    else top = window.innerHeight - bar - h;
    ui.say.style.top = Math.max(edge, top) + 'px';
  }

  function railIndex() {
    var a = ACTS[Math.min(state.i, ACTS.length - 1)];
    var k = a ? a.rail : RAIL[RAIL.length - 1].k;
    for (var i = 0; i < RAIL.length; i++) if (RAIL[i].k === k) return i;
    return 0;
  }

  /* ---------- أفعال على الصفحة ---------- */
  function $(sel) { return document.querySelector(sel); }

  function set(el, value) {
    if (!el) return;
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function optionBy(sel, test) {
    var el = $(sel);
    if (!el) return null;
    for (var i = 0; i < el.options.length; i++) {
      if (test(el.options[i])) return el.options[i].value;
    }
    return null;
  }

  /* انتقالٌ واحد لا غير من كل خطوة.

     كان العطب هنا: خطوةٌ تضغط زرًّا حقيقيًّا فيبدأ الموقع انتقاله
     (‎board.html#/dashboard‎ بعد جزء من الثانية)، وحلقةُ التشغيل لا
     تنتظره فتقرأ الخطوة التالية وتنتقل هي أيضًا — إلى ‎board.html‎
     بلا مسار. فيسبق انتقالُنا انتقالَه، وتفتح الحزمة صفحتَها
     التعريفية داخل قشرة اللوحة: صفحتان في شاشة واحدة.

     فكلّ ما يبدأ انتقالًا يُسكِت المحرّك عن هذه الصفحة. */
  function handoff(next) {
    stop = true;
    /* كل انتقالٍ تصنعه الجولة يُوقَّع باسم الصفحة المقصودة. ويُقرأ
       التوقيع مرّةً واحدة عند الوصول ثمّ يُمحى، فتحديثُ الصفحة — وهو
       وصولٌ بلا توقيع — يُنهي الجولة ولا يستأنفها ولا يعيد تشغيلها. */
    state.expect = next || null;
    write(state);
  }

  function go(p, hash) {
    handoff(p);
    location.href = p + '.html' + (hash || '');
  }

  /* ---------- لوح الأدلّة ----------
     لا يُزوَّر رفعُ ملفات: تُعرض أدلّة العرض في لوح مستقلّ موسوم، إلى
     جانب حقل الرفع الحقيقي كما هو. والصور من مجموعة البيانات المرجعية
     نفسها التي تستعملها صفحة النتائج. */
  var SHOTS = [
    'metricea-lab-380/cracked/IMG_1277.jpg',
    'metricea-lab-380/cracked/IMG_1394.jpg',
    'metricea-lab-380/uncracked/IMG_1935.jpg'
  ];
  var BUCKET = 'https://sbeftcrvveonvgxetcxq.supabase.co/storage/v1/object/public/reference-images/';

  function evidence() {
    if ($('.dmoev')) return $('.dmoev');
    var host = $('#inspFileList');
    if (!host) return null;
    var box = document.createElement('div');
    box.className = 'dmoev';
    box.innerHTML =
      '<p class="dmoev__h"><span class="dmoev__tag">' + T({ ar: 'وضع التجربة', en: 'Demo mode' }) + '</span> ' +
        T({ ar: 'أدلّة الفحص', en: 'Inspection evidence' }) + '</p>' +
      '<div class="dmoev__g">' + SHOTS.map(function (s) {
        return '<img src="' + BUCKET + s + '" alt="" loading="lazy" decoding="async" width="768" height="1024" />';
      }).join('') + '</div>' +
      '<p class="dmoev__n">' + T({
        ar: 'بيانات حقيقية مستخدمة لأغراض العرض — صور أسطح خرسانية من مجموعة مرجعية منشورة، لا صور منشأة كويتية.',
        en: 'Real-world dataset used for demonstration — published concrete-surface imagery, not photographs of any Kuwaiti structure.'
      }) + '</p>' +
      '<div class="dmoev__r"><span>' + T({ ar: 'ملاحظات', en: 'Notes' }) + '</span><b>' + T(DEMO.notes) + '</b></div>' +
      '<div class="dmoev__r"><span>' + T({ ar: 'قياسات', en: 'Measurements' }) + '</span><b dir="ltr">0.6 mm → 1.4 mm</b></div>' +
      '<div class="dmoev__r"><span>' + T({ ar: 'الفحص السابق', en: 'Previous inspection' }) + '</span><b>INSP-2024-033</b></div>';
    host.parentNode.insertBefore(box, host);
    return box;
  }

  /* ---------- النصّ ---------- */
  var ACTS = [
    { rail: 'login', page: 'index', run: async function () {
        say('INPUT', T({ ar: 'مرصاد يبدأ من حساب المستخدم، لضمان حماية بيانات الفحوصات.',
                         en: 'MIRSAAD starts from a user account, so inspection data stays protected.' }));
        await wait(3200);
        var b = $('#demoBtn');
        spot(b);
        say('', T({ ar: 'الدخول بالحساب التجريبي — بلا كلمة مرور منشورة، وبلا وصول إلى بيانات حقيقية.',
                    en: 'Signing in with the demo account — no published password, no access to real data.' }), b);
        await wait(2800);
        state.i++;
        if (b) { handoff('board'); b.click(); } else { go('board', '#/dashboard'); }
      } },

    { rail: 'board', page: 'board', hash: '#/dashboard', run: async function () {
        say('', T({ ar: 'هذه هي لوحة التحكم، ومنها يصل المستخدم إلى منشآته وفحوصاته السابقة ويبدأ فحصًا جديدًا.',
                    en: 'This is the dashboard: structures, past inspections, and the start of a new one.' }));
        await wait(3600);
        var b = await pick('a[href="#/inspections/new"]');
        spot(b);
        say('', T({ ar: 'من هنا يبدأ المستخدم عملية فحص جديدة.',
                    en: 'This is where a new inspection begins.' }), b);
        await wait(2600);
        state.i++;
        if (b) { handoff('inspection'); b.click(); } else { go('inspection'); }
      } },

    { rail: 'new', page: 'inspection', run: async function () {
        say('INPUT', T({ ar: 'هنا يدخل المستخدم بيانات الفحص، وهذه نقطة الإدخال التي يبدأ منها الوكيل.',
                         en: 'The inspector enters the inspection data — the input the agent starts from.' }));
        await wait(3000);

        var bridge = optionBy('#inspFacility', function (o) { return o.value === 'bridge'; });
        spot($('#inspFacility')); set($('#inspFacility'), bridge); await wait(700);
        spot($('#inspGov'));      set($('#inspGov'), 'capital');   await wait(700);
        spot($('#inspDate'));     set($('#inspDate'), '2026-09-20'); await wait(700);

        var periodic = optionBy('#inspType', function (o) { return o.value === 'routine'; });
        spot($('#inspType'));     set($('#inspType'), periodic || $('#inspType').options[1].value); await wait(700);
        spot($('#inspStaff'));    set($('#inspStaff'), T({ ar: 'مستخدم تجريبي', en: 'Demo User' })); await wait(700);

        /* بالقيمة لا بالنصّ: «الركائز والسطح السفلي» تحوي «سطح» أيضًا */
        var deck = optionBy('#inspSection', function (o) { return o.value === 'deck'; });
        spot($('#inspSection'));  set($('#inspSection'), deck || $('#inspSection').options[1].value); await wait(700);

        spot($('#inspNotes'));    set($('#inspNotes'), T(DEMO.notes));
        say('', T({ ar: 'المنشأة: جسر تجريبي – الكويت · فحص دوري · سطح خرساني لجسر.',
                    en: 'Structure: Demo Bridge – Kuwait · Periodic inspection · Concrete bridge deck.' }), $('#inspNotes'));
        await wait(3000);
        state.i++;
      } },

    { rail: 'evidence', page: 'inspection', run: async function () {
        var box = evidence();
        spot(box);
        say('', T({ ar: 'المستخدم يرفع أدلّة الفحص: الصور والملاحظات والقياسات ومرجع الفحص السابق.',
                    en: 'The inspector uploads the evidence: images, notes, measurements, and the previous inspection.' }), box);
        await wait(4200);
        var b = $('#inspGo');
        spot(b);
        say('', T({ ar: 'ثم يُسلّم الملفّ إلى الوكيل الذكي.', en: 'Then it goes to the agent.' }), b);
        await wait(2400);
        state.i++;
        go('analysis');
      } },

    { rail: 'ai', page: 'analysis', run: async function () {
        say('AI AGENT', T({ ar: 'يحلّل الوكيل الصور، ويسترجع سجلّ المنشأة، ويقارن النتائج بالفحوصات السابقة.',
                            en: 'The agent reads the images, retrieves the structure’s record, and compares with past inspections.' }));
        spot($('#analysisSteps'));
        await until(function () {
          var g = $('#analysisGo');
          return g && g.classList.contains('is-ready');
        }, 24000);
        await wait(900);
        var g = $('#analysisGo');
        spot(g);
        await wait(1600);
        state.i++;
        go('results');
      } },

    { rail: 'compare', page: 'results', run: async function () {
        say('COMPARISON', T({ ar: 'ما استخرجه الوكيل من هذا الفحص، مرتّبًا حسب الأولوية. النتائج مَعروضة للمراجعة لا مُعتمدة.',
                              en: 'What the agent extracted, ordered by priority — offered for review, not decided.' }));
        await wait(3800);
        var row = document.querySelectorAll('.rowcard')[0];
        spot(row);
        say('', T({ ar: 'نتيجة عرض — احتمال وجود تشقق في الركيزة رقم ٢.',
                    en: 'Demo AI result — potential crack at pier 2.' }), row);
        await wait(3000);
        state.i++;
        go('review');
      } },

    { rail: 'compare', page: 'review', run: async function () {
        var c = $('.cmp');
        spot(c);
        say('COMPARISON', T({ ar: 'مرصاد لا يكتفي بالملاحظة الحالية: يرجع إلى سجلّ المنشأة ويقارنها بالفحوصات السابقة.',
                              en: 'MIRSAAD does not stop at today’s finding: it returns to the record and compares with earlier inspections.' }), c);
        await wait(4200);
        state.i++;
      } },

    { rail: 'review', page: 'review', run: async function () {
        var acts = $('.acts');
        spot(acts);
        say('USER REVIEW', T({ ar: 'الذكاء الاصطناعي لا يتخذ القرار النهائي — المستخدم هو صاحب القرار.',
                               en: 'The AI does not make the final decision — the user does.' }), acts);
        await wait(4200);
        var ok = acts && acts.querySelector('.ui--ok');
        spot(ok);
        say('', T({ ar: 'وهنا يعتمد المراجِع الملاحظة.', en: 'The reviewer approves the finding.' }), ok);
        await wait(2400);
        state.i++;
        if (ok) { handoff('record'); ok.click(); } else { go('record'); }
      } },

    { rail: 'report', page: 'record', run: async function () {
        say('LIVE RECORD', T({ ar: 'اعتُمدت الملاحظة، وحُدّث سجلّ المنشأة، وأُرشف الفحص، وأُرسل الإشعار.',
                               en: 'Finding approved, record updated, inspection archived, notification sent.' }));
        await wait(3600);
        var hist = $('.hist');
        spot(hist);
        say('', T({ ar: 'كل فحص جديد يصبح جزءًا من بيانات الفحص القادم.',
                    en: 'Every new inspection becomes data for the next one.' }), hist);
        await wait(4000);
        state.i++;
        go('report');
      } },

    { rail: 'report', page: 'report', run: async function () {
        spot(null);
        say('', T({ ar: 'وهذا التقرير النهائي: المنشأة، والفحص، والمقارنة، وخلاصة الوكيل، وقرار المراجِع، وسجلّ المنشأة.',
                    en: 'The final report: structure, inspection, comparison, agent summary, reviewer decision, and history.' }), null, true);
        await wait(5000);
        say('', T({ ar: 'انتهت الجولة. لك أن تعيدها أو تخرج منها وتتصفّح مرصاد بنفسك.',
                    en: 'That is the tour. Replay it, or exit and explore MIRSAAD yourself.' }), null, true);
        ui.root.classList.add('is-done');
        state.done = true;
        write(state);
      } }
  ];

  function pick(sel) {
    return until(function () { return !!$(sel); }, 12000).then(function () { return $(sel); });
  }

  /* ---------- التحكّم ---------- */
  function restart() {
    state = { on: true, i: 0, paused: false, expect: 'index' };
    write(state);
    location.href = 'index.html';
  }

  /* الخروج يمحو الجولة محوًا: تُنزع قشرتُها ولوحُ أدلّتها من الصفحة،
     وتُفكّ مؤقّتاتها ومراقبوها ومستمعوها، ويُمحى مفتاحها من التخزين
     (وكذلك المفتاح القديم إن بقي). فلا يبقى منها شيء يُستأنف. */
  function exit() {
    teardown();
    write(null);
    state = { on: false, done: true, paused: false };
    if (ui.root) { ui.root.remove(); ui = {}; }
    var ev = document.querySelector('.dmoev');
    if (ev) ev.remove();
    document.body.classList.remove('dmo-on');
  }

  /* أيّ لمسة من المُقيّم توقف التلقائية وتترك له الموقع.

     والمستمعُ محفوظٌ في متغيّر لا مجهولًا في مكانه، ليُنزع كما رُكّب
     حين تنتهي الجولة — فلا يبقى بعدها مستمعٌ يلتقط لمسات الموقع. */
  var HANDS = ['pointerdown', 'keydown', 'wheel'];
  function onHand(e) {
    if (!state || state.paused || state.done) return;
    if (e.target && e.target.closest && e.target.closest('.dmo')) return;
    if (e.isTrusted === false) return;
    setPaused(true);
  }
  function watchHands() {
    HANDS.forEach(function (t) { window.addEventListener(t, onHand, true); });
  }
  function unwatchHands() {
    HANDS.forEach(function (t) { window.removeEventListener(t, onHand, true); });
  }

  /* ---------- التشغيل ---------- */
  async function run() {
    var here = page();
    while (!stop && state.i < ACTS.length) {
      var a = ACTS[state.i];
      if (a.page !== here) { go(a.page, a.hash); return; }
      paintRail();
      await a.run();
      paintRail();
      write(state);
    }
  }

  var watcher = null;

  function boot() {
    if (!ENABLED) { hideButton(); return; }
    if (!state || !state.on) return;

    /* لا تُستأنف الجولة إلا على انتقالٍ وقّعته بنفسها. فإن وصلنا إلى
       صفحةٍ غير التي وقّعت — أو بلا توقيع أصلًا، وذلك حالُ التحديث —
       فليست هذه خطوةَ جولة: تُمحى الحالة ويُترك الموقع كما هو. */
    var hop = state.expect;
    if (hop !== page()) { forget(); state = null; return; }
    state.expect = null;
    write(state);

    /* الجولة تبدأ مرّةً واحدة في الصفحة الواحدة مهما تكرّر تحميل الملفّ */
    if (window.__mirsaadTour) return;
    window.__mirsaadTour = true;

    document.body.classList.add('dmo-on');
    chrome();
    watchHands();
    setPaused(!!state.paused);
    watcher = new MutationObserver(function () { paintRail(); paintBar(); });
    watcher.observe(d, { attributes: true, attributeFilter: ['lang'] });
    window.addEventListener('resize', onResize);

    /* عند مغادرة الصفحة: تُوقَف المؤقّتات والمراقبون ويُنزع ما رُسم،
       فلا يبقى من خطوةٍ ماضية أثرٌ على الصفحة التالية. */
    window.addEventListener('pagehide', teardown);
    run();
  }

  function onResize() { if (ui.ring) ui.ring.hidden = true; }

  function teardown() {
    stop = true;                            /* تقف المؤقّتات عند أوّل نبضة */
    if (watcher) { watcher.disconnect(); watcher = null; }
    unwatchHands();
    window.removeEventListener('resize', onResize);
    window.removeEventListener('pagehide', teardown);
    window.__mirsaadTour = false;
  }

  window.MIRSAAD_DEMO = {
    enabled: function () { return ENABLED; },
    /* المدخل الوحيد: ضغطةُ الزرّ في البوابة. ولا يُستدعى من تلقاء
       التحميل بحال. وإن كانت جولةٌ قائمة فُكّت أوّلًا، فلا تجتمع
       جولتان في لسان واحد. */
    start: function () {
      if (!ENABLED) return false;
      teardown();
      stop = false;
      state = { on: true, i: 0, paused: false, expect: 'index' };
      write(state);
      if (page() === 'index') { location.reload(); } else { location.href = 'index.html'; }
      return true;
    },
    exit: function () { exit(); },
    running: function () { var s = read(); return !!(s && s.on); }
  };

  function hideButton() {
    var b = document.getElementById('tourBtn');
    if (b) b.hidden = true;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
