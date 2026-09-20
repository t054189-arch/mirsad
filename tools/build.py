#!/usr/bin/env python3
"""يبني صفحات الموقع الثابتة من هيكل واحد + محتوى كل صفحة.

كل صفحة في src/pages/*.html تبدأ بترويسة تعليقات:
    <!--slug: structures-->      اسم الملف الناتج
    <!--nav: structures-->       القسم النشط في الشريط الجانبي
    <!--key: sc.assets-->        مفتاح العنوان الإنجليزي
    <!--ar: المنشآت-->            العنوان العربي
ثم المحتوى. يُدمج في src/layout.html ويُكتب في جذر المشروع.

    python3 tools/build.py            # يبني
    python3 tools/build.py --check    # يفشل إن كان الناتج قديمًا
"""
import re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'src'

NAV = [
    ('home',        'home.html',        'sd.home',    'الرئيسية'),
    ('structures',  'structures.html',  'sd.assets',  'المنشآت'),
    ('inspection',  'inspection.html',  'sd.insp',    'فحص جديد'),
    ('results',     'results.html',     'sd.results', 'النتائج'),
    ('record',      'record.html',      'sd.rep',     'السجلات'),
    ('alerts',      'alerts.html',      'sd.alerts',  'الإشعارات'),
    ('about',       'about.html',       'sd.about',   'عن المشروع'),
]

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
        page = (layout
                .replace('{{NAV}}', sidebar(meta['nav']))
                .replace('{{TITLE_KEY}}', meta['key'])
                .replace('{{TITLE_AR}}', meta['ar'])
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
