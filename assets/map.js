/* مِرصاد — خريطة المنشآت على الكويت، مشهدًا ثلاثي الأبعاد.

   رسم SVG داخل الصفحة، بلا بلاطات ولا مزوّد خرائط ولا مفتاح ولا شبكة:
   الهندسة في assets/kuwait.js، والمنشآت في assets/facilities.js، وكلاهما
   يُحمَّل مع الصفحة. فلا مربّع رمادي ينتظر، ولا بلاطة تتأخّر أو تنقص.

   المشهد: لوحٌ مائل في فضاء ذي منظور. البلاد تُرسم مرّات فوق بعضها
   بإزاحة في العمق فتبدو كتلةً لها سُمك، ويقوم فوقها عمودٌ لكل منشأة
   برأسٍ يواجه الناظر. والأعماق والوهج والظلّ كلّها CSS، فلا مكتبة ولا
   بيانات تُجلب.

   تُستدعى على كل صفحة فيها عنصر ‎[data-mirsaad-map]‎ — صفحة الخريطة،
   وقسم الخريطة في الرئيسية — فالمكوّن واحد والبيانات واحدة. */
(function () {
  'use strict';

  var host = document.querySelector('[data-mirsaad-map]');
  if (!host) return;

  var data = window.MIRSAAD_FACILITIES;
  var lists = window.MIRSAAD_LISTS;
  var geo = window.MIRSAAD_KUWAIT;
  if (!data || !lists || !geo) return;

  var EN = window.MIRSAAD_EN || {};
  function isEn() { return document.documentElement.lang === 'en'; }
  function t(key, fallback) { return isEn() && key in EN ? EN[key] : fallback; }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  var SVG_NS = 'http://www.w3.org/2000/svg';

  /* ميل اللوح ودورانه. الميل معتدل عن قصد: كلّما اشتدّ ازداد المشهد
     عمقًا ونقصت قراءة الأسماء، وهذه حدّ يجمع الأمرين. */
  var TILT = 38, SPIN = -9, DEPTH = 34;

  /* ---------- المرشّحات ---------- */
  var filters = { type: '', status: '', gov: '' };

  function visible() {
    return data.FACILITIES.filter(function (f) {
      return (!filters.type || f.type === filters.type) &&
             (!filters.status || f.status === filters.status) &&
             (!filters.gov || f.gov === filters.gov);
    });
  }

  function fillFilter(id, list) {
    var sel = document.getElementById(id);
    if (!sel) return;
    var keep = sel.querySelector('option[value=""]');
    sel.innerHTML = '';
    if (keep) sel.appendChild(keep);
    list.forEach(function (item) {
      var o = document.createElement('option');
      o.value = item.value;
      o.textContent = isEn() ? item.en : item.ar;
      o.setAttribute('data-ar', item.ar);
      o.setAttribute('data-en', item.en);
      sel.appendChild(o);
    });
  }

  fillFilter('mapType', lists.FACILITY_TYPES);
  fillFilter('mapGov', lists.GOVERNORATES);
  fillFilter('mapStatus', data.STATUSES);

  /* ---------- المفتاح ---------- */
  var legend = document.getElementById('mapLegend');
  if (legend) {
    legend.innerHTML = '';
    data.STATUSES.forEach(function (s) {
      var row = document.createElement('span');
      row.className = 'maplegend__i';
      row.innerHTML = '<i style="background:' + s.color + '"></i>' +
                      '<span>' + esc(isEn() ? s.en : s.ar) + '</span>';
      legend.appendChild(row);
    });
  }

  /* ---------- بناء المشهد ---------- */
  host.classList.add('kwmap');
  host.innerHTML = '';
  host.style.setProperty('--kwtilt', TILT + 'deg');
  host.style.setProperty('--kwspin', SPIN + 'deg');
  /* الميل يضغط الرأسيّ بجيب تمامه، فتُمطّ الأسماء بمقلوبه لتعود
     إلى نسبتها وقد بقيت راقدةً على اللوح. */
  host.style.setProperty('--kwstretch',
    (1 / Math.cos(TILT * Math.PI / 180)).toFixed(3));

  function div(cls, parent) {
    var d = document.createElement('div');
    d.className = cls;
    (parent || host).appendChild(d);
    return d;
  }

  var scene = div('kwscene');
  var stage = div('kwstage', scene);
  var plane = div('kwplane', stage);      // الماء تحت البلاد
  var slabs = div('kwslabs', stage);      // سُمك الكتلة
  var top = div('kwtop', stage);          // وجه البلاد وأسماؤها
  var anchors = div('kwanchors', stage);  // مرابط على اللوح تحمل مواضع المنشآت

  div('kwhorizon');                       // وهج الأفق
  div('kwvignette');                      // إظلام الأطراف

  /* الأعمدة طبقةٌ مسطّحة فوق المشهد، لا داخل اللوح المائل.

     السبب: رفع الرأس في العمق بـ‎translateZ‎ لا يُعوَّل عليه — رأيتُ
     متصفّحًا يحسب موضعه مرفوعًا ثم يرسمه غير مرفوع، فيقع ما يُرى في
     غير ما يُنقر. والحساب هنا لا يحتاج إليه أصلًا: عمودٌ قائم على لوح
     مائل يقع ظلّه على الشاشة خطًّا رأسيًّا مهما دار اللوح في مستواه،
     وطوله المرئي طولُه في جيب زاوية الميل. فتُرسم الأعمدة ببكسلات
     مستوية، وتُقرأ مواضع أقدامها من مرابطها على اللوح. */
  var pins = div('kwpins');

  /* هامش حول البلاد. وإلى الشرق هامش أوسع، فأسماء المحافظات الأربع
     المتجاورة تخرج إلى هناك — ولولاه لقُطعت على الشاشات الضيّقة. */
  var PAD = 26, PAD_E = 185;
  var FULL = [-PAD, -PAD, geo.W + PAD + PAD_E, geo.H + PAD * 2];
  var view = FULL.slice();

  function svgIn(parent, cls) {
    var s = document.createElementNS(SVG_NS, 'svg');
    s.setAttribute('class', cls);
    s.setAttribute('preserveAspectRatio', 'none');
    s.setAttribute('aria-hidden', 'true');
    parent.appendChild(s);
    return s;
  }

  /* وجه البلاد */
  var face = svgIn(top, 'kwmap__svg');
  face.setAttribute('role', 'img');
  face.removeAttribute('aria-hidden');
  face.setAttribute('aria-label', t('map.alt', 'خريطة الكويت ومواقع المنشآت'));

  var gLand = document.createElementNS(SVG_NS, 'g');
  var gNames = document.createElementNS(SVG_NS, 'g');
  gNames.setAttribute('class', 'kwmap__names');
  face.appendChild(gLand);
  face.appendChild(gNames);

  geo.AREAS.forEach(function (a) {
    var p = document.createElementNS(SVG_NS, 'path');
    p.setAttribute('d', a.d);
    p.setAttribute('class', 'kwmap__gov');
    p.setAttribute('data-gov', a.key);
    var title = document.createElementNS(SVG_NS, 'title');
    title.textContent = lists.governorateLabel(a.key);
    p.appendChild(title);
    gLand.appendChild(p);
  });

  /* السُمك: نسخٌ من الشكل تنزل في العمق طبقةً بعد طبقة */
  var LAYERS = 9;
  for (var i = LAYERS; i >= 1; i--) {
    var s = svgIn(slabs, 'kwslab');
    s.style.transform = 'translateZ(' + (-i * DEPTH / LAYERS).toFixed(2) + 'px)';
    s.style.setProperty('--k', (i / LAYERS).toFixed(3));
    geo.AREAS.forEach(function (a) {
      var p = document.createElementNS(SVG_NS, 'path');
      p.setAttribute('d', a.d);
      s.appendChild(p);
    });
  }
  var allSvg = [face].concat([].slice.call(slabs.querySelectorAll('svg')));

  /* ---------- الأسماء ---------- */
  function renderNames(sel) {
    gNames.innerHTML = '';
    geo.AREAS.forEach(function (a) {
      if (sel && a.key !== sel) return;
      var far = a.side !== 0 && !sel;
      var tx = far ? a.tx : a.ax;
      var ty = far ? a.ty : a.ay;

      if (far) {
        var line = document.createElementNS(SVG_NS, 'line');
        line.setAttribute('x1', a.ax); line.setAttribute('y1', a.ay);
        line.setAttribute('x2', a.tx); line.setAttribute('y2', a.ty);
        line.setAttribute('class', 'kwmap__lead');
        gNames.appendChild(line);

        var dot = document.createElementNS(SVG_NS, 'circle');
        dot.setAttribute('cx', a.ax); dot.setAttribute('cy', a.ay);
        dot.setAttribute('r', 3.5);
        dot.setAttribute('class', 'kwmap__leaddot');
        gNames.appendChild(dot);
      }

      var text = document.createElementNS(SVG_NS, 'text');
      text.setAttribute('x', tx);
      text.setAttribute('y', ty + (far ? 0 : 4));
      text.setAttribute('class', 'kwmap__name' + (far ? ' kwmap__name--far' : ''));
      text.setAttribute('text-anchor', far ? (a.side > 0 ? 'start' : 'end') : 'middle');
      text.setAttribute('dominant-baseline', 'middle');
      text.textContent = lists.governorateLabel(a.key);
      gNames.appendChild(text);
    });
  }

  /* ---------- الإطار ---------- */
  function boxOf(key) {
    for (var i = 0; i < geo.AREAS.length; i++) {
      if (geo.AREAS[i].key === key) return geo.AREAS[i].box;
    }
    return null;
  }

  function frameFor(gov) {
    var b = gov && boxOf(gov);
    if (!b) return FULL.slice();
    var w = b[2] - b[0], h = b[3] - b[1];
    var m = Math.max(w, h) * 0.12 + 14;
    return [b[0] - m, b[1] - m, w + m * 2, h + m * 2];
  }

  /* اللوح يأخذ نسبة الإطار نفسها، فالنِسب المئوية للأعمدة تطابق
     إحداثيات الرسم تمامًا ولا يبقى فرق بين الطبقتين. */
  function layout() {
    var box = host.getBoundingClientRect();
    if (!box.width) return;
    var ar = view[2] / view[3];
    var c = Math.cos(TILT * Math.PI / 180);
    /* المنظور يكبّر الحافة القريبة، فالتقدير المسطّح وحده يُخرج البلاد
       عن الإطار. هذان المعاملان يتركان لذلك متّسعًا. */
    var w = Math.min(box.width * 0.90, (box.height * 0.80) / c * ar);
    var h = w / ar;
    stage.style.width = w + 'px';
    stage.style.height = h + 'px';
    stage.style.marginInlineStart = (-w / 2) + 'px';
    stage.style.marginTop = (-h / 2) + 'px';
    /* الأسماء والرؤوس تقاوم الميل والتصغير فيبقى حجمها مقروءًا */
    host.style.setProperty('--kwmap-scale', (view[2] / FULL[2]).toFixed(4));
  }

  function setView(next) {
    view = next;
    var vb = next.join(' ');
    allSvg.forEach(function (s) { s.setAttribute('viewBox', vb); });
    layout();
    placePins();
  }

  /* ---------- النافذة ---------- */
  var pop = document.createElement('div');
  pop.className = 'kwpop';
  pop.hidden = true;
  host.appendChild(pop);

  function closePop() {
    pop.hidden = true;
    var on = pins.querySelector('.is-on');
    if (on) on.classList.remove('is-on');
  }

  function popHtml(f) {
    var s = data.statusOf(f.status);
    var gmaps = 'https://www.google.com/maps/search/?api=1&query=' + f.lat + ',' + f.lng;
    var rows = [
      [t('map.type', 'نوع المنشأة'), lists.facilityLabel(f.type)],
      [t('map.gov', 'المحافظة'), lists.governorateLabel(f.gov)],
      [t('map.status', 'حالة الفحص'), isEn() ? s.en : s.ar],
      [t('map.last', 'آخر فحص'), f.last]
    ].map(function (r) {
      return '<div class="mappop__r"><span>' + esc(r[0]) + '</span><b>' + esc(r[1]) + '</b></div>';
    }).join('');

    return '<button type="button" class="kwpop__x" aria-label="' +
             esc(t('map.close', 'إغلاق')) + '">&times;</button>' +
      '<h3 class="mappop__h">' + esc(isEn() ? f.nameEn : f.name) + '</h3>' +
      rows +
      '<div class="mappop__go">' +
        '<a class="ui ui--ghost" href="' + esc(gmaps) + '" target="_blank" rel="noopener noreferrer">' +
          esc(t('map.gmaps', 'فتح في خرائط جوجل')) + '</a>' +
        '<a class="ui ui--go" href="' + esc(f.detail) + '">' +
          esc(t('map.detail', 'عرض تفاصيل الفحص')) + '</a>' +
      '</div>';
  }

  function openPop(f, node) {
    closePop();
    node.classList.add('is-on');
    pop.dir = isEn() ? 'ltr' : 'rtl';
    pop.innerHTML = popHtml(f);
    pop.hidden = false;

    /* رأس العمود مائل في الفضاء، لكن موضعه على الشاشة معلوم. النافذة
       خارج اللوح فتُوضع بذلك الموضع لا بحساب في فضاء الرسم. */
    var box = host.getBoundingClientRect();
    var head = node.querySelector('.kwpin__head').getBoundingClientRect();
    var left = head.left + head.width / 2 - box.left;
    var top = head.top - box.top;

    pop.style.left = left + 'px';
    pop.style.top = '0px';

    var ph = pop.offsetHeight, GAP = 14, EDGE = 6;
    var y = top - ph - GAP;
    if (y < EDGE) y = top + head.height + GAP;
    if (y + ph > box.height - EDGE) y = Math.max(EDGE, box.height - ph - EDGE);
    pop.style.top = y + 'px';

    var r = pop.getBoundingClientRect();
    var over = (r.left < box.left + EDGE) ? (box.left + EDGE - r.left)
             : (r.right > box.right - EDGE) ? (box.right - EDGE - r.right) : 0;
    if (over) pop.style.left = (left + over) + 'px';

    pop.querySelector('.kwpop__x').addEventListener('click', closePop);
  }

  /* ---------- الأعمدة ---------- */
  var shown = [];

  function draw() {
    closePop();
    pins.innerHTML = '';
    anchors.innerHTML = '';
    shown = visible();
    shown.forEach(function (f) {
      var s = data.statusOf(f.status);

      anchors.appendChild(document.createElement('i')).className = 'kwanchor';

      var pin = document.createElement('div');
      pin.className = 'kwpin';
      pin.style.setProperty('--c', s.color);

      var foot = document.createElement('span');
      foot.className = 'kwpin__foot';
      pin.appendChild(foot);

      var beam = document.createElement('span');
      beam.className = 'kwpin__beam';
      pin.appendChild(beam);

      /* الرأس نفسه هو الزرّ: هو ما يُرى في قمّة العمود وما يُنقر */
      var head = document.createElement('button');
      head.type = 'button';
      head.className = 'kwpin__head';
      head.title = (isEn() ? f.nameEn : f.name) + ' — ' + (isEn() ? s.en : s.ar);
      head.setAttribute('aria-label', head.title);
      head.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        openPop(f, pin);
      });
      pin.appendChild(head);

      pins.appendChild(pin);
    });
    placePins();
  }

  function placePins() {
    var nodes = anchors.children;
    for (var i = 0; i < nodes.length && i < shown.length; i++) {
      var p = geo.project(shown[i].lat, shown[i].lng);
      nodes[i].style.left = ((p.x - view[0]) / view[2] * 100) + '%';
      nodes[i].style.top = ((p.y - view[1]) / view[3] * 100) + '%';
    }
    syncPins();
  }

  /* كل عمود يقف حيث يقع مربطه على اللوح */
  function syncPins() {
    var box = host.getBoundingClientRect();
    if (!box.width) return;
    var marks = anchors.children, nodes = pins.children;
    for (var i = 0; i < marks.length && i < nodes.length; i++) {
      var r = marks[i].getBoundingClientRect();
      nodes[i].style.left = (r.left + r.width / 2 - box.left) + 'px';
      nodes[i].style.top = (r.top + r.height / 2 - box.top) + 'px';
      /* الأبعد إلى الخلف أصغر قليلًا، فيعمّق المشهد */
      var d = (r.top + r.height / 2 - box.top) / Math.max(box.height, 1);
      nodes[i].style.setProperty('--d', (0.82 + 0.3 * d).toFixed(3));
      nodes[i].style.zIndex = String(100 + Math.round(d * 100));
    }
    stagger();
  }

  /* المنشآت المتجاورة على الأرض تتراكب رؤوسها عند عرض البلاد كلّها،
     فيحجب رأسٌ رأسًا ولا يُنقر المحجوب. فتُطال أعمدة المتزاحمين بعضها
     فوق بعض حتى تفترق الرؤوس — وهو صنيع راسمي هذه الخرائط.

     والقياس على الرؤوس أنفسها بعد رسمها، لا على أقدامها: الحساب
     التقريبي يترك متزاحمَين هنا أو هناك، والقياس لا يترك. */
  var STEP = 11, GUARD = 16;

  function stagger() {
    var nodes = [].slice.call(pins.children);
    if (!nodes.length) return;
    nodes.forEach(function (n) { n.style.setProperty('--bump', '0px'); });

    /* من الخلف إلى الأمام، فيعلو الأقربُ الأبعدَ */
    var order = nodes.slice().sort(function (a, b) {
      return (parseFloat(a.style.top) || 0) - (parseFloat(b.style.top) || 0);
    });

    var placed = [];
    order.forEach(function (n) {
      var head = n.querySelector('.kwpin__head');
      if (!head) return;
      var bump = 0, r;
      for (var i = 0; i <= GUARD; i++) {
        n.style.setProperty('--bump', bump + 'px');
        r = head.getBoundingClientRect();
        var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        var gap = r.width + 3;
        var clash = placed.some(function (q) {
          return Math.abs(q.x - cx) < gap && Math.abs(q.y - cy) < gap;
        });
        if (!clash) break;
        bump += STEP;
      }
      r = head.getBoundingClientRect();
      placed.push({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    });
  }

  /* حركة الدخول تنقل اللوح حتى يستقرّ، فتتبعه الأعمدة حتى تسكن */
  function trackEntrance() {
    var until = Date.now() + 1800;
    (function step() {
      syncPins();
      if (Date.now() < until) requestAnimationFrame(step);
    })();
  }

  renderNames('');
  setView(FULL.slice());
  draw();
  trackEntrance();

  scene.addEventListener('click', closePop);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closePop();
  });

  var pending = false;
  window.addEventListener('resize', function () {
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () { pending = false; closePop(); layout(); syncPins(); });
  });

  /* ---------- ربط المرشّحات ---------- */
  var KEY = { mapType: 'type', mapStatus: 'status', mapGov: 'gov' };

  Object.keys(KEY).forEach(function (id) {
    var sel = document.getElementById(id);
    if (!sel) return;
    sel.addEventListener('change', function () {
      filters[KEY[id]] = sel.value;
      if (id === 'mapGov') {
        gLand.querySelectorAll('.kwmap__gov').forEach(function (p) {
          p.classList.toggle('is-on', !!sel.value && p.getAttribute('data-gov') === sel.value);
        });
        renderNames(sel.value);
        setView(frameFor(sel.value));
      }
      draw();
      var count = document.getElementById('mapCount');
      if (count) count.textContent = String(visible().length);
    });
  });

  var count = document.getElementById('mapCount');
  if (count) count.textContent = String(visible().length);
})();
