/* مِرصاد — ما تفعله الصفحات الأربع حين يكون سير العمل موصولًا.

   يعتمد على assets/agent.js (النقل والقراءة) ويُحمّل بعد chrome.js،
   فتكون لقطة الترجمة الثابتة قد طُبّقت قبل أن يرسم هذا الملف شيئًا.

   كل نصّ قادم من سير العمل يُكتب بـ textContent لا innerHTML: الجواب
   يأتي من خارج الموقع، فلا يُسمح له بحقن وسوم.
*/
(function () {
  'use strict';

  var A = window.MirsaadAgent;
  if (!A) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function el(id) { return document.getElementById(id); }
  function en() { return document.documentElement.lang === 'en'; }

  function human(bytes) {
    if (bytes < 1024) return A.num(bytes) + ' B';
    if (bytes < 1024 * 1024) return A.num((bytes / 1024).toFixed(0)) + ' KB';
    return A.num((bytes / 1048576).toFixed(1)) + ' MB';
  }

  /* صورة من سير العمل: روابط الويب وبيانات الصور فقط */
  function safeImage(url) {
    if (!url) return '';
    var u = String(url).trim();
    if (/^https?:\/\//i.test(u)) return u;
    if (/^data:image\/(png|jpe?g|gif|webp|avif);base64,/i.test(u)) return u;
    return '';
  }

  function titleOf(f)  { return (en() && f.titleEn ? f.titleEn : f.title) || ''; }
  function whereOf(f)  { return (en() && f.locationEn ? f.locationEn : f.location) || ''; }
  function levelOf(f)  { return A.t(f.severity === 'hi' ? 'lv.hi' : f.severity === 'ok' ? 'lv.ok' : 'lv.mid'); }

  /* ==================== صفحة الفحص: جمع ما يُرسل ==================== */
  var input = el('fileInput');
  if (input) {
    var chosen = [];
    var list = el('fileList'), note = el('fileNote'), zone = el('dropZone');
    var start = el('startAnalysis'), notes = el('fieldNotes');

    function drawFiles() {
      list.textContent = '';
      chosen.forEach(function (f, i) {
        var row = document.createElement('span');
        row.className = 'file';

        var ico = document.createElement('i');
        var name = document.createElement('b');
        name.textContent = f.name;
        var size = document.createElement('small');
        size.textContent = human(f.size);

        var drop = document.createElement('button');
        drop.type = 'button';
        drop.className = 'file__x';
        drop.setAttribute('aria-label', A.t('ag.remove'));
        drop.textContent = '×';
        drop.addEventListener('click', function () { chosen.splice(i, 1); drawFiles(); });

        row.appendChild(ico); row.appendChild(name); row.appendChild(size); row.appendChild(drop);
        list.appendChild(row);
      });
      note.textContent = chosen.length
        ? A.num(chosen.length) + ' ' + A.t('ag.count')
        : A.t('ag.none');
    }

    function add(files) {
      Array.prototype.forEach.call(files, function (f) {
        var twice = chosen.some(function (c) {
          return c.name === f.name && c.size === f.size && c.lastModified === f.lastModified;
        });
        if (!twice) chosen.push(f);
      });
      drawFiles();
    }

    input.addEventListener('change', function () { add(input.files); input.value = ''; });

    if (zone) {
      ['dragenter', 'dragover'].forEach(function (ev) {
        zone.addEventListener(ev, function (e) {
          e.preventDefault();
          zone.classList.add('is-over');
        });
      });
      ['dragleave', 'drop'].forEach(function (ev) {
        zone.addEventListener(ev, function () { zone.classList.remove('is-over'); });
      });
      zone.addEventListener('drop', function (e) {
        e.preventDefault();
        if (e.dataTransfer && e.dataTransfer.files) add(e.dataTransfer.files);
      });
    }

    /* «بدء التحليل» يحفظ المسودّة أولًا ثم ينتقل — والرابط يبقى رابطًا
       فمن عطّل JavaScript ينتقل كما كان. */
    if (start) start.addEventListener('click', function (e) {
      e.preventDefault();
      var meta = { notes: notes ? notes.value : '', at: new Date().toISOString() };
      Array.prototype.forEach.call(document.querySelectorAll('[data-meta]'), function (node) {
        meta[node.getAttribute('data-meta')] = node.textContent.trim();
      });
      A.reset();
      A.saveDraft({ meta: meta, files: chosen })
        .catch(function () { /* بلا IndexedDB نكمل بالبيانات وحدها */ })
        .then(function () { location.href = 'analysis.html'; });
    });

    A.onLang(drawFiles);
    drawFiles();
  }

  /* ==================== صفحة التحليل: النداء الحقيقي ==================== */
  var steps = el('analysisSteps');
  if (steps) {
    var lines = Array.prototype.slice.call(steps.querySelectorAll('.stepline'));
    var bar = el('analysisBar'), pctText = el('analysisPct'), go = el('analysisGo');
    var big = el('analysisBig'), sub = el('analysisSub'), errBox = el('analysisErr');
    var errMsg = el('analysisErrMsg'), errDetail = el('analysisErrDetail');
    var retry = el('analysisRetry');
    var ticker = null;
    /* حالة واحدة يرسمها paintState، فلا يقول العنوان «جارٍ التحليل»
       بينما الصندوق تحته يقول إن النداء فشل. */
    var subKey = 'a.analysingSub';
    var failure = null;

    function paintState() {
      if (failure) {
        if (big) big.textContent = A.t('ag.failed');
        if (sub) sub.hidden = true;
        errMsg.textContent = A.t(failure.key || 'ag.errNet');
        return;
      }
      if (big) big.textContent = A.t('m5.a');
      if (sub) { sub.hidden = false; sub.textContent = A.t(subKey); }
    }

    function setPct(v) {
      bar.style.width = v + '%';
      pctText.textContent = A.pct(v);
    }
    function markTo(n) {
      lines.forEach(function (l, i) { l.classList.toggle('is-done', i < n); });
    }
    function finish() {
      if (ticker) { clearInterval(ticker); ticker = null; }
      markTo(lines.length);
      setPct(100);
      go.classList.add('is-ready');
    }

    /* بلا وكيل موصول: الحركة المُعدّة كما كانت قبل الوصل */
    function demo() {
      if (reduced) { finish(); return; }
      go.classList.remove('is-ready');
      lines.forEach(function (line, n) {
        setTimeout(function () {
          line.classList.add('is-done');
          setPct(Math.round(((n + 1) / lines.length) * 100));
          if (n === lines.length - 1) setTimeout(function () { go.classList.add('is-ready'); }, 450);
        }, 500 + n * 650);
      });
    }

    function fail(e) {
      if (ticker) { clearInterval(ticker); ticker = null; }
      go.classList.remove('is-ready');
      go.hidden = true;
      failure = e || {};
      paintState();
      if (e && e.detail) { errDetail.textContent = e.detail; errDetail.hidden = false; }
      else errDetail.hidden = true;
      errBox.hidden = false;
    }

    function live() {
      errBox.hidden = true;
      go.hidden = false;
      go.classList.remove('is-ready');
      markTo(0);
      setPct(0);
      failure = null;
      subKey = 'ag.sending';
      paintState();

      /* لا يعطي الـ webhook تقدّمًا حقيقيًا، فالخطوات تمشي بالوقت —
         لكن الخطوة الأخيرة و١٠٠٪ لا تُشعلان إلا بوصول الجواب فعلًا. */
      if (!reduced) {
        var stage = 0;
        ticker = setInterval(function () {
          if (stage >= lines.length - 1) return;
          stage++;
          markTo(stage);
          setPct(Math.min(90, Math.round((stage / lines.length) * 100)));
          if (stage === 1) { subKey = 'ag.working'; paintState(); }
        }, 1100);
      } else {
        markTo(lines.length - 1);
        setPct(75);
      }

      A.loadDraft().catch(function () { return null; }).then(function (draft) {
        if (!draft) throw { mirsaad: true, key: 'ag.errNoDraft', detail: '' };
        return A.send(draft);
      }).then(function (result) {
        A.saveResult(result);
        subKey = 'ag.live';
        paintState();
        finish();
      }, fail);
    }

    if (retry) retry.addEventListener('click', live);

    if (A.configured()) { A.onLang(paintState); live(); } else { A.reset(); demo(); }
  }

  /* ==================== صفحة النتائج ==================== */
  var liveBox = el('liveFindings');
  if (liveBox) {
    var demoBox = el('demoFindings'), srcNote = el('resSrc'), accChip = el('resAcc');

    function card(f, i) {
      var a = document.createElement('a');
      a.className = 'rowcard rowcard--go';
      a.href = 'review.html';
      a.addEventListener('click', function () { A.pick(i); });

      var img = document.createElement('span');
      img.className = 'rowcard__img';
      var photo = safeImage(f.image);
      if (photo) {
        img.classList.add('rowcard__img--photo');
        img.style.backgroundImage = 'url("' + photo.replace(/["\\]/g, encodeURIComponent) + '")';
      }

      var text = document.createElement('span');
      text.className = 'rowcard__t';
      var head = document.createElement('b');
      head.textContent = titleOf(f);
      var where = document.createElement('small');
      where.textContent = whereOf(f);
      text.appendChild(head);
      text.appendChild(where);

      var pill = document.createElement('span');
      pill.className = 'pill pill--' + f.severity;
      pill.textContent = levelOf(f);

      a.appendChild(img); a.appendChild(text); a.appendChild(pill);
      return a;
    }

    function paintResults() {
      var r = A.loadResult();
      if (!r) {
        liveBox.hidden = true;
        demoBox.hidden = false;
        srcNote.textContent = A.t(A.configured() ? 'ag.norun' : 'ag.demo');
        return;
      }
      demoBox.hidden = true;
      liveBox.hidden = false;
      srcNote.textContent = A.t('ag.live');
      if (r.accuracy !== null && r.accuracy !== undefined) {
        accChip.textContent = A.t('ag.acc') + ' ' + A.pct(r.accuracy);
        accChip.hidden = false;
      } else {
        accChip.hidden = true;
      }
      liveBox.textContent = '';
      if (!r.findings.length) {
        var none = document.createElement('p');
        none.className = 'page__lead page__lead--c';
        none.textContent = A.t('ag.empty');
        liveBox.appendChild(none);
        return;
      }
      r.findings.forEach(function (f, i) { liveBox.appendChild(card(f, i)); });
    }

    A.onLang(paintResults);
    paintResults();
  }

  /* ==================== صفحة المراجعة ==================== */
  var revTitle = el('revTitle');
  if (revTitle) {
    var revWhere = el('revWhere'), revDash = el('revDash'), revPill = el('revPill');
    var revCmp = el('revCmp'), revPrev = el('revPrev'), revCurr = el('revCurr');
    var revBar = el('revBar'), revNote = el('revNote');

    function paintReview() {
      var r = A.loadResult();
      if (!r) return;                       /* بلا نتيجة حيّة تبقى الملاحظة المُعدّة */
      var f = r.findings[A.picked()] || r.findings[0];
      if (!f) { revNote.textContent = A.t('ag.noPick'); return; }

      revTitle.textContent = titleOf(f);
      var place = whereOf(f);
      revWhere.textContent = place;
      revDash.hidden = !place;

      revPill.className = 'pill pill--' + f.severity;
      revPill.textContent = levelOf(f);

      if (f.previous || f.current) {
        revCmp.hidden = false;
        revPrev.textContent = f.previous || '—';
        revCurr.textContent = f.current || '—';
      } else {
        revCmp.hidden = true;
      }

      var score = f.confidence !== null && f.confidence !== undefined ? f.confidence : r.accuracy;
      if (score !== null && score !== undefined) {
        revBar.style.width = score + '%';
        revBar.parentNode.hidden = false;
      } else {
        revBar.parentNode.hidden = true;
      }

      var parts = [];
      if (score !== null && score !== undefined) parts.push(A.pct(score) + ' ' + A.t('ag.acc'));
      if (f.note) parts.push(f.note);
      revNote.textContent = parts.join(' · ');
    }

    A.onLang(paintReview);
    paintReview();
  }
})();
