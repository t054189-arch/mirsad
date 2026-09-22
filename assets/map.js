/* مِرصاد — خريطة المنشآت.

   Leaflet مع بلاطات OpenStreetMap، بلا مفتاح API. تُستدعى على كل صفحة
   فيها عنصر ‎[data-mirsaad-map]‎ — صفحة الخريطة، وقسم الخريطة في الرئيسية —
   فالمكوّن واحد والبيانات واحدة.

   إن تعذّر تحميل Leaflet (شبكة محجوبة، أو تصفّح بلا إنترنت) لا تنكسر
   الصفحة: يظهر مكانها جدول بالمنشآت نفسها وروابطها، فيبقى المحتوى
   قابلًا للوصول. */
(function () {
  'use strict';

  var host = document.querySelector('[data-mirsaad-map]');
  if (!host) return;

  var data = window.MIRSAAD_FACILITIES;
  var lists = window.MIRSAAD_LISTS;
  if (!data || !lists) return;

  var EN = window.MIRSAAD_EN || {};
  function t(key, fallback) {
    return document.documentElement.lang === 'en' && key in EN ? EN[key] : fallback;
  }
  function isEn() { return document.documentElement.lang === 'en'; }

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
                      '<span>' + (isEn() ? s.en : s.ar) + '</span>';
      legend.appendChild(row);
    });
  }

  /* ---------- نافذة العلامة ---------- */
  function popupHtml(f) {
    var s = data.statusOf(f.status);
    var gmaps = 'https://www.google.com/maps/search/?api=1&query=' + f.lat + ',' + f.lng;
    var rows = [
      [t('map.type', 'نوع المنشأة'), lists.facilityLabel(f.type)],
      [t('map.gov', 'المحافظة'), lists.governorateLabel(f.gov)],
      [t('map.status', 'حالة الفحص'), isEn() ? s.en : s.ar],
      [t('map.last', 'آخر فحص'), f.last]
    ].map(function (r) {
      return '<div class="mappop__r"><span>' + r[0] + '</span><b>' + r[1] + '</b></div>';
    }).join('');

    return '<div class="mappop" dir="' + (isEn() ? 'ltr' : 'rtl') + '">' +
      '<h3 class="mappop__h">' + (isEn() ? f.nameEn : f.name) + '</h3>' +
      rows +
      '<div class="mappop__go">' +
        '<a class="ui ui--ghost" href="' + gmaps + '" target="_blank" rel="noopener noreferrer">' +
          t('map.gmaps', 'فتح في خرائط جوجل') + '</a>' +
        '<a class="ui ui--go" href="' + f.detail + '">' +
          t('map.detail', 'عرض تفاصيل الفحص') + '</a>' +
      '</div></div>';
  }

  /* ---------- البديل حين يتعذّر Leaflet ---------- */
  function fallback() {
    host.classList.add('mapbox--plain');
    function render() {
      var rows = visible().map(function (f) {
        var s = data.statusOf(f.status);
        return '<a class="rowcard rowcard--go" href="' + f.detail + '">' +
          '<span class="rowcard__img" style="background:' + s.color + ';opacity:.6"></span>' +
          '<span class="rowcard__t"><b>' + (isEn() ? f.nameEn : f.name) + '</b>' +
          '<small>' + lists.facilityLabel(f.type) + ' · ' + lists.governorateLabel(f.gov) + '</small></span>' +
          '<span class="pill" style="background:' + s.color + '22;color:' + s.color + '">' +
          (isEn() ? s.en : s.ar) + '</span></a>';
      }).join('');
      host.innerHTML = '<p class="field__hint">' +
        t('map.offline', 'تعذّر تحميل الخريطة — هذه منشآت السجل وأماكنها.') +
        '</p>' + (rows || '<p class="field__hint">' + t('map.none', 'لا منشآت مطابقة.') + '</p>');
    }
    render();
    return render;
  }

  /* ---------- الخلفيات ----------

     الوضوح أوّلًا. خرائط CARTO الداكنة من طراز «اللوحة» (canvas): وُضعت
     لتكون أرضيةً هادئة تحت البيانات، فأسماؤها قليلة وطرقها رمادية على
     رمادي — لا تصلح حين يكون المطلوب قراءة الطرق والمناطق والسواحل.
     فالافتراضية عندنا هي خريطة OpenStreetMap التفصيلية في الوضعين،
     بلا أي مرشّح لون: هي أغزر الخرائط المجانية تفصيلًا وأقواها تباينًا،
     تُظهر الساحل والطرق الرئيسة وأسماء المدن والمناطق وحدود المحافظات.

     والداكنة تبقى خيارًا بضغطة لمن أرادها. كلاهما بلا مفتاح API. */
  var BASEMAPS = [
    {
      value: 'detail', ar: 'تفصيلية', en: 'Detailed',
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      sub: 'abc', maxZoom: 19, dark: false,
      attr: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    },
    {
      value: 'dark', ar: 'داكنة', en: 'Dark',
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
      sub: 'abcd', maxZoom: 19, dark: true,
      attr: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' +
            ' &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }
  ];

  var BASEMAP_KEY = 'mirsaad-basemap';

  function basemapOf(value) {
    for (var i = 0; i < BASEMAPS.length; i++) {
      if (BASEMAPS[i].value === value) return BASEMAPS[i];
    }
    return BASEMAPS[0];
  }

  function savedBasemap() {
    try { return basemapOf(localStorage.getItem(BASEMAP_KEY)).value; }
    catch (e) { return BASEMAPS[0].value; }
  }

  var tiles = null, tilesValue = null;

  function setBasemap(map, value) {
    if (tilesValue === value) return;
    tilesValue = value;

    var spec = basemapOf(value);
    /* العلامات تُقرأ على أرضية فاتحة بخلاف الداكنة، فتعرف الصفحة أيّهما */
    host.setAttribute('data-basemap', spec.dark ? 'dark' : 'light');

    var next = L.tileLayer(spec.url, {
      subdomains: spec.sub,
      maxZoom: spec.maxZoom,
      minZoom: data.MIN_ZOOM,
      /* الشاشات عالية الكثافة: البلاطة العادية تبدو ضبابية عليها */
      detectRetina: true,
      attribution: spec.attr
    });

    /* لو تعذّر المصدر المختار رجعنا إلى الافتراضي بدل إطار فارغ. ونقص
       بضع بلاطات أمر عادي، فلا ننتقل إلا بعد تكراره. */
    if (value !== BASEMAPS[0].value) {
      var misses = 0;
      next.on('tileerror', function () {
        if (++misses < 6 || tilesValue !== value) return;
        next.off('tileerror');
        setBasemap(map, BASEMAPS[0].value);
        var pick = document.getElementById('mapBase');
        if (pick) pick.value = BASEMAPS[0].value;
      });
    }

    next.addTo(map);
    if (tiles) {
      var previous = tiles;
      setTimeout(function () { map.removeLayer(previous); }, 260);
    }
    tiles = next;
  }

  /* ---------- الخريطة ---------- */
  function build() {
    var map = L.map(host, {
      center: data.CENTRE,
      zoom: data.ZOOM,
      minZoom: data.MIN_ZOOM,
      /* حدود التجوال أوسع من الكويت قليلًا، فاليد تتحرّك ولا تصطدم */
      maxBounds: data.PAN_BOUNDS,
      maxBoundsViscosity: 0.7,
      scrollWheelZoom: false,
      /* مستويات كسرية، ليضبط الإطارُ البلادَ تمامًا لا مقتطعةً */
      zoomSnap: 0.25,
      zoomControl: true,
      attributionControl: true
    });

    /* الإطار الأوّل: الكويت كاملةً وقد ملأت الإطار — قريبة بما يكفي
       لقراءة الطرق الرئيسة وأسماء المناطق، لا نقطةً في بحر فراغ. */
    map.fitBounds(data.BOUNDS, { padding: [8, 8] });

    setBasemap(map, savedBasemap());

    // التكبير بعجلة الفأرة بعد الضغط فقط، فلا تختطف الخريطة تمرير الصفحة
    map.on('click', function () { map.scrollWheelZoom.enable(); });
    map.on('mouseout', function () { map.scrollWheelZoom.disable(); });

    var canCluster = typeof L.markerClusterGroup === 'function';
    var layer = canCluster
      ? L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 44 })
      : L.layerGroup();
    layer.addTo(map);

    function pin(colour) {
      return L.divIcon({
        className: 'mappin',
        html: '<span style="background:' + colour + '"></span>',
        iconSize: [22, 22],
        iconAnchor: [11, 11],
        popupAnchor: [0, -13]
      });
    }

    function draw() {
      layer.clearLayers();
      visible().forEach(function (f) {
        var s = data.statusOf(f.status);
        L.marker([f.lat, f.lng], {
          icon: pin(s.color),
          title: isEn() ? f.nameEn : f.name,
          alt: isEn() ? f.nameEn : f.name
        }).bindPopup(popupHtml(f), { maxWidth: 280 }).addTo(layer);
      });
    }
    draw();
    mapInstance = map;
    setTimeout(function () { map.invalidateSize(); }, 120);
    return draw;
  }

  var mapInstance = null;
  var redraw = (typeof L === 'undefined') ? fallback() : build();

  /* ---------- ربط المرشّحات ---------- */
  ['mapType', 'mapStatus', 'mapGov'].forEach(function (id) {
    var sel = document.getElementById(id);
    if (!sel) return;
    sel.addEventListener('change', function () {
      filters[id === 'mapType' ? 'type' : id === 'mapStatus' ? 'status' : 'gov'] = sel.value;
      redraw();
      var count = document.getElementById('mapCount');
      if (count) count.textContent = String(visible().length);
    });
  });

  /* ---------- مبدّل الخلفية ---------- */
  var base = document.getElementById('mapBase');
  if (base) {
    if (typeof L === 'undefined') {
      /* بلا خريطة لا معنى للمبدّل */
      var wrap = base.closest('.mapbar__f');
      if (wrap) wrap.hidden = true;
    } else {
      base.innerHTML = '';
      BASEMAPS.forEach(function (b) {
        var o = document.createElement('option');
        o.value = b.value;
        o.textContent = isEn() ? b.en : b.ar;
        o.setAttribute('data-ar', b.ar);
        o.setAttribute('data-en', b.en);
        base.appendChild(o);
      });
      base.value = savedBasemap();
      base.addEventListener('change', function () {
        try { localStorage.setItem(BASEMAP_KEY, base.value); } catch (e) { /* التخزين غير متاح */ }
        if (mapInstance) setBasemap(mapInstance, base.value);
      });
    }
  }

  var count = document.getElementById('mapCount');
  if (count) count.textContent = String(visible().length);
})();
