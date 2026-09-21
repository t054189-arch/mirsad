#!/usr/bin/env node
/* سير عمل وهمي، ليختبر الموقعُ نفسه قبل أن يُوصل بـ n8n الحقيقي.

   يفعل ما يفعله الـ webhook: يقبل POST، يطبع ما وصله، ويردّ بملاحظات
   بالصيغة الموثّقة — ويأذن لأي أصل (CORS) فلا يقف المتصفح في الطريق.

     node tools/mock-agent.js            # على المنفذ 8787
     node tools/mock-agent.js 9000       # على منفذ آخر

   ثم في أدوات المطوّر على الموقع:
     localStorage.setItem('mirsaad-agent-url', 'http://localhost:8787/');

   وللحالات الأخرى، أضف إلى الرابط:
     /slow    يتأخّر ثماني ثوانٍ   — لترى شاشة الانتظار الحقيقية
     /empty   يردّ بلا ملاحظات      — «لم يُرجع الوكيل أي ملاحظة»
     /boom    يردّ بخطأ 500        — صندوق الخطأ وزرّ إعادة المحاولة
     /junk    يردّ بنصّ لا يُقرأ     — «بلا ملاحظات بصيغة يفهمها مرصاد»
*/
const http = require('http');

const PORT = Number(process.argv[2]) || 8787;
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

const FINDINGS = {
  accuracy: 93,
  findings: [
    { title: 'تشقق إنشائي في الركيزة', titleEn: 'Structural crack in the pier',
      location: 'الركيزة رقم ٤ — الوجه الشمالي', locationEn: 'Pier 4 — north face',
      severity: 'high', confidence: 94, previous: '0.6 مم', current: '1.9 مم',
      note: 'اتّسع التشقق منذ فحص ٢٠٢٤ بمقدار 1.3 مم.' },
    { title: 'تآكل سطحي في الخرسانة', titleEn: 'Surface scaling',
      location: 'السطح السفلي', locationEn: 'Soffit',
      severity: 'medium', confidence: 71 },
    { title: 'لا توجد ملاحظة', titleEn: 'No finding',
      location: 'الجزء العلوي والحواجز', locationEn: 'Deck and barriers',
      severity: 'ok', confidence: 97 },
  ],
};

/* يطبع ما وصل: الحقول النصّية كما هي، والملفات باسمها وحجمها */
function report(type, buf) {
  const size = n => n < 1024 ? `${n} B` : n < 1048576
    ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1048576).toFixed(1)} MB`;
  console.log(`\n  ${new Date().toLocaleTimeString()}  ${type.split(';')[0]}  ${size(buf.length)}`);

  if (type.startsWith('application/json')) {
    try {
      const o = JSON.parse(buf.toString('utf8'));
      for (const [k, v] of Object.entries(o)) {
        console.log(`    ${k.padEnd(12)} ${Array.isArray(v)
          ? v.map(f => `${f.name} (${size(f.size || 0)})`).join(', ') || '—'
          : String(v).slice(0, 70)}`);
      }
    } catch { console.log('    (JSON غير مقروء)'); }
    return;
  }

  const m = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(type);
  if (!m) { console.log('    (نوع غير متوقّع)'); return; }
  const parts = buf.toString('latin1').split('--' + (m[1] || m[2]).trim());
  for (const part of parts) {
    const head = part.slice(0, part.indexOf('\r\n\r\n'));
    if (!head) continue;
    const name = /name="([^"]*)"/.exec(head);
    if (!name) continue;
    const file = /filename="([^"]*)"/.exec(head);
    const bodyLen = Buffer.byteLength(part, 'latin1') - Buffer.byteLength(head, 'latin1') - 8;
    console.log(file
      ? `    ${name[1].padEnd(12)} ${file[1]}  (${size(Math.max(0, bodyLen))})`
      : `    ${name[1].padEnd(12)} ${Buffer.from(
          part.slice(part.indexOf('\r\n\r\n') + 4).trim(), 'latin1')
          .toString('utf8').slice(0, 70)}`);
  }
}

http.createServer((req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }
  if (req.method !== 'POST') {
    res.writeHead(200, { ...CORS, 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('mock agent is up — point mirsaad-agent-url here and POST to it\n');
  }

  const chunks = [];
  req.on('data', c => chunks.push(c));
  req.on('end', () => {
    report(req.headers['content-type'] || '', Buffer.concat(chunks));
    const route = req.url.split('?')[0];
    const send = (code, body, json = true) => {
      res.writeHead(code, { ...CORS, 'Content-Type': json ? 'application/json' : 'text/plain' });
      res.end(typeof body === 'string' ? body : JSON.stringify(body));
      console.log(`    -> ${code} ${route}`);
    };
    if (route.includes('boom'))  return send(500, 'the workflow exploded', false);
    if (route.includes('junk'))  return send(200, 'started, will answer later', false);
    if (route.includes('empty')) return send(200, { accuracy: 99, findings: [] });
    if (route.includes('slow'))  return setTimeout(() => send(200, FINDINGS), 8000);
    send(200, FINDINGS);
  });
}).listen(PORT, () => {
  console.log(`\n  سير عمل وهمي على  http://localhost:${PORT}/`);
  console.log(`  في المتصفح:  localStorage.setItem('mirsaad-agent-url', 'http://localhost:${PORT}/')`);
  console.log(`  الحالات:     /slow  /empty  /boom  /junk\n`);
});
