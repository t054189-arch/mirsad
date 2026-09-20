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
 'dawn': {
  'dark':  dict(bg='#121729',bg_alt='#171d33',surface='#1b2239',surface_2='#232b47',ink='#f5f1ea',
                ink_soft='#a6abc7',line='#2d3556',accent='#ffa552',accent_deep='#ef8a2d',on_accent='#2a1503',
                hi='#ff7b72',mid='#ffcf6b',ok='#6fe0a8',grid='rgba(255,255,255,.05)',
                shadow='0 18px 48px rgba(0,0,0,.42)',mark='1'),
  'light': dict(bg='#fbf6ef',bg_alt='#fffdfa',surface='#ffffff',surface_2='#f5ebdd',ink='#241c14',
                ink_soft='#6b5c4b',line='#e8dcc9',accent='#a1560f',accent_deep='#81450c',on_accent='#ffffff',
                hi='#b03024',mid='#8a5a00',ok='#2f6b45',grid='rgba(36,28,20,.05)',
                shadow='0 16px 40px rgba(36,28,20,.09)',mark='.6'),
 },
 'horizon': {
  'dark':  dict(bg='#0b1520',bg_alt='#0f1c2a',surface='#132232',surface_2='#1a2c3f',ink='#eaf2f9',
                ink_soft='#94a9bd',line='#223547',accent='#63b8f5',accent_deep='#3f9be0',on_accent='#05172a',
                hi='#ff8079',mid='#ffc266',ok='#5fd6a8',grid='rgba(255,255,255,.05)',
                shadow='0 18px 48px rgba(0,0,0,.45)',mark='.9'),
  'light': dict(bg='#f3f7fb',bg_alt='#ffffff',surface='#ffffff',surface_2='#e6eff8',ink='#10202e',
                ink_soft='#506678',line='#d5e3ef',accent='#0a6dbb',accent_deep='#085795',on_accent='#ffffff',
                hi='#b9291a',mid='#8a5a00',ok='#14705a',grid='rgba(16,32,46,.055)',
                shadow='0 16px 40px rgba(16,32,46,.09)',mark='.6'),
 },
 'restored': {
  'dark':  dict(bg='#0e1a19',bg_alt='#112220',surface='#142826',surface_2='#1c332f',ink='#eef6f3',
                ink_soft='#97ada8',line='#214039',accent='#62dcae',accent_deep='#3dbf90',on_accent='#04231a',
                hi='#ff8a7a',mid='#ffc978',ok='#62dcae',grid='rgba(255,255,255,.05)',
                shadow='0 18px 46px rgba(0,0,0,.45)',mark='.9'),
  'light': dict(bg='#f1f6f3',bg_alt='#fbfdfc',surface='#ffffff',surface_2='#e4efe9',ink='#12201b',
                ink_soft='#52635b',line='#d5e4dc',accent='#0f7355',accent_deep='#0a5740',on_accent='#ffffff',
                hi='#b03123',mid='#8a5a00',ok='#0f7355',grid='rgba(18,32,27,.05)',
                shadow='0 16px 38px rgba(18,32,27,.08)',mark='.55'),
 },
}
NAMES = {'mirsaad':'مرصاد — الهوية الرسمية (رملي)','dawn':'فجر (كهرماني)',
         'horizon':'أُفق (أزرق)','restored':'ترميم (نعناعي)'}

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
   عربي/إنجليزي · RTL/LTR · أربع عائلات ألوان × وضعين
   العائلة على [data-theme] والوضع على [data-mode]
   هذه الكتل مولّدة من tools/palettes.py — عدّلها هناك لا هنا
   ============================================================ */

'''
    for fam,modes in FAM.items():
        css += f'/* ========== عائلة: {NAMES[fam]} ========== */\n'
        sel = f':root,\n[data-theme="{fam}"]' if fam=='mirsaad' else f'[data-theme="{fam}"]'
        css += block(sel, modes['dark'], 'الوضع الداكن — الأساس') + "\n"
        css += block(f'[data-theme="{fam}"][data-mode="light"]', modes['light'], 'الوضع الفاتح') + "\n"
    css += '[data-mode="dark"]{  color-scheme: dark; }\n[data-mode="light"]{ color-scheme: light; }\n\n'
    sys.stdout.write(css)
    print(f"/* {len(FAM)*2} palettes · all {len(PAIRS)} text pairs >= 4.5:1 */", file=sys.stderr)
