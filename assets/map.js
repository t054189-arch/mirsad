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

  /* ---------- الخريطة ---------- */
  function build() {
    var map = L.map(host, {
      center: data.CENTRE,
      zoom: data.ZOOM,
      maxBounds: data.BOUNDS,
      maxBoundsViscosity: 0.85,
      scrollWheelZoom: false,
      attributionControl: true
    });
    map.fitBounds(data.BOUNDS, { padding: [18, 18] });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      minZoom: 7,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

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
        iconSize: [18, 18],
        iconAnchor: [9, 9],
        popupAnchor: [0, -10]
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
    setTimeout(function () { map.invalidateSize(); }, 120);
    return draw;
  }

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

  var count = document.getElementById('mapCount');
  if (count) count.textContent = String(visible().length);
})();
