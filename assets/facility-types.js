/* مِرصاد — قوائم ثابتة مشتركة.

   مصدر واحد لأنواع المنشآت ولمحافظات الكويت. كل موضع يعرض نوع المنشأة
   أو يرشّح به — نموذج الفحص الجديد، ومرشّحات الخريطة، وأي جدول أو صفحة
   تفصيل لاحقًا — يقرأ من هنا، فلا تفترق التسميات ولا تُكرَّر.

   للإضافة لاحقًا: أضف سطرًا إلى FACILITY_TYPES وحده. القيمة (value) هي
   ما يُخزَّن، والتسمية العربية هي ما يُعرض، و en للواجهة الإنجليزية. */
(function (global) {
  'use strict';

  var FACILITY_TYPES = [
    { value: 'residential',   ar: 'مبنى سكني',                  en: 'Residential building' },
    { value: 'commercial',    ar: 'مبنى تجاري',                 en: 'Commercial building' },
    { value: 'government',    ar: 'مبنى حكومي',                 en: 'Government building' },
    { value: 'industrial',    ar: 'مبنى صناعي / مصنع',          en: 'Industrial building / factory' },
    { value: 'bridge',        ar: 'جسر',                        en: 'Bridge' },
    { value: 'tunnel',        ar: 'نفق',                        en: 'Tunnel' },
    { value: 'road',          ar: 'طريق',                       en: 'Road' },
    { value: 'school',        ar: 'مدرسة / منشأة تعليمية',      en: 'School / educational facility' },
    { value: 'hospital',      ar: 'مستشفى / منشأة صحية',        en: 'Hospital / health facility' },
    { value: 'mosque',        ar: 'مسجد',                       en: 'Mosque' },
    { value: 'mall',          ar: 'مجمع تجاري',                 en: 'Shopping mall' },
    { value: 'warehouse',     ar: 'مستودع / مخزن',              en: 'Warehouse / store' },
    { value: 'parking',       ar: 'موقف سيارات متعدد الأدوار',  en: 'Multi-storey car park' },
    { value: 'water_tower',   ar: 'خزان مياه / برج مياه',       en: 'Water tank / water tower' },
    { value: 'power_station', ar: 'محطة كهرباء',                en: 'Power station' },
    { value: 'port',          ar: 'ميناء / منشأة بحرية',        en: 'Port / marine facility' },
    { value: 'stadium',       ar: 'منشأة رياضية',               en: 'Sports facility' },
    { value: 'other',         ar: 'أخرى',                       en: 'Other' }
  ];

  /* محافظات الكويت الست */
  var GOVERNORATES = [
    { value: 'capital',        ar: 'العاصمة',        en: 'Al Asimah' },
    { value: 'hawalli',        ar: 'حولي',           en: 'Hawalli' },
    { value: 'farwaniya',      ar: 'الفروانية',      en: 'Al Farwaniyah' },
    { value: 'mubarak',        ar: 'مبارك الكبير',   en: 'Mubarak Al-Kabeer' },
    { value: 'ahmadi',         ar: 'الأحمدي',        en: 'Al Ahmadi' },
    { value: 'jahra',          ar: 'الجهراء',        en: 'Al Jahra' }
  ];

  function label(list, value) {
    var en = document.documentElement.lang === 'en';
    for (var i = 0; i < list.length; i++) {
      if (list[i].value === value) return en ? list[i].en : list[i].ar;
    }
    return '';
  }

  /* يملأ عنصر <select> من إحدى القائمتين، ويُبقي الخيار الأول (النائب)
     كما هو في الصفحة. يُستدعى قبل chrome.js فتلتقط الترجمةُ الخياراتِ. */
  function fill(select, list, lang) {
    if (!select) return;
    var keep = select.querySelector('option[value=""]');
    select.innerHTML = '';
    if (keep) select.appendChild(keep);
    list.forEach(function (item) {
      var o = document.createElement('option');
      o.value = item.value;
      o.textContent = lang === 'en' ? item.en : item.ar;
      // الترجمة تتبع اللغة عبر chrome.js، فنحفظ المقابل الإنجليزي هنا
      o.setAttribute('data-en', item.en);
      o.setAttribute('data-ar', item.ar);
      select.appendChild(o);
    });
  }

  global.MIRSAAD_LISTS = {
    FACILITY_TYPES: FACILITY_TYPES,
    GOVERNORATES: GOVERNORATES,
    facilityLabel: function (v) { return label(FACILITY_TYPES, v); },
    governorateLabel: function (v) { return label(GOVERNORATES, v); },
    fill: fill
  };
})(window);
