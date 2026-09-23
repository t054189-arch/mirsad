/* مِرصاد — سجلّ أحداث الدخول.

   يكتب سطرًا عند كل دخول أو خروج أو تغيير في التحقق بخطوتين، ويقرأ
   ما سبق ليعرضه على صاحب الحساب. الغاية أن ينتبه المرء إلى دخول ليس
   منه.

   وحدّ هذا السجلّ يُقال صراحة: السطر يكتبه المتصفح، فهو شهادة
   المتصفح على نفسه. والجدول على الخادم لا يقبل تعديلًا ولا حذفًا من
   أحد، ولا يقبل من المتصفح إلا نوع الحدث ووصف المتصفح — أما صاحب
   السطر ووقته فيكتبهما الخادم. فمن دخل بحساب مسروق قد يضيف ضجيجًا،
   لكنه لا يمحو ما قبله.

   والكتابة لا تُعطِّل شيئًا: إن فشلت مضى الدخول. سجلّ معطوب أهون من
   باب مغلق. */
window.MIRSAAD_AUDIT = (function () {
  'use strict';

  function client() {
    var SB = window.MIRSAAD_SB;
    return SB && SB.client();
  }

  /* وصف مختصر للمتصفح: يكفي للتمييز بين «هاتفي» و«جهاز لا أعرفه»،
     ولا نُطيل فنجمع بصمة تتبُّع. */
  function agent() {
    var ua = (navigator.userAgent || '').slice(0, 300);
    return ua || null;
  }

  function log(kind) {
    var sb = client();
    if (!sb) return Promise.resolve();
    /* الأعمدة المرسلة عمودان فقط — وهما الوحيدان اللذان يملك
       المتصفح صلاحية الكتابة فيهما. */
    return sb.from('auth_events').insert({ kind: kind, agent: agent() })
      .then(function () { /* تمّ */ })
      .catch(function () { /* لا شيء: السجلّ لا يوقف الدخول */ });
  }

  function recent(limit) {
    var sb = client();
    if (!sb) return Promise.resolve([]);
    return sb.from('auth_events')
      .select('id, at, kind, agent')
      .order('at', { ascending: false })
      .limit(limit || 20)
      .then(function (r) { return (r && r.data) || []; })
      .catch(function () { return []; });
  }

  return { log: log, recent: recent };
})();
