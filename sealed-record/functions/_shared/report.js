// The exported PDF of a sealed record.
//
// Requirement 4 in one page: whatever else the sheet says, it carries a QR code
// pointing at the public verification endpoint, so the paper can be checked
// against the database it came from.

import { createDocument } from './pdf.js';
import { qrMatrix } from './qr.js';

const INK = [0.09, 0.11, 0.13];
const MUTED = [0.42, 0.45, 0.49];
const RULE = [0.85, 0.87, 0.89];
const SEVERITY = {
  low: [0.25, 0.53, 0.35],
  medium: [0.72, 0.53, 0.13],
  high: [0.78, 0.35, 0.12],
  critical: [0.70, 0.18, 0.18],
};

const MARGIN = 48;

export async function buildReportPdf(record, verifyUrl, fontBytes) {
  const doc = createDocument(fontBytes);
  const { width, height } = doc.page;
  const right = width - MARGIN;
  const columnWidth = right - MARGIN;

  doc.addPage();
  let y = height - MARGIN;

  const rule = (gap = 10) => {
    y -= gap;
    doc.line(MARGIN, y, right, y, { color: RULE });
    y -= gap;
  };

  // a label on the left, the value on the right, Arabic value above Latin
  const field = (label, valueEn, valueAr) => {
    doc.text(label, { x: MARGIN, y, size: 8, color: MUTED });
    if (valueAr) {
      doc.text(valueAr, { x: MARGIN + 130, y, size: 11, color: INK, align: 'right', width: columnWidth - 130 });
      y -= 14;
      if (valueEn) doc.text(valueEn, { x: MARGIN + 130, y, size: 9.5, color: MUTED, align: 'right', width: columnWidth - 130 });
      y -= 18;
    } else {
      doc.text(valueEn ?? '—', { x: MARGIN + 130, y, size: 11, color: INK, align: 'right', width: columnWidth - 130 });
      y -= 20;
    }
  };

  // heading
  doc.text('مرصاد · MIRSAAD', { x: MARGIN, y, size: 18, color: INK });
  doc.text('سجل فحص مختوم', { x: MARGIN, y, size: 12, color: MUTED, align: 'right', width: columnWidth });
  y -= 16;
  doc.text('Sealed inspection record', { x: MARGIN, y, size: 9, color: MUTED });
  rule(12);

  field('Asset / المنشأة', record.asset.name_en, record.asset.name_ar);
  field('Location / الموقع', record.asset.location_en, record.asset.location_ar);
  field('Inspection / الفحص', `${record.inspection.code} · ${record.inspection.type}`, null);
  field('Date / التاريخ', String(record.inspection.date), null);
  field('Inspector / الفاحص', record.inspection.inspector_en, record.inspection.inspector_ar);

  rule(6);

  doc.text(`Findings · الملاحظات`, { x: MARGIN, y, size: 10, color: INK });
  doc.text(String(record.findings.length), { x: MARGIN, y, size: 10, color: MUTED, align: 'right', width: columnWidth });
  y -= 18;

  for (const finding of record.findings) {
    if (y < 320) break;                        // the seal block owns the foot of the page
    const colour = SEVERITY[finding.severity] ?? MUTED;
    doc.rect(MARGIN, y - 1, 3, 11, colour);
    doc.text(finding.title_en, { x: MARGIN + 10, y, size: 10, color: INK });
    doc.text(finding.title_ar, { x: MARGIN + 10, y, size: 10, color: INK, align: 'right', width: columnWidth - 10 });
    y -= 13;
    doc.text(finding.severity.toUpperCase(), { x: MARGIN + 10, y, size: 7.5, color: colour });
    if (finding.is_correction) {
      doc.text(`correction · ${finding.change_reason}`, { x: MARGIN + 52, y, size: 7.5, color: MUTED });
    }
    y -= 12;
    if (finding.description_en) {
      doc.text(finding.description_en, { x: MARGIN + 10, y, size: 8.5, color: MUTED });
      y -= 12;
    }
    for (const attachment of finding.attachments) {
      doc.text(`${attachment.filename} · sha256 ${attachment.content_sha256.slice(0, 32)}…`,
        { x: MARGIN + 10, y, size: 7, color: MUTED });
      y -= 10;
    }
    y -= 6;
  }

  // the seal block, pinned to the foot of the page
  const blockTop = 250;
  doc.line(MARGIN, blockTop, right, blockTop, { color: RULE });

  const qrSize = 108;
  const qrX = right - qrSize;
  const qrY = blockTop - 20 - qrSize;
  doc.qr(qrMatrix(verifyUrl), qrX, qrY, qrSize);
  doc.text('امسح للتحقق · Scan to verify', { x: qrX - 40, y: qrY - 14, size: 7.5, color: MUTED, align: 'center', width: qrSize + 40 });

  let sy = blockTop - 24;
  doc.text('SEALED BY · وقّع', { x: MARGIN, y: sy, size: 7.5, color: MUTED });
  sy -= 16;
  doc.text(record.signer_name, { x: MARGIN, y: sy, size: 13, color: INK });
  sy -= 15;
  doc.text(`Licence ${record.signer_license}`, { x: MARGIN, y: sy, size: 9.5, color: INK });
  sy -= 22;

  doc.text('SEALED AT · وقت الختم', { x: MARGIN, y: sy, size: 7.5, color: MUTED });
  sy -= 14;
  doc.text(`${record.sealed_at_local}  (UTC+3)`, { x: MARGIN, y: sy, size: 10, color: INK });
  sy -= 22;

  doc.text('SEAL · رقم الختم', { x: MARGIN, y: sy, size: 7.5, color: MUTED });
  sy -= 14;
  doc.text(record.seal_id, { x: MARGIN, y: sy, size: 10, color: INK });
  sy -= 20;

  doc.text('SHA-256 FINGERPRINT', { x: MARGIN, y: sy, size: 7.5, color: MUTED });
  sy -= 12;
  doc.text(record.fingerprint.slice(0, 32), { x: MARGIN, y: sy, size: 7.5, color: INK });
  sy -= 10;
  doc.text(record.fingerprint.slice(32), { x: MARGIN, y: sy, size: 7.5, color: INK });

  doc.line(MARGIN, 58, right, 58, { color: RULE });
  doc.text(verifyUrl, { x: MARGIN, y: 44, size: 7, color: MUTED });
  doc.text('التحقق يعيد حساب البصمة على الخادم · Verification recomputes the fingerprint on the server',
    { x: MARGIN, y: 32, size: 7, color: MUTED });

  return doc.toBytes({ title: `Mirsad sealed record ${record.seal_id}` });
}
