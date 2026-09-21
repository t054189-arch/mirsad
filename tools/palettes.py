#!/usr/bin/env python3
"""يولّد كتل ألوان الثيمات ويتحقق من نسب التباين قبل كتابتها."""
import sys

FAM = {
 'mirsaad': {
  'dark':  dict(bg='#181613',bg_alt='#1d1b17',surface='#22201b',surface_2='#2a2721',ink='#f2ece3',
                ink_soft='#a89f92',line='#35302a',accent='#ead5b8',accent_deep='#d6bc96',on_accent='#201c16',
                hi='#dd7b76',mid='#e0a75c',ok='#63b894',grid='rgba(234,213,184,.045)',
                shadow='0 20px 52px rgba(0,0,0,.5)',mark='.95'),
  'light': dict(bg='#f7f3ec',bg_alt='#fffdf8',surface='#fffdf8',surface_2='#f1e8da',ink='#2b241d',
                ink_soft='#6a5f52',line='#e4dac9',accent='#8c5e17',accent_deep='#704b12',on_accent='#fffdf8',
                hi='#a8291b',mid='#8a5a00',ok='#2f6b45',grid='rgba(43,36,29,.05)',
                shadow='0 16px 40px rgba(43,36,29,.09)',mark='.6'),
 },
}
NAMES = {'mirsaad': 'مرصاد — الهوية الرسمية'}

def hx(c):
    c=c.lstrip('#'); return tuple(int(c[i:i+2],16) for i in (0,2,4))
def lum(rgb):
    f=lambda v:(v/255)/12.92 if v/255<=0.03928 else (((v/255)+0.055)/1.055)**2.4
    r,g,b=[f(v) for v in rgb]; return .2126*r+.7152*g+.0722*b
def cr(a,b):
    la,lb=lum(hx(a)),lum(hx(b)); hi,lo=max(la,lb),min(la,lb); return (hi+.05)/(lo+.05)

PAIRS = [("ink",'ink','bg'),("ink",'ink','surface'),("ink-soft",'ink_soft','bg'),
         ("ink-soft",'ink_soft','bg_alt'),("ink-soft",'ink_soft','surface'),("ink-soft",'ink_soft','surface_2'),
         ("accent",'accent','bg'),("accent",'accent','bg_alt'),("accent",'accent','surface'),
         ("accent",'accent','surface_2'),("on-accent",'on_accent','accent'),
         ("hi",'hi','surface'),("hi",'hi','surface_2'),("mid",'mid','surface'),("mid",'mid','surface_2'),
         ("ok",'ok','surface'),("ok",'ok','surface_2')]

def check():
    bad=[]
    for fam,modes in FAM.items():
        for mode,v in modes.items():
            for label,fgk,bgk in PAIRS:
                r=cr(v[fgk],v[bgk])
                if r<4.5: bad.append(f"{fam:9} {mode:5} {label}/{bgk:10} {r:.2f}")
    return bad

def block(sel, v, comment):
    out = f"/* {comment} */\n{sel}{{\n"
    for k,tok in [('bg','--bg'),('bg_alt','--bg-alt'),('surface','--surface'),('surface_2','--surface-2'),
                  ('ink','--ink'),('ink_soft','--ink-soft'),('line','--line'),
                  ('accent','--accent'),('accent_deep','--accent-deep'),('on_accent','--on-accent'),
                  ('hi','--hi'),('mid','--mid'),('ok','--ok'),
                  ('grid','--grid-ink'),('shadow','--shadow'),('mark','--mark-strength')]:
        out += f"  {tok+':':16} {v[k]};\n"
    out += f"  --accent-soft: color-mix(in srgb, {v['accent']} 11%, transparent);\n}}\n"
    return out

if __name__ == '__main__':
    bad = check()
    if bad:
        print("CONTRAST FAILURES:\n" + "\n".join(bad)); sys.exit(1)
    css = '''/* ============================================================
   مِرصاد · MIRSAAD — منصة إدارة دورة فحص المنشآت
   عربي/إنجليزي · RTL/LTR · الهوية الرسمية بوضعين
   الوضع على [data-mode]: الداكن هو الأساس، والفاتح يستبدل القيم
   هذه الكتل مولّدة من tools/palettes.py — عدّلها هناك لا هنا
   ============================================================ */

'''
    m = FAM['mirsaad']
    css += f'/* ========== {NAMES["mirsaad"]} ========== */\n'
    css += block(':root', m['dark'], 'الوضع الداكن — الأساس') + "\n"
    css += block('[data-mode="light"]', m['light'], 'الوضع الفاتح') + "\n"
    css += '[data-mode="dark"]{  color-scheme: dark; }\n[data-mode="light"]{ color-scheme: light; }\n\n'
    sys.stdout.write(css)
    print(f"/* {len(FAM)*2} palettes · all {len(PAIRS)} text pairs >= 4.5:1 */", file=sys.stderr)
