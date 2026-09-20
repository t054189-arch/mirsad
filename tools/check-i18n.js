/* يتحقق أن مفاتيح data-i18n في كل صفحات الموقع تطابق القاموس الإنجليزي. */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

global.window = {};
require(path.join(root, 'assets/i18n.js'));
const dict = Object.keys(global.window.MIRSAAD_EN);

const pages = fs.readdirSync(root).filter(f => f.endsWith('.html'));
if (!pages.length) { console.error('لا توجد صفحات — شغّل tools/build.py'); process.exit(1); }

const used = new Map();           // key -> الصفحات التي تستخدمه
for (const page of pages) {
  const html = fs.readFileSync(path.join(root, page), 'utf8');
  const keys = [
    ...[...html.matchAll(/data-i18n="([^"]+)"/g)].map(m => m[1]),
    ...[...html.matchAll(/data-i18n-attr="[^"]*:([^"]+)"/g)].map(m => m[1]),
  ];
  for (const k of keys) {
    if (!used.has(k)) used.set(k, []);
    used.get(k).push(page);
  }
}

// بعض المفاتيح تُطلب من JavaScript لا من الوسوم (رسائل التحقق مثلًا)
for (const js of fs.readdirSync(path.join(root, 'assets')).filter(f => f.endsWith('.js'))) {
  if (js === 'i18n.js') continue;
  const src = fs.readFileSync(path.join(root, 'assets', js), 'utf8');
  for (const m of src.matchAll(/['"]([a-z0-9]+\.[A-Za-z0-9]+)['"]/g)) {
    if (!dict.includes(m[1])) continue;
    if (!used.has(m[1])) used.set(m[1], []);
    used.get(m[1]).push('assets/' + js);
  }
}

const missing = [...used.keys()].filter(k => !dict.includes(k));
const unused = dict.filter(k => !used.has(k));

if (missing.length) {
  console.error('MISSING TRANSLATIONS:\n  ' +
    missing.map(k => `${k}  (${used.get(k).join(', ')})`).join('\n  '));
}
if (unused.length) console.error('UNUSED KEYS:\n  ' + unused.join('\n  '));
if (missing.length || unused.length) process.exit(1);
console.log(`i18n OK — ${used.size} keys across ${pages.length} pages, all translated, none unused`);
