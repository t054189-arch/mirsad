#!/usr/bin/env python3
"""يبني صفحات الموقع الثابتة من هيكل واحد + محتوى كل صفحة.

كل صفحة في src/pages/*.html تبدأ بترويسة تعليقات:
    <!--slug: structures-->      اسم الملف الناتج
    <!--nav: structures-->       القسم النشط في الشريط الجانبي
    <!--key: sc.assets-->        مفتاح العنوان الإنجليزي
    <!--ar: المنشآت-->            العنوان العربي

ومفاتيح اختيارية:
    <!--public: yes-->           صفحة عامة: تُعفى من حارس الدخول، ويسقط
                                 عنها زرّ الخروج وهوية المستخدم
    <!--css: dataset.css-->      أنماط إضافية من assets/
    <!--js: dataset.js-->        نصوص إضافية من assets/

ثم المحتوى. يُدمج في src/layout.html ويُكتب في جذر المشروع.

    python3 tools/build.py            # يبني
    python3 tools/build.py --check    # يفشل إن كان الناتج قديمًا
"""
import re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'src'

NAV = [
    ('board',       'app.html#/dashboard', 'sd.board','لوحة التحكم'),
    ('home',        'home.html',        'sd.home',    'نظرة عامة'),
    ('structures',  'structures.html',  'sd.assets',  'المنشآت'),
    ('map',         'map.html',         'sd.map',     'الخريطة'),
    ('inspection',  'inspection.html',  'sd.insp',    'فحص جديد'),
    ('analysis',    'analysis.html',    'sd.analysis','التحليل'),
    ('results',     'results.html',     'sd.results', 'النتائج'),
    ('review',      'review.html',      'sd.review',  'المراجعة'),
    ('record',      'record.html',      'sd.rep',     'السجلات'),
    ('alerts',      'alerts.html',      'sd.alerts',  'الإشعارات'),
    ('dataset',     'dataset.html',     'sd.ref',     'بيانات مرجعية'),
    ('about',       'about.html',       'sd.about',   'عن المشروع'),
]

WHO = ('    <span class="who" id="whoAmI" title="">'
       '<i aria-hidden="true"></i><b></b><em class="who__role"></em></span>\n')

OUT = """    <button class="iconbtn" id="outBtn" data-i18n-attr="aria-label:a.logout" aria-label="تسجيل الخروج">
      <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
        <path d="M15 5.5V4a1.5 1.5 0 0 0-1.5-1.5h-8A1.5 1.5 0 0 0 4 4v16a1.5 1.5 0 0 0 1.5 1.5h8A1.5 1.5 0 0 0 15 20v-1.5"
              fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        <path d="M9.5 12h11m0 0-3.2-3.2M20.5 12l-3.2 3.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
"""


# نصوص الصفحات الداخلية. i18n و chrome وحدهما ما يلزم صفحة عامة:
# الأولى للترجمة والثانية للوضع والقائمة. والباقي بيانات منشآت وخرائط
# لا تستعملها، فلا تُحمَّل عليها.
SCRIPTS = """<script src="assets/facility-types.js"></script>
<script src="assets/kuwait.js"></script>
<script src="assets/facilities.js"></script>
<script src="assets/i18n.js"></script>
<script src="assets/chrome.js"></script>
<script src="assets/map.js"></script>"""

PUBLIC_SCRIPTS = """<script src="assets/i18n.js"></script>
<script src="assets/chrome.js"></script>"""


def header(text, name):
    out = {}
    for m in re.finditer(r'<!--\s*(\w+):\s*(.*?)\s*-->', text):
        out[m.group(1)] = m.group(2)
    for need in ('slug', 'nav', 'key', 'ar'):
        if need not in out:
            sys.exit(f"{name}: الترويسة ينقصها {need}")
    body = re.sub(r'^(?:<!--\s*\w+:.*?-->\s*\n)+', '', text, count=1)
    return out, body

def sidebar(active):
    rows = []
    for slug, href, key, ar in NAV:
        on = ' is-on' if slug == active else ''
        cur = ' aria-current="page"' if slug == active else ''
        rows.append(
            f'      <a class="sidenav__item{on}" href="{href}"{cur}>'
            f'<i aria-hidden="true"></i><span data-i18n="{key}">{ar}</span></a>')
    return "\n".join(rows)

def build(check=False):
    layout = (SRC / 'layout.html').read_text(encoding='utf-8')
    stale = []
    for frag in sorted((SRC / 'pages').glob('*.html')):
        meta, body = header(frag.read_text(encoding='utf-8'), frag.name)
        pub = meta.get('public', '').lower() in ('yes', 'true', '1')
        head = ''.join(f'\n<link rel="stylesheet" href="assets/{c.strip()}" />'
                       for c in meta.get('css', '').split(',') if c.strip())
        foot = ''.join(f'\n<script src="assets/{j.strip()}"></script>'
                       for j in meta.get('js', '').split(',') if j.strip())
        page = (layout
                .replace('{{NAV}}', sidebar(meta['nav']))
                .replace('{{TITLE_KEY}}', meta['key'])
                .replace('{{TITLE_AR}}', meta['ar'])
                .replace('{{HTML_ATTR}}', ' data-public' if pub else '')
                .replace('{{HEAD_EXTRA}}', head)
                .replace('{{SCRIPTS}}', PUBLIC_SCRIPTS if pub else SCRIPTS)
                .replace('{{FOOT_EXTRA}}', foot)
                # زائر لم يسجّل دخوله لا معنى لزرّ خروجه ولا لهويته
                .replace('{{WHO}}', '' if pub else WHO)
                .replace('{{OUT}}', '' if pub else OUT)
                .replace('{{BODY}}', body.rstrip() + "\n"))
        out = ROOT / f"{meta['slug']}.html"
        if check:
            if not out.exists() or out.read_text(encoding='utf-8') != page:
                stale.append(out.name)
        else:
            out.write_text(page, encoding='utf-8')
            print(f"  {frag.name:22} -> {out.name}")
    if check:
        if stale:
            print("صفحات ناتجة قديمة، شغّل tools/build.py:\n  " + "\n  ".join(stale))
            sys.exit(1)
        print(f"build OK — {len(list((SRC/'pages').glob('*.html')))} pages up to date")

if __name__ == '__main__':
    build(check='--check' in sys.argv)
