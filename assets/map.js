/* مِرصاد — خريطة المنشآت على الكويت.

   رسم SVG داخل الصفحة، بلا بلاطات ولا مزوّد خرائط ولا مفتاح ولا شبكة:
   الهندسة في assets/kuwait.js، والمنشآت في assets/facilities.js، وكلاهما
   يُحمَّل مع الصفحة. فلا مربّع رمادي ينتظر، ولا بلاطة تتأخّر أو تنقص.

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

  /* ---------- بناء الرسم ---------- */
  host.classList.add('kwmap');
  host.innerHTML = '';

  var svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'kwmap__svg');
  svg.setAttribute('xmlns', SVG_NS);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', t('map.alt', 'خريطة الكويت ومواقع المنشآت'));
  host.appendChild(svg);

  /* هامش حول البلاد. وإلى الشرق هامش أوسع، فأسماء المحافظات الأربع
     المتجاورة تخرج إلى هناك — ولولاه لقُطعت على الشاشات الضيّقة. */
  var PAD = 26, PAD_E = 185;
  var FULL = [-PAD, -PAD, geo.W + PAD + PAD_E, geo.H + PAD * 2];

  function layer(cls) {
    var g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('class', cls);
    svg.appendChild(g);
    return g;
  }

  var gLand = layer('kwmap__land');
  var gNames = layer('kwmap__names');
  var gPins = layer('kwmap__pins');

  /* المحافظات: لكل واحدة مساحتها وحدّها، والمفتاح هو مفتاح القائمة
     المشتركة، فيمكن إبرازها حين يُرشَّح بها. */
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

  /* أسماء المحافظات. الأربع الصغيرة متجاورة حول الجون فلا تتّسع
     لأسمائها، وتخرج إلى فراغ مجاور بخيط رفيع يصلها بمدينتها.

     وحين يُرشَّح بمحافظة يضيق الإطار عليها، فيعود اسمها إلى داخلها بلا
     خيط — وموضعه البعيد قد يقع خارج الإطار عندئذ — وتُطوى بقية الأسماء. */
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
      text.setAttribute('data-gov', a.key);
      text.setAttribute('text-anchor', far ? (a.side > 0 ? 'start' : 'end') : 'middle');
      text.setAttribute('dominant-baseline', 'middle');
      text.textContent = lists.governorateLabel(a.key);
      gNames.appendChild(text);
    });
  }
  renderNames('');

  /* ---------- الإطار: البلاد كاملةً، أو محافظةً حين يُرشَّح بها ---------- */
  function boxOf(key) {
    for (var i = 0; i < geo.AREAS.length; i++) {
      if (geo.AREAS[i].key === key) return geo.AREAS[i].box;
    }
    return null;
  }

  var view = FULL.slice();

  function setView(next) {
    view = next;
    svg.setAttribute('viewBox', next.join(' '));
    /* العلامات تُرسم في فضاء الرسم، فلولا معاكسة التكبير لتضخّمت مع
       الإطار. النسبة إلى الإطار الكامل تُبقي حجمها على الشاشة ثابتًا. */
    var k = next[2] / FULL[2];
    host.style.setProperty('--kwmap-scale', k.toFixed(4));
  }

  function frameFor(gov) {
    var b = gov && boxOf(gov);
    if (!b) return FULL.slice();
    var w = b[2] - b[0], h = b[3] - b[1];
    var m = Math.max(w, h) * 0.12 + 14;
    return [b[0] - m, b[1] - m, w + m * 2, h + m * 2];
  }

  setView(FULL.slice());

  /* ---------- النافذة ---------- */
  var pop = document.createElement('div');
  pop.className = 'kwpop';
  pop.hidden = true;
  host.appendChild(pop);

  function closePop() {
    pop.hidden = true;
    var on = gPins.querySelector('.is-on');
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

    /* الرسم يُطبع داخل الحاوية بهامشين، فالنسبة المئوية من الحاوية
       تُخطئ موضع العلامة. مصفوفة الرسم نفسها تعطي الموضع الحقيقي. */
    var p = geo.project(f.lat, f.lng);
    var box = host.getBoundingClientRect();
    var m = svg.getScreenCTM();
    var left, top;
    if (m && svg.createSVGPoint) {
      var pt = svg.createSVGPoint();
      pt.x = p.x; pt.y = p.y;
      var sp = pt.matrixTransform(m);
      left = sp.x - box.left;
      top = sp.y - box.top;
    } else {
      left = (p.x - view[0]) / view[2] * box.width;
      top = (p.y - view[1]) / view[3] * box.height;
    }

    pop.style.left = left + 'px';
    pop.style.top = '0px';

    /* فوق العلامة إن اتّسع ما فوقها، وإلا تحتها، وإلا حيث تتّسع —
       بالقياس لا بالتخمين، فارتفاع النافذة يتبدّل بطول اسم المنشأة. */
    var ph = pop.offsetHeight, GAP = 16, EDGE = 6;
    var y = top - ph - GAP;
    if (y < EDGE) y = top + GAP;
    if (y + ph > box.height - EDGE) y = Math.max(EDGE, box.height - ph - EDGE);
    pop.style.top = y + 'px';

    /* ولا تخرج عن الحاوية عرضًا */
    var r = pop.getBoundingClientRect();
    var over = (r.left < box.left + EDGE) ? (box.left + EDGE - r.left)
             : (r.right > box.right - EDGE) ? (box.right - EDGE - r.right) : 0;
    if (over) pop.style.left = (left + over) + 'px';

    pop.querySelector('.kwpop__x').addEventListener('click', closePop);
  }

  /* ---------- العلامات ---------- */
  function draw() {
    var was = pop.hidden;
    closePop();
    gPins.innerHTML = '';
    visible().forEach(function (f) {
      var s = data.statusOf(f.status);
      var p = geo.project(f.lat, f.lng);

      var g = document.createElementNS(SVG_NS, 'g');
      g.setAttribute('class', 'kwpin');
      g.setAttribute('tabindex', '0');
      g.setAttribute('role', 'button');
      g.setAttribute('transform', 'translate(' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ')');

      var ring = document.createElementNS(SVG_NS, 'circle');
      ring.setAttribute('class', 'kwpin__ring');
      ring.setAttribute('r', 9);
      g.appendChild(ring);

      var dot = document.createElementNS(SVG_NS, 'circle');
      dot.setAttribute('class', 'kwpin__dot');
      dot.setAttribute('r', 6);
      dot.setAttribute('fill', s.color);
      g.appendChild(dot);

      var title = document.createElementNS(SVG_NS, 'title');
      title.textContent = (isEn() ? f.nameEn : f.name) + ' — ' + (isEn() ? s.en : s.ar);
      g.appendChild(title);

      function open(e) { e.preventDefault(); e.stopPropagation(); openPop(f, g); }
      g.addEventListener('click', open);
      g.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') open(e);
      });
      gPins.appendChild(g);
    });
    if (!was) closePop();
  }

  draw();

  svg.addEventListener('click', closePop);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closePop();
  });

  /* ---------- ربط المرشّحات ---------- */
  var KEY = { mapType: 'type', mapStatus: 'status', mapGov: 'gov' };

  Object.keys(KEY).forEach(function (id) {
    var sel = document.getElementById(id);
    if (!sel) return;
    sel.addEventListener('change', function () {
      filters[KEY[id]] = sel.value;
      if (id === 'mapGov') {
        setView(frameFor(sel.value));
        gLand.querySelectorAll('.kwmap__gov').forEach(function (p) {
          p.classList.toggle('is-on', !!sel.value && p.getAttribute('data-gov') === sel.value);
        });
        renderNames(sel.value);
      }
      draw();
      var count = document.getElementById('mapCount');
      if (count) count.textContent = String(visible().length);
    });
  });

  var count = document.getElementById('mapCount');
  if (count) count.textContent = String(visible().length);
})();
