# Sealed Record

When an inspection is approved it is **sealed**: a SHA-256 fingerprint is
computed over its full content — every field of the asset, the inspection and
each covered finding, plus the content hash of every attached image — together
with who signed it and when. Recomputing that fingerprint later proves whether
anything changed.

This layer is a Postgres schema plus two HTTP endpoints. It is independent of
the front end in the repository root, which is a static demo with no backend.

```
migrations/0001_sealed_record.sql   tables and the append-only triggers
migrations/0002_seal_and_verify.sql sealing, correcting, verifying, exporting
seed/demo_seed.sql                  demo content, so the test has something to seal
functions/verify/                   GET /verify?seal=<id>   public
functions/seal-pdf/                 GET /seal-pdf?seal=<id> authenticated, returns the PDF
functions/_shared/                  QR encoder, PDF writer, Arabic shaping, the verify page
test/run.sh                         the acceptance test, on a throwaway database
test/qr.test.mjs                    the QR encoder against a reference implementation
test/preview.mjs                    writes a sample PDF and both verification pages
```

## The four things it does

**1 · Who signed.** `sealed_records.signer_name` and `signer_license` hold a
named engineer and a licence number. They are not metadata beside the record —
they go into the hashed payload, so the fingerprint only verifies against the
person it was sealed by.

**2 · When.** `sealed_at` is fixed at the moment of sealing. `sealed_at_local`
renders it in Kuwait local time, `YYYY-MM-DDTHH:MM:SS+03:00`, derived from
`sealed_at` by a trigger so the two can never disagree, and it is hashed too.
A trigger refuses every `UPDATE`, `DELETE` and `TRUNCATE` on a sealed record.

**3 · No deletes, no edits.** `findings` and `attachments` refuse `UPDATE`,
`DELETE` and `TRUNCATE` in the database, not in the UI. A correction is a new
row whose `supersedes_id` points at the version it replaces and whose
`change_reason` is required by a check constraint; the previous version stays
in the table. `correct_finding(id, patch, reason)` is that write path.

**4 · Verifiable on paper.** Every exported PDF carries a QR code for
`GET /verify?seal=<id>`. That endpoint recomputes the fingerprint on the server
and reports whether the copy matches. It shows the asset, the date, the signer
and the result — never the finding text.

Sealing and verification both build the payload through the one function,
`mirsad_seal_payload()`, so the two can never drift apart.

## What a seal covers

A seal pins the exact rows it covers in `content_manifest`, and verification
re-reads those rows. Corrections appended after sealing are new rows, so they
do not disturb an existing seal — and a covered row that has been altered, or
is missing, can no longer produce the sealed fingerprint.

## Running the acceptance test

Against any Postgres you can create a database on:

```sh
export PGHOST=... PGPORT=... PGUSER=...
./test/run.sh
```

It seals a record, verifies it, then rewrites a finding **directly in the
database, bypassing the app**, and verifies again. The second verification must
fail with a fingerprint mismatch. It also checks that the triggers refuse
edits, deletes and truncation, that a correction without a reason is refused,
that a sealed record cannot be changed, and that the verification answer
carries no finding text.

The tampering step switches the append-only trigger off first, because the
trigger refuses the edit outright. That is the point: the triggers stop the
application and anyone using it, and the fingerprint still catches an operator
with rights to go around them.

## Deploying

The SQL is plain Postgres and applies to a Supabase project as two migrations.
Both functions are Supabase Edge Functions:

| | `verify` | `seal-pdf` |
| --- | --- | --- |
| `verify_jwt` | **false**, it is the public endpoint | true |
| database role | `anon`, which may only call `verify_seal()` | service role |

Row level security is enabled on every table with no policy, so the tables are
unreadable through the public API. `verify_seal()` is the only door left open
to `anon`, and it returns a verdict, never content.

Set `MIRSAD_VERIFY_URL` to the address printed and encoded into the QR code —
for example `https://verify.mirsad.gov.kw/verify` behind a rewrite — otherwise
it falls back to the function's own URL.

`seal-pdf` needs `assets/DejaVuSans.ttf` deployed beside it, or
`MIRSAD_PDF_FONT_URL` pointing at a copy. The PDF embeds the font so Arabic
prints correctly.

## Notes

The PDF writer and the QR encoder are written here rather than taken from a
package: both are small, both would otherwise be a dependency to keep current
in a document that has to stay reproducible for years. `test/qr.test.mjs`
checks the encoder against the `qrcode` package, module for module, over
versions 1 to 20 — install it with `npm install qrcode@1` to run that test.

PDF has no text layout engine, so `_shared/arabic.js` shapes Arabic into its
presentation forms and puts each run in visual order before the glyphs are
drawn. Mixed Arabic and Latin in one line is handled per run rather than by a
complete bidirectional algorithm, which covers names, licence numbers and
dates.
