// The page behind GET /verify?seal=<id>.
//
// It reports what the seal covers and whether the fingerprint still matches.
// It deliberately does not show a single word of the findings: anyone holding
// a printed copy can check that copy is genuine without the record's contents
// becoming public.

const escape = (value) => String(value ?? '').replace(/[&<>"]/g,
  (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const VERDICT = {
  valid: {
    badge: 'مطابق · Matches the sealed original',
    ar: 'لم يتغيّر شيء في هذا السجل منذ ختمه.',
    en: 'Nothing in this record has changed since it was sealed.',
    tone: 'ok',
  },
  mismatch: {
    badge: 'غير مطابق · Does not match',
    ar: 'تغيّر محتوى هذا السجل بعد ختمه. لا تعتمد على هذه النسخة.',
    en: 'This record changed after it was sealed. Do not rely on this copy.',
    tone: 'bad',
  },
  not_found: {
    badge: 'غير معروف · Unknown seal',
    ar: 'لا يوجد ختم بهذا الرقم.',
    en: 'No seal with this number exists.',
    tone: 'unknown',
  },
};

export function renderVerifyPage(result) {
  const verdict = VERDICT[result?.result] ?? VERDICT.not_found;
  const known = result?.result === 'valid' || result?.result === 'mismatch';

  const row = (labelAr, labelEn, valueAr, valueEn) => `
      <div class="row">
        <div class="label"><span>${escape(labelAr)}</span><span class="en">${escape(labelEn)}</span></div>
        <div class="value">
          <span class="ar">${escape(valueAr ?? '—')}</span>
          ${valueEn ? `<span class="en">${escape(valueEn)}</span>` : ''}
        </div>
      </div>`;

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>التحقق من الختم · Verify seal</title>
<style>
  :root {
    color-scheme: light dark;
    --bg: #f6f7f9; --card: #fff; --ink: #14181d; --muted: #646b73; --line: #e3e6ea;
    --ok: #1d7a43; --ok-bg: #e9f6ee; --bad: #b3261e; --bad-bg: #fdecea;
    --unknown: #5a6169; --unknown-bg: #eef0f3;
  }
  @media (prefers-color-scheme: dark) {
    :root { --bg:#0e1013; --card:#171a1f; --ink:#f0f2f4; --muted:#9aa2aa; --line:#272c33;
            --ok:#5fd18c; --ok-bg:#122a1c; --bad:#ff8a80; --bad-bg:#2d1512;
            --unknown:#9aa2aa; --unknown-bg:#20242a; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink);
         font-family: "IBM Plex Sans Arabic", "Noto Kufi Arabic", system-ui, -apple-system, sans-serif;
         display: flex; justify-content: center; padding: 24px 16px 48px; }
  main { width: 100%; max-width: 560px; }
  .brand { font-size: 13px; color: var(--muted); letter-spacing: .02em; margin: 8px 4px 16px; }
  .card { background: var(--card); border: 1px solid var(--line); border-radius: 14px; overflow: hidden; }
  .verdict { padding: 22px 20px; text-align: center; }
  .verdict.ok { background: var(--ok-bg); }
  .verdict.bad { background: var(--bad-bg); }
  .verdict.unknown { background: var(--unknown-bg); }
  .mark { font-size: 30px; line-height: 1; }
  .verdict.ok .mark, .verdict.ok .badge { color: var(--ok); }
  .verdict.bad .mark, .verdict.bad .badge { color: var(--bad); }
  .verdict.unknown .mark, .verdict.unknown .badge { color: var(--unknown); }
  .badge { font-size: 16px; font-weight: 600; margin-top: 8px; }
  .verdict p { margin: 10px 0 0; font-size: 13.5px; color: var(--ink); }
  .verdict p.en { color: var(--muted); font-size: 12.5px; direction: ltr; }
  .rows { padding: 4px 20px 8px; }
  .row { display: flex; gap: 16px; align-items: baseline; padding: 13px 0; border-top: 1px solid var(--line); }
  .row:first-child { border-top: 0; }
  .label { flex: 0 0 34%; font-size: 12.5px; color: var(--muted); display: flex; flex-direction: column; }
  .label .en { font-size: 10.5px; direction: ltr; text-align: right; }
  .value { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .value .ar { font-size: 15px; }
  .value .en { font-size: 12px; color: var(--muted); direction: ltr; }
  .fingerprint { padding: 0 20px 18px; }
  .fingerprint .head { font-size: 10.5px; color: var(--muted); margin-bottom: 6px; }
  code { display: block; direction: ltr; font-family: "IBM Plex Mono", ui-monospace, monospace;
         font-size: 11px; line-height: 1.6; color: var(--muted); word-break: break-all;
         background: var(--bg); border: 1px solid var(--line); border-radius: 8px; padding: 8px 10px; }
  code.changed { color: var(--bad); }
  footer { margin: 18px 6px 0; font-size: 11.5px; color: var(--muted); line-height: 1.7; }
  footer .en { direction: ltr; }
  @media (max-width: 420px) { .row { flex-direction: column; gap: 4px; } .label { flex: none; }
    .label .en { text-align: right; } }
</style>
</head>
<body>
<main>
  <div class="brand">مرصاد · MIRSAAD</div>
  <div class="card">
    <div class="verdict ${verdict.tone}">
      <div class="mark">${verdict.tone === 'ok' ? '✓' : verdict.tone === 'bad' ? '✕' : '?'}</div>
      <div class="badge">${escape(verdict.badge)}</div>
      <p>${escape(verdict.ar)}</p>
      <p class="en">${escape(verdict.en)}</p>
    </div>
    ${known ? `
    <div class="rows">
      ${row('المنشأة', 'Asset', result.asset_name_ar, result.asset_name_en)}
      ${row('الموقع', 'Location', result.asset_location_ar, result.asset_location_en)}
      ${row('تاريخ الفحص', 'Inspection date', result.inspection_date, result.inspection_code)}
      ${row('وقّع', 'Signed by', result.signer_name, `Licence ${result.signer_license}`)}
      ${row('وقت الختم', 'Sealed at', result.sealed_at_local, 'UTC+3')}
      ${row('رقم الختم', 'Seal', result.seal_id, null)}
    </div>
    <div class="fingerprint">
      <div class="head">بصمة SHA-256 المختومة · sealed fingerprint</div>
      <code>${escape(result.sealed_fingerprint)}</code>
      ${result.result === 'mismatch' ? `
      <div class="head" style="margin-top:10px">المحسوبة الآن · recomputed now</div>
      <code class="changed">${escape(result.recomputed_fingerprint)}</code>` : ''}
    </div>` : ''}
  </div>
  <footer>
    <div>تُحسب البصمة من جديد على الخادم عند كل عملية تحقق. لا تُعرض نصوص الملاحظات هنا.</div>
    <div class="en">The fingerprint is recomputed on the server on every check. Finding text is never shown here.</div>
  </footer>
</main>
</body>
</html>`;
}
