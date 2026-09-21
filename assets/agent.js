/* مِرصاد — الجسر بين الموقع وسير العمل (n8n · Make · Zapier).

   الموقع ثابت بلا خادم، فالمتصفح هو من ينادي الـ webhook مباشرةً:

     inspection.html   يجمع الملفات والملاحظات ويحفظها في IndexedDB
     analysis.html     يرسلها إلى سير العمل وينتظر جوابه
     results.html      يعرض ما رجع، مرتبًا حسب الخطورة
     review.html       يفتح الملاحظة المختارة بأرقامها الحقيقية

   بلا رابط webhook يبقى كل شيء كما كان: عرض تجريبي بنتائج مُعدّة.
   وضع الرابط وحده يحوّل الصفحات الأربع إلى الوضع الحقيقي.
*/
(function () {
  'use strict';

  /* ======================= الإعداد ======================= */
  /* ضع رابط الـ webhook هنا — أو من أدوات المطوّر بلا إعادة نشر:
       localStorage.setItem('mirsaad-agent-url', 'https://…/webhook/mirsaad');  */
  var CONFIG = {
    url:     '',        /* رابط الـ webhook من n8n أو Make أو Zapier */
    mode:    'auto',    /* auto: multipart مع ملفات، json بدونها | multipart | json */
    timeout: 120000,    /* أقصى انتظار لجواب الوكيل بالمللي ثانية */
    header:  '',        /* اسم ترويسة المصادقة إن طلبها سير العمل */
    token:   ''         /* قيمتها — وهي مقروءة لكل زائر، اقرأ README */
  };

  var K = {
    url:    'mirsaad-agent-url',
    mode:   'mirsaad-agent-mode',
    result: 'mirsaad-agent-result',
    pick:   'mirsaad-agent-pick'
  };

  function ls(k)      { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function ss(k)      { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function ssSet(k, v){ try { sessionStorage.setItem(k, v); } catch (e) { /* ممتلئ أو محجوب */ } }
  function ssDel(k)   { try { sessionStorage.removeItem(k); } catch (e) { /* لا شيء */ } }

  function cfg() {
    return {
      url:     (ls(K.url) || CONFIG.url || '').trim(),
      mode:    (ls(K.mode) || CONFIG.mode || 'auto').trim(),
      timeout: CONFIG.timeout,
      header:  CONFIG.header,
      token:   CONFIG.token
    };
  }
  function configured() { return !!cfg().url; }

  /* ======================= اللغة ======================= */
  /* النصوص المولّدة من JavaScript لا تمر على لقطة chrome.js، فتحمل
     عربيّتها هنا وإنجليزيّتها من القاموس نفسه. */
  var AR = {
    'ag.pick': 'اختر الملفات',
    'ag.none': 'لم تُختَر ملفات بعد.',
    'ag.count': 'ملفات جاهزة للإرسال',
    'ag.remove': 'إزالة الملف',
    'ag.sending': 'يُرسل الفحص إلى الوكيل…',
    'ag.working': 'الوكيل يعمل — قد يستغرق هذا دقيقة…',
    'ag.failed': 'تعذّر الوصول إلى الوكيل',
    'ag.retry': 'إعادة المحاولة',
    'ag.backInsp': 'العودة إلى الفحص',
    'ag.errNet': 'لم يُفتح الرابط. تأكّد من صحته، ومن أن سير العمل يسمح لهذا الموقع (CORS).',
    'ag.errHttp': 'ردّ سير العمل برمز خطأ',
    'ag.errShape': 'ردّ سير العمل، لكن بلا ملاحظات بصيغة يفهمها مرصاد.',
    'ag.errTime': 'تأخّر الوكيل عن الردّ أكثر من الحدّ المسموح.',
    'ag.errNoDraft': 'لا توجد بيانات فحص محفوظة — ابدأ من صفحة الفحص.',
    'ag.live': 'نتائج حيّة من سير عملك',
    'ag.demo': 'نتائج تجريبية — لا يوجد وكيل موصول',
    'ag.norun': 'ابدأ فحصًا من صفحة الفحص لترى نتائج وكيلك هنا.',
    'ag.empty': 'لم يُرجع الوكيل أي ملاحظة لهذا الفحص.',
    'ag.acc': 'دقة التحليل',
    'ag.noPick': 'لم تُختَر ملاحظة — ارجع إلى النتائج واختر واحدة.',
    /* نصوص ثابتة تُعاد كتابتها من JavaScript حسب حالة النداء */
    'm5.a': 'جارٍ التحليل…',
    'a.analysingSub': 'يقرأ الوكيل الذكي الملفات ويقارنها بسجل المنشأة.',
    /* مستويات الخطورة تُرسم من JavaScript أيضًا */
    'lv.hi': 'عالية', 'lv.mid': 'متوسطة', 'lv.ok': 'سليم'
  };
  function t(key) {
    var en = document.documentElement.lang === 'en';
    var dict = en ? (window.MIRSAAD_EN || {}) : AR;
    return (key in dict) ? dict[key] : (AR[key] || key);
  }
  /* الأرقام تتبع اللغة كما في بقية الموقع */
  function num(n) {
    var s = String(n);
    if (document.documentElement.lang === 'en') return s;
    return s.replace(/\d/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'[+d]; });
  }
  function pct(n) {
    return document.documentElement.lang === 'en' ? n + '%' : num(n) + '٪';
  }
  function onLang(fn) { document.addEventListener('mirsaad:lang', fn); }

  /* ======================= مسودّة الفحص ======================= */
  /* الملفات تعبر بين الصفحات في IndexedDB — يحفظ كائن File كما هو،
     بلا تحويله إلى base64 الذي يضخّم الحجم ويخنق sessionStorage. */
  var DB = 'mirsaad-agent', STORE = 'draft', ROW = 'current';

  function openDb() {
    return new Promise(function (resolve, reject) {
      if (!window.indexedDB) { reject(new Error('no-idb')); return; }
      var req = indexedDB.open(DB, 1);
      req.onupgradeneeded = function () {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error('idb')); };
    });
  }
  function withStore(mode, fn) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, mode);
        var req = fn(tx.objectStore(STORE));
        tx.oncomplete = function () { db.close(); resolve(req && req.result); };
        tx.onerror = function () { db.close(); reject(tx.error || new Error('tx')); };
      });
    });
  }
  function saveDraft(draft) { return withStore('readwrite', function (s) { return s.put(draft, ROW); }); }
  function loadDraft()      { return withStore('readonly',  function (s) { return s.get(ROW); }); }

  /* ======================= الإرسال ======================= */
  function toDataUrl(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(String(r.result)); };
      r.onerror = function () { reject(r.error || new Error('read')); };
      r.readAsDataURL(file);
    });
  }

  function body(draft, mode) {
    var files = draft.files || [];
    var meta = draft.meta || {};
    if (mode === 'json') {
      return Promise.all(files.map(function (f) {
        return toDataUrl(f).then(function (d) {
          return { name: f.name, type: f.type, size: f.size, data: d };
        });
      })).then(function (encoded) {
        var payload = {};
        for (var k in meta) if (meta.hasOwnProperty(k)) payload[k] = meta[k];
        payload.files = encoded;
        return { body: JSON.stringify(payload), type: 'application/json' };
      });
    }
    /* multipart: الحقول مفردة ليلتقطها n8n بلا عقدة Code،
       و payload نسخة JSON كاملة لمن يفضّل قراءتها دفعة واحدة. */
    var fd = new FormData();
    fd.append('payload', JSON.stringify(meta));
    for (var key in meta) {
      if (meta.hasOwnProperty(key) && typeof meta[key] !== 'object') fd.append(key, String(meta[key]));
    }
    fd.append('fileCount', String(files.length));
    files.forEach(function (f, i) { fd.append('file' + i, f, f.name); });
    return Promise.resolve({ body: fd, type: null });
  }

  function send(draft) {
    var c = cfg();
    if (!c.url) return Promise.reject(err('ag.errNet', 'no-url'));
    var files = draft.files || [];
    var mode = c.mode === 'json' || c.mode === 'multipart' ? c.mode
             : (files.length ? 'multipart' : 'json');

    return body(draft, mode).then(function (packed) {
      var ctl = window.AbortController ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctl) ctl.abort(); }, c.timeout);
      var headers = {};
      /* مع FormData يضبط المتصفح Content-Type مع حدّ الأجزاء — لا نلمسه */
      if (packed.type) headers['Content-Type'] = packed.type;
      if (c.header && c.token) headers[c.header] = c.token;

      return fetch(c.url, {
        method: 'POST',
        headers: headers,
        body: packed.body,
        signal: ctl ? ctl.signal : undefined
      }).then(function (res) {
        clearTimeout(timer);
        return res.text().then(function (text) {
          if (!res.ok) throw err('ag.errHttp', 'http', res.status + ' · ' + text.slice(0, 160));
          var raw;
          try { raw = text ? JSON.parse(text) : null; }
          catch (e) { raw = text; }
          var out = normalise(raw);
          if (!out) throw err('ag.errShape', 'shape', text.slice(0, 160));
          return out;
        });
      }, function (e) {
        clearTimeout(timer);
        if (e && e.name === 'AbortError') throw err('ag.errTime', 'timeout');
        if (e && e.mirsaad) throw e;
        throw err('ag.errNet', 'network', e && e.message);
      });
    });
  }

  function err(key, code, detail) {
    var e = new Error(code);
    e.mirsaad = true; e.key = key; e.code = code; e.detail = detail || '';
    return e;
  }

  /* ======================= قراءة الجواب ======================= */
  /* سير العمل يردّ بأشكال كثيرة حسب كيف رُكّب: مصفوفة n8n، أو
     { findings: [...] }، أو نصّ نموذج لغوي فيه JSON. نقبلها كلها. */
  var LIST_KEYS = ['findings', 'results', 'items', 'observations', 'output', 'data'];
  var TITLE_KEYS = ['title', 'label', 'name', 'finding', 'issue', 'defect', 'heading'];

  function looksLikeFinding(o) {
    if (!o || typeof o !== 'object' || Array.isArray(o)) return false;
    for (var i = 0; i < TITLE_KEYS.length; i++) if (TITLE_KEYS[i] in o) return true;
    return false;
  }

  function unwrap(v) {
    for (var i = 0; i < 8; i++) {
      if (typeof v === 'string') {
        var m = v.match(/[[{][\s\S]*[\]}]/);      /* نموذج لغوي ردّ بنصّ حول JSON */
        if (!m) return v;
        try { v = JSON.parse(m[0]); continue; } catch (e) { return v; }
      }
      if (Array.isArray(v)) {
        if (v.length === 1 && v[0] && typeof v[0] === 'object' && !looksLikeFinding(v[0])) { v = v[0]; continue; }
        return v;
      }
      if (v && typeof v === 'object' && !looksLikeFinding(v)) {
        if (v.json)   { v = v.json;   continue; }   /* شكل n8n المعتاد */
        if (v.body)   { v = v.body;   continue; }
        if (v.result) { v = v.result; continue; }
        if (v.response) { v = v.response; continue; }
      }
      return v;
    }
    return v;
  }

  /* الملاحظات قد تجلس تحت غلاف أو غلافين — { output: { data: { results: […] } } }
     شائع حين يمرّ الجواب بعقدة نموذج لغوي ثم عقدة Set. فنبحث نزولًا. */
  function listOf(v, depth) {
    depth = depth || 0;
    if (depth > 5) return null;

    if (Array.isArray(v)) {
      if (!v.length) return v;                      /* فارغة: نتيجة لا خطأ */
      if (v.some(looksLikeFinding)) return v;
      var bare = v.map(function (x) { return unwrap(x); });
      if (bare.some(looksLikeFinding)) return bare; /* [{json:{…}}, {json:{…}}] */
      for (var j = 0; j < v.length; j++) {
        var inner = listOf(bare[j], depth + 1);
        if (inner) return inner;
      }
      return null;
    }

    if (!v || typeof v !== 'object') return null;
    if (looksLikeFinding(v)) return [v];
    for (var i = 0; i < LIST_KEYS.length; i++) {
      if (!(LIST_KEYS[i] in v)) continue;
      var got = listOf(unwrap(v[LIST_KEYS[i]]), depth + 1);
      if (got) return got;
    }
    return null;
  }

  function pickKey(o, names) {
    for (var i = 0; i < names.length; i++) {
      var v = o[names[i]];
      if (v !== undefined && v !== null && v !== '') return v;
    }
    return '';
  }

  function severity(v) {
    var s = String(v === undefined || v === null ? '' : v).toLowerCase().trim();
    if (!s) return 'mid';
    if (/^(3|high|critical|severe|urgent|major|عالي|عالية|حرج|حرجة)/.test(s)) return 'hi';
    if (/^(1|0|low|none|ok|clear|good|fine|minor|no ?issue|سليم|سليمة|منخفض|منخفضة|لا)/.test(s)) return 'ok';
    return 'mid';
  }

  function confidence(v) {
    var n = parseFloat(v);
    if (isNaN(n)) return null;
    if (n > 0 && n <= 1) n = n * 100;             /* 0.87 تعني ٨٧٪ */
    return Math.max(0, Math.min(100, Math.round(n)));
  }

  function normalise(raw) {
    var root = unwrap(raw);
    var list = listOf(root);
    if (!list) return null;
    /* مصفوفة فارغة تعني: الوكيل فحص ولم يجد ما يُذكر — وهذه نتيجة */
    if (!list.length) return { findings: [], accuracy: null, at: Date.now(), empty: true };

    var findings = list.map(function (item) {
      var o = (item && typeof item === 'object') ? unwrap(item) : { title: String(item) };
      if (!o || typeof o !== 'object') o = { title: String(item) };
      var sev = severity(pickKey(o, ['severity', 'level', 'priority', 'risk', 'grade', 'الخطورة']));
      return {
        title:      String(pickKey(o, TITLE_KEYS) || ''),
        titleEn:    String(pickKey(o, ['titleEn', 'title_en', 'labelEn', 'nameEn']) || ''),
        location:   String(pickKey(o, ['location', 'where', 'part', 'element', 'component', 'area', 'الموقع']) || ''),
        locationEn: String(pickKey(o, ['locationEn', 'location_en', 'whereEn']) || ''),
        severity:   sev,
        confidence: confidence(pickKey(o, ['confidence', 'accuracy', 'score', 'probability', 'الدقة'])),
        previous:   String(pickKey(o, ['previous', 'prev', 'before', 'last', 'السابق']) || ''),
        current:    String(pickKey(o, ['current', 'now', 'measurement', 'value', 'الحالي']) || ''),
        note:       String(pickKey(o, ['note', 'notes', 'detail', 'details', 'description',
                                       'summary', 'comment', 'recommendation', 'ملاحظة']) || ''),
        image:      String(pickKey(o, ['image', 'imageUrl', 'image_url', 'photo', 'thumbnail']) || '')
      };
    }).filter(function (f) { return f.title || f.note; });

    if (!findings.length) return null;

    var order = { hi: 0, mid: 1, ok: 2 };
    findings.sort(function (a, b) { return order[a.severity] - order[b.severity]; });

    var overall = confidence(root && root.accuracy !== undefined ? root.accuracy
                : root && root.confidence !== undefined ? root.confidence : null);
    if (overall === null) {
      var scored = findings.filter(function (f) { return f.confidence !== null; });
      if (scored.length) {
        overall = Math.round(scored.reduce(function (s, f) { return s + f.confidence; }, 0) / scored.length);
      }
    }
    return { findings: findings, accuracy: overall, at: Date.now() };
  }

  /* ======================= نتيجة محفوظة ======================= */
  function saveResult(r) { ssSet(K.result, JSON.stringify(r)); }
  function loadResult() {
    var raw = ss(K.result);
    if (!raw) return null;
    try {
      var r = JSON.parse(raw);
      return (r && r.findings && (r.findings.length || r.empty)) ? r : null;
    } catch (e) { return null; }
  }

  window.MirsaadAgent = {
    cfg: cfg, configured: configured, t: t, num: num, pct: pct, onLang: onLang,
    saveDraft: saveDraft, loadDraft: loadDraft, send: send, normalise: normalise,
    saveResult: saveResult, loadResult: loadResult,
    pick: function (i) { ssSet(K.pick, String(i)); },
    picked: function () { var v = parseInt(ss(K.pick), 10); return isNaN(v) ? 0 : v; },
    reset: function () { ssDel(K.result); ssDel(K.pick); }
  };
})();
