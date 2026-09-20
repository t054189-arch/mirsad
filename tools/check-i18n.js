/* يتحقق أن مفاتيح data-i18n في الصفحة تطابق القاموس الإنجليزي تمامًا. */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

global.window = {};
require(path.join(root, 'assets/i18n.js'));
const dict = Object.keys(global.window.MIRSAAD_EN);

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const used = new Set([
  ...[...html.matchAll(/data-i18n="([^"]+)"/g)].map(m => m[1]),
  ...[...html.matchAll(/data-i18n-attr="[^"]*:([^"]+)"/g)].map(m => m[1]),
]);

const missing = [...used].filter(k => !dict.includes(k));
const unused = dict.filter(k => !used.has(k));

if (missing.length) console.error('MISSING TRANSLATIONS:\n  ' + missing.join('\n  '));
if (unused.length) console.error('UNUSED KEYS:\n  ' + unused.join('\n  '));
if (missing.length || unused.length) process.exit(1);
console.log(`i18n OK — ${used.size} keys, all translated, none unused`);
