/* مِرصاد — ما تشترك فيه كل الصفحات: اللغة، الوضع، الشريط الجانبي،
   الخروج، وحركة شاشة التحليل. */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var prefersLight = window.matchMedia('(prefers-color-scheme: light)');
  var K = { mode: 'mirsaad-mode', lang: 'mirsaad-lang', session: 'mirsaad-session' };

  function save(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* التخزين غير متاح */ } }
  function load(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

  /* ---------- الوضع ---------- */
  var mode = load(K.mode) || 'auto';
  function resolved() { return mode === 'auto' ? (prefersLight.matches ? 'light' : 'dark') : mode; }
  function applyMode() {
    root.setAttribute('data-mode', resolved());
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', getComputedStyle(root).getPropertyValue('--bg').trim());
    if (window.MirsaadScene) window.MirsaadScene.refresh();
  }
  applyMode();

  var modeBtn = document.getElementById('modeBtn');
  if (modeBtn) modeBtn.addEventListener('click', function () {
    mode = resolved() === 'dark' ? 'light' : 'dark';
    save(K.mode, mode);
    applyMode();
  });
  var onSystem = function () { if (mode === 'auto') applyMode(); };
  if (prefersLight.addEventListener) prefersLight.addEventListener('change', onSystem);
  else if (prefersLight.addListener) prefersLight.addListener(onSystem);

  /* ---------- اللغة ---------- */
  var EN = window.MIRSAAD_EN || {};
  var AR = {};
  var nodes = document.querySelectorAll('[data-i18n]');
  var attrNodes = document.querySelectorAll('[data-i18n-attr]');

  Array.prototype.forEach.call(nodes, function (el) {
    var k = el.getAttribute('data-i18n');
    if (!(k in AR)) AR[k] = el.innerHTML;
    /* وقد يشترك عنصران في مفتاح واحد ويختلف نصّهما العربي — عنوان
       الصفحة يحمل اسم المنصّة وترويستها لا تحمله. فالقاموس لا يكفي
       للعودة إلى العربية، ويحفظ كلُّ عنصر عربيَّته عند نفسه. */
    if (!el.hasAttribute('data-ar')) el.setAttribute('data-ar', el.innerHTML);
  });
  Array.prototype.forEach.call(attrNodes, function (el) {
    var p = el.getAttribute('data-i18n-attr').split(':');
    if (!(p[1] in AR)) AR[p[1]] = el.getAttribute(p[0]) || '';
  });

  var lang = load(K.lang) === 'en' ? 'en' : 'ar';
  function applyLang(next) {
    lang = next;
    var dict = next === 'en' ? EN : AR;
    root.setAttribute('lang', next);
    root.setAttribute('dir', next === 'en' ? 'ltr' : 'rtl');
    Array.prototype.forEach.call(nodes, function (el) {
      var k = el.getAttribute('data-i18n');
      if (next !== 'en') {
        var own = el.getAttribute('data-ar');
        if (own !== null) { el.innerHTML = own; return; }
      }
      if (k in dict) el.innerHTML = dict[k];
    });
    Array.prototype.forEach.call(attrNodes, function (el) {
      var p = el.getAttribute('data-i18n-attr').split(':');
      if (p[1] in dict) el.setAttribute(p[0], dict[p[1]]);
    });
    var label = document.getElementById('langLabel');
    if (label) label.textContent = next === 'en' ? 'ع' : 'EN';
    save(K.lang, next);
    if (whoSync) whoSync();
    if (window.MirsaadScene) window.MirsaadScene.refresh();
  }
  applyLang(lang);

  var langBtn = document.getElementById('langBtn');
  if (langBtn) langBtn.addEventListener('click', function () { applyLang(lang === 'en' ? 'ar' : 'en'); });

  /* ---------- هوية من سجّل دخوله ---------- */
  var whoSync = null;
  var who = document.getElementById('whoAmI');
  if (who && window.MirsaadSession) {
    var s = window.MirsaadSession();
    if (s) {
      // الاسم والدور يتبعان اللغة
      whoSync = function () {
        var en = document.documentElement.lang === 'en';
        var name = (en ? s.nameEn : s.name) || s.email;
        var role = en ? s.roleEn : s.role;
        who.querySelector('b').textContent = name;
        var tag = who.querySelector('.who__role');
        if (tag) tag.textContent = role || '';
        who.setAttribute('title', s.email);
      };
      whoSync();
    }
  }

  /* ---------- الخروج ---------- */
  var outBtn = document.getElementById('outBtn');
  if (outBtn) outBtn.addEventListener('click', function () {
    try {
      localStorage.removeItem(K.session);
      sessionStorage.removeItem(K.session);
      localStorage.removeItem('mirsaad.session');
      sessionStorage.removeItem('mirsaad.session');
    } catch (e) { /* التخزين غير متاح */ }
    location.href = 'index.html';
  });

  /* ---------- الشريط الجانبي على الجوال ---------- */
  var side = document.getElementById('sidenav');
  var sideBtn = document.getElementById('sideToggle');
  if (side && sideBtn) {
    sideBtn.addEventListener('click', function () {
      var open = side.classList.toggle('is-open');
      sideBtn.setAttribute('aria-expanded', String(open));
      document.body.classList.toggle('is-locked', open);
    });
    side.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        side.classList.remove('is-open');
        sideBtn.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('is-locked');
      }
    });
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        side.classList.remove('is-open');
        sideBtn.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('is-locked');
      }
    });
  }

  /* ---------- صفحة التحليل ---------- */
  var steps = document.getElementById('analysisSteps');
  if (steps) {
    var lines = Array.prototype.slice.call(steps.querySelectorAll('.stepline'));
    var bar = document.getElementById('analysisBar');
    var pct = document.getElementById('analysisPct');
    var go = document.getElementById('analysisGo');
    var fmt = function (n) {
      var s = n + '%';
      return root.lang === 'en' ? s
        : s.replace(/\d/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'[+d]; }).replace('%', '٪');
    };

    if (reduced) {
      lines.forEach(function (l) { l.classList.add('is-done'); });
      bar.style.width = '100%';
      pct.textContent = fmt(100);
      go.classList.add('is-ready');
    } else {
      go.classList.remove('is-ready');
      lines.forEach(function (line, n) {
        setTimeout(function () {
          line.classList.add('is-done');
          var v = Math.round(((n + 1) / lines.length) * 100);
          bar.style.width = v + '%';
          pct.textContent = fmt(v);
          if (n === lines.length - 1) setTimeout(function () { go.classList.add('is-ready'); }, 450);
        }, 500 + n * 650);
      });
    }
  }

  /* ---------- صفحة الفحص الجديد ----------
     نموذج فارغ: المستخدم يختار نوع المنشأة والمحافظة والتاريخ والنوع
     والقطاع بنفسه، ويرفع ملفاته. لا شيء هنا مُعبَّأ سلفًا، ولا يُغادر
     الصفحة شيء. */
  var inspFacility = document.getElementById('inspFacility');
  if (inspFacility) {
    var tr = function (key, fallback) {
      return lang === 'en' && key in EN ? EN[key] : fallback;
    };

    /* نوع المنشأة والمحافظة يُملآن من القائمة المشتركة، فالتسميات واحدة
       أينما ظهرت. الإضافة إليهما تكون في assets/facility-types.js وحده. */
    var lists = window.MIRSAAD_LISTS;
    if (lists) {
      lists.fill(document.getElementById('inspFacility'), lists.FACILITY_TYPES, lang);
      lists.fill(document.getElementById('inspGov'), lists.GOVERNORATES, lang);
    }

    /* [الحقل، سطر خطئه، مفتاح الرسالة، الرسالة العربية] */
    var REQ = [
      ['inspFacility','inspFacilityErr','e.facilityReq','اختر نوع المنشأة.'],
      ['inspGov',     'inspGovErr',     'e.govReq',     'اختر المحافظة.'],
      ['inspDate',    'inspDateErr',    'e.dateReq',    'حدّد تاريخ الفحص.'],
      ['inspType',    'inspTypeErr',    'e.typeReq',    'اختر نوع الفحص.'],
      ['inspStaff',   'inspStaffErr',   'e.staffReq',   'اكتب اسم الموظف المسؤول.'],
      ['inspSection', 'inspSectionErr', 'e.sectionReq', 'اختر القطاع المفحوص.']
    ];

    var mark = function (el, err, msg) {
      err.textContent = msg;
      var field = el.closest('.field');
      if (field) field.classList.toggle('is-bad', !!msg);
      return !msg;
    };

    /* يخفي الخطأ بمجرّد أن يُصلح المستخدم الحقل */
    REQ.forEach(function (row) {
      var el = document.getElementById(row[0]);
      var err = document.getElementById(row[1]);
      var clear = function () { if (el.value.trim()) mark(el, err, ''); };
      el.addEventListener('change', clear);
      el.addEventListener('input', clear);
    });

    /* ---------- الملفات ---------- */
    var fileIn = document.getElementById('inspFiles');
    var dropZone = document.getElementById('inspDrop');
    var fileList = document.getElementById('inspFileList');
    var fileNone = document.getElementById('inspFilesNone');
    var fileErr = document.getElementById('inspFilesErr');
    var picked = [];                       /* ما يراه المستخدم هو المرجع */
    var KIND = /\.(jpe?g|png|pdf)$/i;

    var sizeText = function (n) {
      return n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB'
                          : Math.max(1, Math.round(n / 1024)) + ' KB';
    };

    var paint = function () {
      fileList.textContent = '';
      picked.forEach(function (f, i) {
        var chip = document.createElement('span');
        chip.className = 'file';
        var name = document.createElement('b');
        name.textContent = f.name;
        var size = document.createElement('small');
        size.textContent = sizeText(f.size);
        var rm = document.createElement('button');
        rm.type = 'button';
        rm.className = 'file__x';
        rm.textContent = '✕';
        rm.setAttribute('aria-label', tr('a.rmFile', 'إزالة الملف'));
        rm.addEventListener('click', function () { picked.splice(i, 1); paint(); });
        chip.appendChild(document.createElement('i'));
        chip.appendChild(name);
        chip.appendChild(size);
        chip.appendChild(rm);
        fileList.appendChild(chip);
      });
      fileNone.hidden = picked.length > 0;
      if (picked.length) fileErr.textContent = '';
      /* يُعاد بناء قائمة الحقل لتطابق المعروض */
      try {
        var dt = new DataTransfer();
        picked.forEach(function (f) { dt.items.add(f); });
        fileIn.files = dt.files;
      } catch (e) { /* متصفح لا يسمح بالكتابة على files — العرض يكفي */ }
    };

    var take = function (list) {
      var refused = false;
      Array.prototype.forEach.call(list, function (f) {
        if (!KIND.test(f.name)) { refused = true; return; }
        var seen = picked.some(function (p) { return p.name === f.name && p.size === f.size; });
        if (!seen) picked.push(f);
      });
      paint();
      if (refused) fileErr.textContent = tr('e.fileKind', 'تُقبل ملفات JPG و PNG و PDF فقط.');
    };

    fileIn.addEventListener('change', function () { take(fileIn.files); });

    ['dragenter', 'dragover'].forEach(function (ev) {
      dropZone.addEventListener(ev, function (e) {
        e.preventDefault();
        dropZone.classList.add('is-over');
      });
    });
    ['dragleave', 'dragend', 'drop'].forEach(function (ev) {
      dropZone.addEventListener(ev, function () { dropZone.classList.remove('is-over'); });
    });
    dropZone.addEventListener('drop', function (e) {
      e.preventDefault();
      if (e.dataTransfer && e.dataTransfer.files) take(e.dataTransfer.files);
    });
    /* ملف يسقط خارج المنطقة لا يفتحه المتصفح فيضيّع ما كُتب */
    ['dragover', 'drop'].forEach(function (ev) {
      window.addEventListener(ev, function (e) {
        if (!dropZone.contains(e.target)) e.preventDefault();
      });
    });

    paint();

    /* ---------- لا تحليل قبل اكتمال البيانات ---------- */
    var inspGo = document.getElementById('inspGo');
    if (inspGo) inspGo.addEventListener('click', function (e) {
      var stop = null;
      REQ.forEach(function (row) {
        var el = document.getElementById(row[0]);
        var err = document.getElementById(row[1]);
        var msg = el.value.trim() ? '' : tr(row[2], row[3]);
        if (!mark(el, err, msg) && !stop) stop = el;
      });
      if (!picked.length) {
        fileErr.textContent = tr('e.filesReq', 'ارفع ملفًا واحدًا على الأقل من الزيارة.');
        if (!stop) stop = dropZone;
      }
      if (stop) {
        e.preventDefault();
        stop.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
        if (stop !== dropZone) stop.focus();
      }
    });
  }
})();
