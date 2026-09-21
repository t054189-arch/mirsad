// Compares this repo's QR encoder against the `qrcode` package, module for
// module, including the mask it picks on its own.
//
//   npm install qrcode@1 && node test/qr.test.mjs
//
// The package is a test-time reference only; nothing that ships depends on it.
import QR from 'qrcode';
import { qrMatrix } from '../functions/_shared/qr.js';

const payloads = [
  'A',
  'MRS-9A6783267833EDEA',
  'https://x.supabase.co/functions/v1/verify?seal=MRS-9A6783267833EDEA',
  'https://verify.mirsad.gov.kw/verify?seal=MRS-0000000000000001',
  'https://a-rather-long-custom-domain-for-mirsad.example.gov.kw/verify?seal=MRS-DEADBEEFDEADBEEF&lang=ar',
  'seal مرصاد QR تجربة',
  'x'.repeat(200),
  'x'.repeat(400),
  'x'.repeat(666),
];

let failed = 0;
for (const payload of payloads) {
  const ref = QR.create([{ data: payload, mode: 'byte' }], { errorCorrectionLevel: 'M' });
  const mine = qrMatrix(payload);
  const size = ref.modules.size;

  let diff = mine.length === size ? 0 : -1;
  if (diff === 0) {
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (Number(ref.modules.get(r, c)) !== Number(mine[r][c])) diff++;
      }
    }
  }

  if (diff !== 0) failed++;
  const label = diff === 0 ? 'ok  ' : `FAIL(${diff})`;
  const shown = payload.length > 44 ? `${payload.slice(0, 44)}…` : payload;
  console.log(`${label} v${String(ref.version).padStart(2)} ${size}x${size}  ${shown}`);
}

console.log(failed === 0
  ? `\n${payloads.length} payloads match the reference encoder exactly`
  : `\n${failed} payload(s) differ`);
process.exit(failed ? 1 : 0);
