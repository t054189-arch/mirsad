/* صفحات خطوات الفحص: اسم من سجّل دخوله، اللغة، الخروج، وحركة التحليل. */
(function () {
  'use strict';

  var SESSION = 'mirsaad.session';
  var LOCALE = 'mirsaad.locale';
  var root = document.documentElement;

  /* ---------- من سجّل دخوله ---------- */
  var email = '';
  try {
    var raw = sessionStorage.getItem(SESSION) || localStorage.getItem(SESSION);
    if (raw) email = (JSON.parse(raw) || {}).email || '';
  } catch (e) { /* التخزين غير متاح */ }
  var users = [];
  try { users = JSON.parse(localStorage.getItem('mirsaad.users')) || []; } catch (e) { users = []; }
  var me = null;
  for (var i = 0; i < users.length; i++) if (users[i].email === email) me = users[i];
  var shownAr = me ? me.name : (email === 'dalal@mirsaad.demo' ? 'دلال' : email);
  var shownEn = me ? me.nameEn : (email === 'dalal@mirsaad.demo' ? 'Dalal' : email);

  /* ---------- الترجمة ---------- */
  var AR = {};
  var EN = {
    newInsp:'New inspection', signout:'Sign out',
    back:'Back', next:'Next', dash:'Dashboard', finish:'Finish and return',
    n1:'Inspection data', n2:'Upload data', n3:'Analysis', n4:'Review', n5:'Record & alert',
    h1:'Inspection data', h2:'Upload data', h3:'Analysis', h4:'Review', h5:'Record & alert',
    s1lede:'Pick the structure and record the visit details.',
    s2lede:'Upload the visit’s photos, reports and measurements.',
    s3lede:'The AI agent reads the files and compares them against the asset record.',
    s4lede:'Review what the agent found, then approve or reject it.',
    s5lede:'The decision has been saved to the asset record.',
    fAsset:'Structure', fDate:'Inspection date', fType:'Inspection type', fTypeV:'Routine inspection',
    fWho:'Assigned to', fSec:'Section', fSecV:'Piers and underside', fNotes:'Field notes…',
    fNo:'Inspection no.', fState:'Status', fStateV:'Reviewed',
    drag:'Drag files here',
    t1:'Analysing images with AI', t2:'Searching the asset record',
    t3:'Retrieving previous inspections', t4:'Comparing results',
    t5:'Identifying possible findings',
    find1:'Possible crack — pier 2', lvHi:'High',
    prev:'Previous inspection', curr:'Current inspection',
    conf:'87% confidence · versus history: a similar finding in the 2024 inspection',
    approve:'Approve', reject:'Reject', edit:'Edit',
    okT:'Inspection results approved', okD:'The asset record has been updated successfully.',
    wT:'Further action needed', wD:'One of the Jaber Bridge findings was edited.',
    loop:'What was just saved is what the AI agent will read at the next inspection.'
  };

  var nodes = document.querySelectorAll('[data-t]');
  Array.prototype.forEach.call(nodes, function (el) {
    var k = el.getAttribute('data-t');
    if (!(k in AR)) AR[k] = el.textContent;
  });

  var lang = 'ar';
  try { if (localStorage.getItem(LOCALE) === 'en') lang = 'en'; } catch (e) { /* التخزين غير متاح */ }

  function applyLang(next) {
    lang = next;
    root.lang = next;
    root.dir = next === 'en' ? 'ltr' : 'rtl';
    Array.prototype.forEach.call(nodes, function (el) {
      var v = (next === 'en' ? EN : AR)[el.getAttribute('data-t')];
      if (v) el.textContent = v;
    });
    Array.prototype.forEach.call(document.querySelectorAll('.who-name'), function (el) {
      el.textContent = (next === 'en' ? shownEn : shownAr) || '—';
    });
    var lbl = document.getElementById('langLabel');
    if (lbl) lbl.textContent = next === 'en' ? 'ع' : 'EN';
    try { localStorage.setItem(LOCALE, next); } catch (e) { /* التخزين غير متاح */ }
  }
  applyLang(lang);

  var langBtn = document.getElementById('langBtn');
  if (langBtn) langBtn.addEventListener('click', function () { applyLang(lang === 'en' ? 'ar' : 'en'); });

  var outBtn = document.getElementById('outBtn');
  if (outBtn) outBtn.addEventListener('click', function () {
    try {
      localStorage.removeItem(SESSION);
      sessionStorage.removeItem(SESSION);
    } catch (e) { /* التخزين غير متاح */ }
    location.href = 'index.html';
  });

  /* ---------- صفحة التحليل ---------- */
  var ticks = document.getElementById('ticks');
  if (!ticks) return;

  var lines = Array.prototype.slice.call(ticks.querySelectorAll('.tick'));
  var bar = document.getElementById('bar');
  var pct = document.getElementById('pct');
  var next = document.getElementById('goNext');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function fmt(n) {
    var s = n + '%';
    return root.lang === 'en' ? s
      : s.replace(/\d/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'[+d]; }).replace('%', '٪');
  }

  if (reduced) {
    lines.forEach(function (l) { l.classList.add('is-done'); });
    bar.style.width = '100%';
    pct.textContent = fmt(100);
    return;                       // الرابط يبقى متاحًا بلا انتظار
  }

  if (next) next.classList.add('is-wait');
  lines.forEach(function (line, n) {
    setTimeout(function () {
      line.classList.add('is-done');
      var v = Math.round(((n + 1) / lines.length) * 100);
      bar.style.width = v + '%';
      pct.textContent = fmt(v);
      if (n === lines.length - 1 && next) {
        setTimeout(function () { next.classList.remove('is-wait'); }, 400);
      }
    }, 450 + n * 600);
  });
})();
