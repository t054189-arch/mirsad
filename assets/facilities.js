/* مِرصاد — بيانات المنشآت وإحداثياتها.

   كل منشأة لها سجل فحص، ولكل سجل موضع على خريطة الكويت. الإحداثيات
   تقريبية وواقعية الموضع، موزّعة على المحافظات الست، وهي — كبقية بيانات
   العرض — متخيَّلة لأغراض العرض لا سجلًّا لجهة حقيقية.

   النوع (type) من FACILITY_TYPES، والمحافظة (gov) من GOVERNORATES، كلاهما
   في assets/facility-types.js. والحالة من STATUSES أدناه. */
(function (global) {
  'use strict';

  /* حالات الفحص وألوانها على الخريطة وفي المفتاح */
  var STATUSES = [
    { value: 'done',     ar: 'مكتمل',        en: 'Completed',  color: '#63b894' },
    { value: 'progress', ar: 'قيد التنفيذ',  en: 'In progress', color: '#e0a75c' },
    { value: 'late',     ar: 'متأخر / حرج',  en: 'Overdue / critical', color: '#dd7b76' }
  ];

  /* المنشآت. detail = صفحة تفاصيل الفحص التي يفتحها زر «عرض تفاصيل الفحص» */
  var FACILITIES = [
    { id: 'jaber',   name: 'جسر جابر',              nameEn: 'Jaber Causeway',
      type: 'bridge',        gov: 'capital',   status: 'done',
      lat: 29.4283, lng: 47.9061, last: '2026-09-20', detail: 'record.html' },

    { id: 'finance', name: 'مبنى وزارة المالية',     nameEn: 'Ministry of Finance',
      type: 'government',    gov: 'capital',   status: 'done',
      lat: 29.3759, lng: 47.9774, last: '2026-09-18', detail: 'results.html' },

    { id: 'coastal', name: 'طريق الساحل',            nameEn: 'Coastal Road',
      type: 'road',          gov: 'hawalli',   status: 'late',
      lat: 29.3395, lng: 48.0510, last: '2026-09-15', detail: 'review.html' },

    { id: 'tunnel',  name: 'نفق المطار',             nameEn: 'Airport Tunnel',
      type: 'tunnel',        gov: 'farwaniya', status: 'done',
      lat: 29.2406, lng: 47.9714, last: '2026-08-02', detail: 'results.html' },

    { id: 'dam',     name: 'سد التحويل الشمالي',      nameEn: 'Northern Diversion Dam',
      type: 'water_tower',   gov: 'jahra',     status: 'progress',
      lat: 29.3375, lng: 47.6581, last: '2026-07-11', detail: 'analysis.html' },

    { id: 'wadi',    name: 'جسر الوادي',             nameEn: 'Wadi Bridge',
      type: 'bridge',        gov: 'ahmadi',    status: 'progress',
      lat: 29.0769, lng: 48.0839, last: '2026-06-28', detail: 'analysis.html' },

    { id: 'school',  name: 'مدرسة صباح السالم',       nameEn: 'Sabah Al-Salem School',
      type: 'school',        gov: 'mubarak',   status: 'done',
      lat: 29.2560, lng: 48.0700, last: '2026-05-19', detail: 'results.html' },

    { id: 'port',    name: 'ميناء الشعيبة',           nameEn: 'Shuaiba Port',
      type: 'port',          gov: 'ahmadi',    status: 'late',
      lat: 29.0367, lng: 48.1531, last: '2026-04-30', detail: 'review.html' },

    { id: 'hospital',name: 'مستشفى الفروانية',        nameEn: 'Farwaniya Hospital',
      type: 'hospital',      gov: 'farwaniya', status: 'done',
      lat: 29.2775, lng: 47.9586, last: '2026-03-12', detail: 'results.html' },

    { id: 'mall',    name: 'مجمع الأفنيوز',           nameEn: 'The Avenues',
      type: 'mall',          gov: 'farwaniya', status: 'progress',
      lat: 29.3028, lng: 47.9364, last: '2026-02-24', detail: 'analysis.html' }
  ];

  function statusOf(value) {
    for (var i = 0; i < STATUSES.length; i++) {
      if (STATUSES[i].value === value) return STATUSES[i];
    }
    return STATUSES[0];
  }

  global.MIRSAAD_FACILITIES = {
    STATUSES: STATUSES,
    FACILITIES: FACILITIES,
    statusOf: statusOf,
    /* حدود الكويت تقريبًا، ليضبط عليها العرض فلا يشرد عنها */
    BOUNDS: [[28.50, 46.53], [30.10, 48.45]],
    CENTRE: [29.3759, 47.9774],
    ZOOM: 9
  };
})(window);
