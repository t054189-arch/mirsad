#!/usr/bin/env node
// Push a reference dataset's images into Supabase Storage.
//
// The metadata rows (public.reference_images) are loaded separately and are
// already in the database; this script only moves bytes. It reads each row,
// pulls the matching file out of the publisher's archive, downscales it and
// uploads it, then stamps uploaded_at so a re-run skips it.
//
//   node scripts/ingest-reference-dataset.mjs --archive /path/to/dataset.zip
//
// Requires a secret (service-role) key, because the reference-images bucket is
// admin-write. It bypasses row level security, so keep it out of git (.env* is
// already ignored) and never give it a NEXT_PUBLIC_ prefix, which would put it
// in the browser bundle:
//
//   NEXT_PUBLIC_SUPABASE_URL=...  SUPABASE_SECRET_KEY=sb_secret_...
//
// Passing it inline for a single run keeps it off disk entirely; a plain
// SUPABASE_SECRET_KEY in .env.local works too and is not exposed to the browser.
//
// Options:
//   --archive <path>   Publisher's zip. Required unless every row is uploaded.
//   --slug <slug>      Dataset to push (default: metricea-lab-380).
//   --max-edge <px>    Longest edge after downscaling (default: 1024).
//   --quality <1-100>  JPEG quality (default: 82).
//   --limit <n>        Stop after n uploads, for a trial run.
//   --dry-run          Resize and report sizes, upload nothing.

import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

const execFileAsync = promisify(execFile);

function arg(name, fallback = undefined) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}
const flag = (name) => process.argv.includes(`--${name}`);

const ARCHIVE = arg('archive');
const SLUG = arg('slug', 'metricea-lab-380');
const MAX_EDGE = Number(arg('max-edge', 1024));
const QUALITY = Number(arg('quality', 82));
const LIMIT = arg('limit') ? Number(arg('limit')) : Infinity;
const DRY_RUN = flag('dry-run');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY.');
  console.error('The secret key is the service-role key from the Supabase dashboard (Project Settings -> API Keys). It bypasses RLS: keep it out of git and never prefix it with NEXT_PUBLIC_.');
  process.exit(1);
}

const db = createClient(url, secret, { auth: { persistSession: false } });

const { data: dataset, error: datasetError } = await db
  .from('reference_datasets')
  .select('id, slug, title, archive_sha256, archive_bytes')
  .eq('slug', SLUG)
  .single();
if (datasetError) {
  console.error(`No dataset with slug "${SLUG}":`, datasetError.message);
  process.exit(1);
}

const { data: pending, error: pendingError } = await db
  .from('reference_images')
  .select('id, file_name, source_path, storage_path, sha256, bytes')
  .eq('dataset_id', dataset.id)
  .is('uploaded_at', null)
  .order('storage_path');
if (pendingError) {
  console.error('Could not read reference_images:', pendingError.message);
  process.exit(1);
}

if (pending.length === 0) {
  console.log(`${dataset.title}: every image is already uploaded.`);
  process.exit(0);
}
console.log(`${dataset.title}: ${pending.length} image(s) still to upload.`);

if (!ARCHIVE) {
  console.error('Pass --archive with the publisher\'s zip. Download it from the dataset\'s source_url.');
  process.exit(1);
}

// Verify the archive is the exact one the metadata was built from. A different
// build of the dataset would silently attach the wrong bytes to a label.
const archiveStat = await stat(ARCHIVE);
if (dataset.archive_bytes && archiveStat.size !== Number(dataset.archive_bytes)) {
  console.error(`Archive is ${archiveStat.size} bytes, expected ${dataset.archive_bytes}.`);
  process.exit(1);
}
if (dataset.archive_sha256) {
  process.stdout.write('Checking archive checksum... ');
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(ARCHIVE)) hash.update(chunk);
  const digest = hash.digest('hex');
  if (digest !== dataset.archive_sha256) {
    console.error(`\nArchive sha256 ${digest} does not match the recorded ${dataset.archive_sha256}.`);
    process.exit(1);
  }
  console.log('ok');
}

// unzip -p streams one member to stdout, so the 2.5 GB archive is never expanded
// on disk. maxBuffer is generous: these are ~8 MB photographs.
//
// Members are matched by a trailing wildcard rather than by their full name.
// This archive's top-level folder contains a non-ASCII character, and unzip
// renders it escaped ("Metric#U00e9aLab_..."), so passing the name as stored in
// source_path never matches. The last two segments are unique per file.
function archiveGlob(sourcePath) {
  const segments = sourcePath.split('/');
  return `*/${segments.slice(-2).join('/')}`;
}

async function readFromArchive(sourcePath) {
  const glob = archiveGlob(sourcePath);
  const { stdout: listing } = await execFileAsync('unzip', ['-Z1', ARCHIVE, glob], {
    encoding: 'utf8',
  });
  const matches = listing.split('\n').filter(Boolean);
  if (matches.length !== 1) {
    throw new Error(`${glob} matched ${matches.length} archive members, expected 1`);
  }
  const { stdout } = await execFileAsync('unzip', ['-p', ARCHIVE, glob], {
    encoding: 'buffer',
    maxBuffer: 64 * 1024 * 1024,
  });
  return stdout;
}

let uploaded = 0;
let failed = 0;
let storedTotal = 0;

for (const image of pending) {
  if (uploaded >= LIMIT) break;
  try {
    const original = await readFromArchive(image.source_path);

    const digest = createHash('sha256').update(original).digest('hex');
    if (digest !== image.sha256) {
      throw new Error(`checksum mismatch: archive has ${digest}, row says ${image.sha256}`);
    }

    const resized = await sharp(original)
      .rotate() // honour the EXIF orientation before the EXIF is dropped
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: QUALITY })
      .toBuffer();

    if (DRY_RUN) {
      console.log(`[dry-run] ${image.storage_path}  ${image.bytes} -> ${resized.length} bytes`);
      storedTotal += resized.length;
      uploaded += 1;
      continue;
    }

    const { error: uploadError } = await db.storage
      .from('reference-images')
      .upload(image.storage_path, resized, { contentType: 'image/jpeg', upsert: true });
    if (uploadError) throw new Error(`upload failed: ${uploadError.message}`);

    const { error: stampError } = await db
      .from('reference_images')
      .update({ uploaded_at: new Date().toISOString(), stored_bytes: resized.length })
      .eq('id', image.id);
    if (stampError) throw new Error(`uploaded but could not stamp the row: ${stampError.message}`);

    storedTotal += resized.length;
    uploaded += 1;
    if (uploaded % 25 === 0) console.log(`  ${uploaded}/${pending.length}`);
  } catch (error) {
    failed += 1;
    console.error(`${image.storage_path}: ${error.message}`);
  }
}

console.log(
  `\n${DRY_RUN ? 'Would upload' : 'Uploaded'} ${uploaded} image(s), ` +
  `${(storedTotal / 1024 / 1024).toFixed(1)} MB total. ${failed} failed.`
);
process.exit(failed > 0 ? 1 : 0);
