/* يتحقق أن قارئ جواب سير العمل (assets/agent.js) يفهم الأشكال التي
   ترسلها n8n و Make و Zapier فعلًا، ويرفض ما لا يفهمه بدل أن يخترعه.

   يعمل ببلا تبعيات:  node tools/check-agent.js  */
const path = require('path');

global.window = {};
global.document = { documentElement: { lang: 'ar' } };
require(path.join(__dirname, '..', 'assets/agent.js'));
const N = global.window.MirsaadAgent.normalise;

let pass = 0;
const bad = [];
function ok(name, got, want) {
  if (JSON.stringify(got) === JSON.stringify(want)) { pass++; return; }
  bad.push(`${name}\n      جاء  ${JSON.stringify(got)}\n      وتوقّعنا ${JSON.stringify(want)}`);
}
const brief = r => r === null ? null : {
  n: r.findings.length,
  acc: r.accuracy,
  first: r.findings[0] && [r.findings[0].title, r.findings[0].severity, r.findings[0].confidence],
  sev: r.findings.map(f => f.severity),
  empty: !!r.empty,
};

/* ---- الشكل الموثّق في README ---- */
ok('الشكل الموثّق', brief(N({
  accuracy: 91,
  findings: [
    { title: 'تشقق', location: 'الركيزة ٢', severity: 'high', confidence: 88 },
    { title: 'تآكل', location: 'السطح', severity: 'medium', confidence: 70 },
  ],
})), { n: 2, acc: 91, first: ['تشقق', 'hi', 88], sev: ['hi', 'mid'], empty: false });

/* ---- أغلفة n8n ---- */
ok('مصفوفة عناصر n8n', brief(N([{ json: { findings: [{ title: 'crack', severity: 'critical' }] } }])),
  { n: 1, acc: null, first: ['crack', 'hi', null], sev: ['hi'], empty: false });
ok('عدة عناصر، كلٌّ في json', brief(N([{ json: { title: 'a', severity: 'high' } },
                                        { json: { title: 'b', severity: 'low' } }])),
  { n: 2, acc: null, first: ['a', 'hi', null], sev: ['hi', 'ok'], empty: false });
ok('أغلفة متداخلة output/data', brief(N({ output: { data: { results: [{ name: 'gap', priority: 'Low' }] } } })),
  { n: 1, acc: null, first: ['gap', 'ok', null], sev: ['ok'], empty: false });
ok('مصفوفة عارية', brief(N([{ title: 'a', severity: 'low' }, { title: 'b', severity: 'high' }])),
  { n: 2, acc: null, first: ['b', 'hi', null], sev: ['hi', 'ok'], empty: false });
ok('ملاحظة واحدة بلا مصفوفة', brief(N({ label: 'spalling', where: 'deck', level: 2, score: 0.64 })),
  { n: 1, acc: 64, first: ['spalling', 'mid', 64], sev: ['mid'], empty: false });
ok('نموذج لغوي ردّ بنصّ حول JSON',
  brief(N('Here you go:\n```json\n{"findings":[{"title":"rust","severity":"high"}]}\n```')),
  { n: 1, acc: null, first: ['rust', 'hi', null], sev: ['hi'], empty: false });

/* ---- القراءة نفسها ---- */
ok('الثقة بين ٠ و١ تصير نسبة', brief(N({ findings: [{ title: 'x', confidence: 0.87, severity: 'high' }] })),
  { n: 1, acc: 87, first: ['x', 'hi', 87], sev: ['hi'], empty: false });
ok('الخطورة بالعربية', brief(N({ findings: [{ title: 'ت', 'الخطورة': 'عالية' },
                                             { title: 'س', 'الخطورة': 'سليم' }] })),
  { n: 2, acc: null, first: ['ت', 'hi', null], sev: ['hi', 'ok'], empty: false });
ok('الأخطر أولًا مهما كان ترتيب الوارد',
  N({ findings: [{ title: 'a', severity: 'ok' }, { title: 'b', severity: 'medium' },
                 { title: 'c', severity: 'high' }] }).findings.map(f => f.title), ['c', 'b', 'a']);
ok('الدقة الكلية معدّل الثقات حين لا تُرسَل',
  N({ findings: [{ title: 'a', confidence: 90 }, { title: 'b', confidence: 80 }] }).accuracy, 85);
ok('الخطورة المجهولة تصير متوسطة لا سليمة',
  N({ findings: [{ title: 'a', severity: 'يحتاج نظرة' }] }).findings[0].severity, 'mid');

/* ---- ما يجب ألّا يُقرأ كنتيجة ---- */
ok('مصفوفة فارغة = فحص بلا ملاحظات', brief(N({ findings: [] })),
  { n: 0, acc: null, first: undefined, sev: [], empty: true });
ok('لا قائمة في الجواب', N({ status: 'queued' }), null);
ok('نصّ عادي', N('workflow started'), null);
ok('لا شيء', N(null), null);
ok('عناصر بلا عنوان ولا ملاحظة', N({ findings: [{ foo: 1 }] }), null);

if (bad.length) {
  console.error('قارئ جواب سير العمل رسب في:\n  ' + bad.join('\n  '));
  process.exit(1);
}
console.log(`agent OK — ${pass} شكل جواب مقروء كما يجب`);
