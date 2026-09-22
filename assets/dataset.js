/* مِرصاد — صفحة البيانات المرجعية.

   تقرأ مباشرةً من Supabase بمفتاح publishable، وهو مفتاح معدّ للمتصفح:
   ما يحمي البيانات هو row level security، وهذه الجداول مفتوحة للقراءة
   العامة عمدًا (صور مرجعية منشورة برخصة CC BY 4.0)، والكتابة ممنوعة.

   الصفحة ثابتة بلا خادم، فلا سبيل لتوقيع الروابط؛ لذلك الحاوية عامة.
   الإسناد شرط في الرخصة، ويُقرأ من قاعدة البيانات لا من نصّ مكتوب هنا. */
(function () {
  'use strict';

  var URL_BASE = 'https://sbeftcrvveonvgxetcxq.supabase.co';
  var KEY = 'sb_publishable_hxnJ5cFwbphhPjR5VCktlg_Er-ePKM-';
  var SLUG = 'metricea-lab-380';
  var PAGE = 48;

  var TXT = {
    ar: {
      cracked: 'مشقّق', uncracked: 'سليم',
      all: 'الكل', train: 'تدريب', validation: 'تحقّق', test: 'اختبار',
      shown: function (a, b) { return 'عُرضت ' + a + ' من ' + b + ' صورة'; },
      more: 'عرض المزيد',
      loading: 'جارٍ التحميل…',
      failed: 'تعذّر تحميل الصور. حدّث الصفحة أو تحقّق من الاتصال.',
      empty: 'لا صور بهذا التصنيف.'
    },
    en: {
      cracked: 'Cracked', uncracked: 'Uncracked',
      all: 'All', train: 'Train', validation: 'Validation', test: 'Test',
      shown: function (a, b) { return 'Showing ' + a + ' of ' + b + ' images'; },
      more: 'Load more',
      loading: 'Loading…',
      failed: 'Could not load the images. Refresh, or check your connection.',
      empty: 'No images in this category.'
    }
  };

  function lang() { return document.documentElement.getAttribute('lang') === 'en' ? 'en' : 'ar'; }
  function t() { return TXT[lang()]; }

  var grid = document.getElementById('refGrid');
  var status = document.getElementById('refStatus');
  var moreWrap = document.getElementById('refMore');
  var moreBtn = document.getElementById('refMoreBtn');
  var credit = document.getElementById('refCredit');
  var filters = document.getElementById('refFilters');
  if (!grid) return;

  var state = { label: '', offset: 0, total: 0, loading: false, datasetId: null };

  function api(path, extraHeaders) {
    var headers = { apikey: KEY, Authorization: 'Bearer ' + KEY };
    if (extraHeaders) for (var k in extraHeaders) headers[k] = extraHeaders[k];
    return fetch(URL_BASE + '/rest/v1/' + path, { headers: headers });
  }

  function imageUrl(storagePath) {
    // encodeURI keeps the slashes; the paths are ASCII but this is free insurance.
    return URL_BASE + '/storage/v1/object/public/reference-images/' + encodeURI(storagePath);
  }

  function setStatus(msg) { if (status) status.textContent = msg; }

  function card(row) {
    var fig = document.createElement('figure');
    fig.className = 'refcard';
    fig.setAttribute('data-label', row.label);

    var img = document.createElement('img');
    img.loading = 'lazy';
    img.decoding = 'async';
    img.src = imageUrl(row.storage_path);
    // Alt text has to say what this is without implying it is a local asset.
    img.alt = (lang() === 'en' ? 'Concrete surface, ' : 'سطح خرساني، ') + t()[row.label];
    img.width = 768; img.height = 1024;

    var tag = document.createElement('span');
    tag.className = 'pill refcard__tag ' + (row.label === 'cracked' ? 'pill--hi' : 'pill--ok');
    tag.textContent = t()[row.label];

    var id = document.createElement('figcaption');
    id.className = 'refcard__id';
    id.textContent = row.file_name;

    fig.appendChild(img); fig.appendChild(tag); fig.appendChild(id);
    return fig;
  }

  function loadPage(reset) {
    if (state.loading || !state.datasetId) return;
    state.loading = true;
    if (reset) { grid.innerHTML = ''; state.offset = 0; }
    setStatus(t().loading);

    var q = 'reference_images?select=file_name,label,split,storage_path'
          + '&dataset_id=eq.' + state.datasetId
          + '&order=file_name.asc'
          + '&limit=' + PAGE + '&offset=' + state.offset;
    if (state.label) q += '&label=eq.' + state.label;

    api(q, { Prefer: 'count=exact' })
      .then(function (res) {
        // Content-Range is "0-47/476"; the part after the slash is the real total.
        var range = res.headers.get('content-range') || '';
        var slash = range.indexOf('/');
        if (slash > -1) state.total = parseInt(range.slice(slash + 1), 10) || 0;
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (rows) {
        rows.forEach(function (r) { grid.appendChild(card(r)); });
        state.offset += rows.length;
        state.loading = false;
        if (state.offset === 0) setStatus(t().empty);
        else setStatus(t().shown(state.offset, state.total));
        if (moreWrap) moreWrap.hidden = state.offset >= state.total;
      })
      .catch(function () {
        state.loading = false;
        setStatus(t().failed);
        if (moreWrap) moreWrap.hidden = true;
      });
  }

  /* الإسناد يأتي من قاعدة البيانات، فلا ينفصل عن الصور إن تغيّرت المجموعة. */
  function showCredit(d) {
    if (!credit) return;
    credit.innerHTML = '';
    var b = document.createElement('b');
    b.textContent = d.title;
    var p = document.createElement('p');
    // Latin text and a DOI: kept in an LTR run so the punctuation does not
    // jump to the wrong end while the page is right-to-left.
    p.dir = 'ltr';
    p.textContent = d.attribution;
    var link = document.createElement('p');
    link.dir = 'ltr';
    var a = document.createElement('a');
    a.href = d.licence_url || d.source_url;
    a.rel = 'noopener nofollow';
    a.target = '_blank';
    a.textContent = d.licence;
    link.appendChild(a);
    if (d.source_url) {
      link.appendChild(document.createTextNode(' · '));
      var src = document.createElement('a');
      src.href = d.source_url; src.rel = 'noopener nofollow'; src.target = '_blank';
      src.textContent = d.doi ? ('doi:' + d.doi) : d.source_url;
      link.appendChild(src);
    }
    credit.appendChild(b); credit.appendChild(p); credit.appendChild(link);
  }

  if (filters) {
    filters.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-label]');
      if (!btn) return;
      Array.prototype.forEach.call(filters.querySelectorAll('button[data-label]'), function (b) {
        b.setAttribute('aria-pressed', String(b === btn));
      });
      state.label = btn.getAttribute('data-label');
      loadPage(true);
    });
  }
  if (moreBtn) moreBtn.addEventListener('click', function () { loadPage(false); });

  /* chrome.js يترجم ما كان في الصفحة عند التحميل فقط، والبطاقات تُبنى بعده،
     فنراقب سمة lang ونعيد الرسم عند التبديل. */
  new MutationObserver(function () {
    if (moreBtn) moreBtn.textContent = t().more;
    loadPage(true);
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

  api('reference_datasets?select=id,title,licence,licence_url,source_url,doi,attribution,image_count&slug=eq.' + SLUG)
    .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
    .then(function (rows) {
      if (!rows.length) throw new Error('dataset missing');
      state.datasetId = rows[0].id;
      showCredit(rows[0]);
      if (moreBtn) moreBtn.textContent = t().more;
      loadPage(true);
    })
    .catch(function () { setStatus(t().failed); });
})();
