#!/usr/bin/env python3
"""يبني صفحات خطوات الفحص — كل خطوة صفحة مستقلة بهيكل واحد."""
import pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent

STEPS = [
    ('step-1', 'بيانات الفحص',  'Inspection data'),
    ('step-2', 'رفع البيانات',  'Upload data'),
    ('step-3', 'التحليل',       'Analysis'),
    ('step-4', 'المراجعة',      'Review'),
    ('step-5', 'السجل والإشعار','Record & alert'),
]

BODY = {}

BODY['step-1'] = '''
      <p class="lede" data-t="s1lede">اختر المنشأة وسجّل بيانات الزيارة.</p>
      <div class="pane">
        <div class="row"><span data-t="fAsset">المنشأة</span>
          <select class="pick">
            <option>جسر جابر — الكويت</option>
            <option>مبنى وزارة المالية — مدينة الكويت</option>
            <option>طريق الساحل — الساحل الشمالي</option>
            <option>نفق المطار — الفروانية</option>
          </select></div>
        <div class="row"><span data-t="fDate">تاريخ الفحص</span><b>21 / 09 / 2026</b></div>
        <div class="row"><span data-t="fType">نوع الفحص</span><b data-t="fTypeV">فحص دوري</b></div>
        <div class="row"><span data-t="fWho">الموظف المسؤول</span><b class="who-name">—</b></div>
        <div class="row"><span data-t="fSec">القطاع</span><b data-t="fSecV">الركائز والسطح السفلي</b></div>
        <div class="area" data-t="fNotes">ملاحظات ميدانية…</div>
      </div>
'''

BODY['step-2'] = '''
      <p class="lede" data-t="s2lede">ارفع صور الزيارة وتقاريرها وقياساتها.</p>
      <div class="pane">
        <div class="drop">
          <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d="M12 16V5m0 0L8 9m4-4 4 4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <span data-t="drag">اسحب الملفات هنا</span><small>JPG · PNG · PDF</small>
        </div>
        <div class="files">
          <span class="file"><i></i><b>pier-02-crack.jpg</b><small>2.4 MB</small></span>
          <span class="file"><i></i><b>soffit-east.jpg</b><small>1.8 MB</small></span>
          <span class="file"><i></i><b>survey-2026.pdf</b><small>640 KB</small></span>
        </div>
      </div>
'''

BODY['step-3'] = '''
      <p class="lede" data-t="s3lede">يقرأ الوكيل الذكي الملفات ويقارنها بسجل المنشأة.</p>
      <div class="pane mid">
        <div class="ticks" id="ticks">
          <div class="tick"><i></i><span data-t="t1">تحليل الصور بالذكاء الاصطناعي</span></div>
          <div class="tick"><i></i><span data-t="t2">البحث في سجل المنشأة</span></div>
          <div class="tick"><i></i><span data-t="t3">استرجاع الفحوصات السابقة</span></div>
          <div class="tick"><i></i><span data-t="t4">مقارنة النتائج</span></div>
          <div class="tick"><i></i><span data-t="t5">تحديد الملاحظات المحتملة</span></div>
        </div>
        <div class="bar"><b id="bar"></b></div>
        <p class="pct" id="pct">٠٪</p>
      </div>
'''

BODY['step-4'] = '''
      <p class="lede" data-t="s4lede">راجع ما استخرجه الوكيل، واعتمده أو ارفضه.</p>
      <div class="pane">
        <div class="head2"><b data-t="find1">احتمال وجود تشقق — الركيزة ٢</b><span class="pill hi" data-t="lvHi">عالية</span></div>
        <div class="cmp">
          <span><small data-t="prev">الفحص السابق</small><b>0.6 مم</b></span>
          <span class="arw" aria-hidden="true">←</span>
          <span><small data-t="curr">الفحص الحالي</small><b class="now">1.4 مم</b></span>
        </div>
        <div class="bar"><b style="width:87%"></b></div>
        <p class="note2" data-t="conf">٨٧٪ دقة التحليل · مقارنة بالسابق: ملاحظة مشابهة في فحص ٢٠٢٤</p>
        <div class="acts">
          <a class="go ok" href="step-5.html" data-t="approve">موافقة</a>
          <a class="go no" href="step-4.html" data-t="reject">رفض</a>
          <a class="go gh" href="step-4.html" data-t="edit">تعديل</a>
        </div>
      </div>
'''

BODY['step-5'] = '''
      <p class="lede ok-t" data-t="s5lede">تم حفظ القرار في سجل المنشأة.</p>
      <div class="pane">
        <div class="row"><span data-t="fNo">رقم الفحص</span><b>INSP-2026-014</b></div>
        <div class="row"><span data-t="fAsset">المنشأة</span><b>جسر جابر</b></div>
        <div class="row"><span data-t="fDate">تاريخ الفحص</span><b>21 / 09 / 2026</b></div>
        <div class="row"><span data-t="fState">الحالة</span><b data-t="fStateV">تمت المراجعة</b></div>
      </div>
      <div class="toast ok"><i></i><span><b data-t="okT">تمت الموافقة على نتائج الفحص</b><span data-t="okD">تم تحديث سجل المنشأة بنجاح.</span></span></div>
      <div class="toast warn"><i></i><span><b data-t="wT">تحتاج إلى إجراء إضافي</b><span data-t="wD">تم تعديل إحدى نتائج فحص جسر جابر.</span></span></div>
      <p class="note2 mid-t" data-t="loop">ما حُفظ الآن هو ما سيقرأه الوكيل الذكي في الفحص القادم.</p>
'''

def page(i, slug, ar, en):
    prev = STEPS[i-1][0] + '.html' if i > 0 else 'app.html#/dashboard'
    nxt  = STEPS[i+1][0] + '.html' if i < len(STEPS)-1 else 'app.html#/dashboard'
    prev_t = 'رجوع' if i > 0 else 'لوحة التحكم'
    nxt_t  = 'التالي' if i < len(STEPS)-1 else 'إنهاء والعودة'
    dots = "\n".join(
        f'          <a class="stepper__s{" is-on" if j==i else ""}{" is-done" if j<i else ""}" '
        f'href="{s[0]}.html"><i>{j+1}</i><span data-t="n{j+1}">{s[1]}</span></a>'
        for j, s in enumerate(STEPS))
    # الخطوة الثالثة تنتقل وحدها بعد انتهاء التحليل
    nxt_attr = ' id="goNext"' if slug == 'step-3' else ''
    return f'''<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{ar} — مرصاد · MIRSAAD</title>
    <meta name="robots" content="noindex" />
    <script src="guard.js"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&family=Noto+Kufi+Arabic:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="auth.css" />
    <link rel="stylesheet" href="steps.css" />
  </head>
  <body class="steps">
    <header class="bar2">
      <a class="bar2__brand" href="app.html#/dashboard">
        <svg viewBox="0 0 100 52" width="28" height="15" aria-hidden="true">
          <g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
            <path d="M50 5 C 76 5, 94 20, 94 48"/><path d="M50 5 C 70 5, 80 22, 80 48"/>
            <path d="M50 5 C 62 6, 66 24, 66 48"/><path d="M50 5 V48"/>
            <path d="M50 5 C 38 6, 34 24, 34 48"/><path d="M50 5 C 30 5, 20 22, 20 48"/>
            <path d="M50 5 C 24 5, 6 20, 6 48"/>
          </g>
        </svg>
        <span>مرصاد</span>
      </a>
      <span class="bar2__crumb" data-t="newInsp">إجراء فحص جديد</span>
      <div class="bar2__tools">
        <span class="who2"><i aria-hidden="true"></i><b class="who-name">—</b></span>
        <button class="chip" id="langBtn" type="button"><span id="langLabel">EN</span></button>
        <button class="chip" id="outBtn" type="button" data-t="signout">خروج</button>
      </div>
    </header>

    <main class="page2">
      <nav class="stepper" aria-label="خطوات الفحص">
{dots}
      </nav>

      <h1 class="page2__h" data-t="h{i+1}">{ar}</h1>
{BODY[slug]}
      <div class="nav2">
        <a class="go gh" href="{prev}" data-t="{'back' if i>0 else 'dash'}">{prev_t}</a>
        <a class="go"{nxt_attr} href="{nxt}" data-t="{'next' if i<len(STEPS)-1 else 'finish'}">{nxt_t}</a>
      </div>
    </main>

    <script src="steps.js"></script>
  </body>
</html>
'''

for i, (slug, ar, en) in enumerate(STEPS):
    (ROOT / f'{slug}.html').write_text(page(i, slug, ar, en), encoding='utf-8')
    print(f'  {slug}.html — {ar}')
