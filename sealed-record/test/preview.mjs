// Seals the demo inspection in a local Postgres and writes out what a user
// would see: the verification page (valid and, after tampering, mismatch) and
// the exported PDF with its QR code.
//
//   node test/preview.mjs [outputDir]
//
// Needs psql on PATH and PGHOST/PGPORT/PGUSER pointing at a database that has
// the migrations and the demo seed applied.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderVerifyPage } from '../functions/_shared/page.js';
import { buildReportPdf } from '../functions/_shared/report.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const out = process.argv[2] ?? join(root, 'preview');
mkdirSync(out, { recursive: true });

const database = process.env.PGDATABASE ?? 'mirsad_seal_preview';
const psql = (args) => execFileSync('psql', ['-X', '-v', 'ON_ERROR_STOP=1', ...args],
  { encoding: 'utf8', env: { ...process.env, PGDATABASE: database } });
const sql = (query) => psql(['-t', '-A', '-c', query]).trim();

// a fresh database each time, so the preview always starts from an intact seal
const admin = (command, name) => execFileSync(command, [...(command === 'dropdb' ? ['--if-exists'] : []), name],
  { stdio: 'ignore', env: process.env });
admin('dropdb', database);
admin('createdb', database);
for (const file of ['migrations/0001_sealed_record.sql', 'migrations/0002_seal_and_verify.sql', 'seed/demo_seed.sql']) {
  psql(['-q', '-f', join(root, file)]);
}

const sealId = sql(`select public.seal_inspection('insp-2025-jaber', 'م. نورة الخالد', 'KSE-2019-4471')`);

const verifyBase = process.env.MIRSAD_VERIFY_URL ?? 'https://mirsad.example.gov.kw/verify';
const verifyUrl = `${verifyBase}?seal=${encodeURIComponent(sealId)}`;

const verification = JSON.parse(sql(`select public.verify_seal('${sealId}')`));
const record = JSON.parse(sql(`select public.sealed_record_export('${sealId}')`));
const font = readFileSync(join(root, 'assets', 'DejaVuSans.ttf'));

writeFileSync(join(out, 'verify-valid.html'), renderVerifyPage(verification));
writeFileSync(join(out, `report-${sealId}.pdf`), await buildReportPdf(record, verifyUrl, font));

// now tamper, the way the acceptance test does, and render the other verdict
sql(`alter table public.findings disable trigger findings_append_only;
     update public.findings set description_en = 'A 0.2 mm hairline crack, cosmetic only.', severity = 'low'
      where inspection_id = 'insp-2025-jaber';
     alter table public.findings enable trigger findings_append_only;`);

const tampered = JSON.parse(sql(`select public.verify_seal('${sealId}')`));
writeFileSync(join(out, 'verify-mismatch.html'), renderVerifyPage(tampered));

console.log(`seal        ${sealId}`);
console.log(`verify url  ${verifyUrl}`);
console.log(`before      ${verification.result}`);
console.log(`after       ${tampered.result}`);
console.log(`written to  ${out}`);
