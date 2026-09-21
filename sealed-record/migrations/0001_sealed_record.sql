-- Mirsad · Sealed Record layer
-- =============================
-- An approved inspection is sealed: a SHA-256 fingerprint is computed over its
-- full content (every field of the asset, the inspection and each covered
-- finding, plus the content hash of each attached image) together with the
-- signer and the moment of sealing. Recomputing the fingerprint later proves
-- whether anything changed.
--
-- 1. WHO SIGNED  -> signer_name / signer_license live in sealed_records and are
--                   part of the hashed payload, not side metadata.
-- 2. WHEN        -> sealed_at is fixed at sealing; sealed_at_local renders it in
--                   Kuwait local time (UTC+3) and is hashed. The row is immutable.
-- 3. NO DELETES  -> findings and attachments reject UPDATE, DELETE and TRUNCATE
--    NO EDITS       in the database itself. A correction is a new row pointing at
--                   the version it supersedes, carrying a required change_reason.
-- 4. VERIFIABLE  -> verify_seal() recomputes the fingerprint server-side and
--                   reports match / mismatch without ever returning finding text.

-- digest() and gen_random_bytes() come from pgcrypto. Supabase keeps
-- extensions in their own schema; this mirrors that anywhere else.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Content tables
-- ---------------------------------------------------------------------------

create table if not exists public.assets (
  id                text primary key,
  name_ar           text not null,
  name_en           text not null,
  asset_type        text not null,
  location_ar       text,
  location_en       text,
  construction_year integer
);

create table if not exists public.inspections (
  id              text primary key,
  code            text not null unique,
  asset_id        text not null references public.assets (id),
  inspection_date date not null,
  inspection_type text not null,
  inspector_ar    text,
  inspector_en    text,
  notes_ar        text,
  notes_en        text,
  status          text not null default 'draft'
                  check (status in ('draft', 'completed', 'approved'))
);

-- Findings are append-only and versioned. A correction inserts a new row whose
-- supersedes_id points at the version it replaces; that previous row stays.
create table if not exists public.findings (
  id              uuid primary key default gen_random_uuid(),
  inspection_id   text not null references public.inspections (id),
  supersedes_id   uuid unique references public.findings (id),
  change_reason   text,
  title_ar        text not null,
  title_en        text not null,
  severity        text not null check (severity in ('low', 'medium', 'high', 'critical')),
  location_ar     text,
  location_en     text,
  description_ar  text,
  description_en  text,
  recommendation_ar text,
  recommendation_en text,
  confidence      integer check (confidence between 0 and 100),
  created_at      timestamptz not null default now(),
  -- A correction must say why. An original must not pretend to be one.
  constraint findings_change_reason_required check (
    (supersedes_id is null and change_reason is null)
    or (supersedes_id is not null and length(btrim(change_reason)) > 0)
  )
);

create index if not exists findings_inspection_idx on public.findings (inspection_id, created_at, id);

-- Attachments are append-only too. content_sha256 is the hash of the image
-- bytes; it is what the seal covers.
create table if not exists public.attachments (
  id             uuid primary key default gen_random_uuid(),
  finding_id     uuid not null references public.findings (id),
  filename       text not null,
  content_sha256 text not null check (content_sha256 ~ '^[0-9a-f]{64}$'),
  byte_size      bigint not null check (byte_size >= 0),
  created_at     timestamptz not null default now()
);

create index if not exists attachments_finding_idx on public.attachments (finding_id, created_at, id);

-- ---------------------------------------------------------------------------
-- The sealed record
-- ---------------------------------------------------------------------------

create table if not exists public.sealed_records (
  seal_id          text primary key,
  inspection_id    text not null unique references public.inspections (id),
  -- 1. WHO SIGNED: a named person with a licence, inside the sealed record.
  signer_name      text not null check (length(btrim(signer_name)) > 0),
  signer_license   text not null check (length(btrim(signer_license)) > 0),
  -- 2. WHEN: fixed at the moment of sealing, rendered in Kuwait local time.
  sealed_at        timestamptz not null,
  -- derived from sealed_at by mirsad_sealed_local_ts(), never supplied by the
  -- caller (to_char is only STABLE, so this cannot be a generated column)
  sealed_at_local  text not null,
  algorithm        text not null default 'mirsad-seal-v1',
  -- Exactly which finding and attachment rows this seal covers, in hash order.
  content_manifest jsonb not null,
  fingerprint      text not null check (fingerprint ~ '^[0-9a-f]{64}$')
);

-- sealed_at_local is always derived from sealed_at, whatever the caller passes.
create or replace function public.mirsad_sealed_local_ts()
returns trigger
language plpgsql
set search_path = ''
as $fn$
begin
  new.sealed_at_local :=
    to_char(timezone(interval '+03:00', new.sealed_at), 'YYYY-MM-DD"T"HH24:MI:SS') || '+03:00';
  return new;
end;
$fn$;

drop trigger if exists sealed_records_local_ts on public.sealed_records;
create trigger sealed_records_local_ts
  before insert on public.sealed_records
  for each row execute function public.mirsad_sealed_local_ts();

-- ---------------------------------------------------------------------------
-- 3. Append-only, enforced here rather than in the UI
-- ---------------------------------------------------------------------------

create or replace function public.mirsad_append_only()
returns trigger
language plpgsql
set search_path = ''
as $fn$
begin
  if tg_op = 'TRUNCATE' then
    raise exception '% is append-only: TRUNCATE is not permitted', tg_table_name
      using errcode = 'restrict_violation';
  end if;
  if tg_op = 'DELETE' then
    raise exception '% is append-only: rows cannot be deleted', tg_table_name
      using errcode = 'restrict_violation';
  end if;
  raise exception '% is append-only: rows cannot be edited, insert a corrected version with a change_reason instead', tg_table_name
    using errcode = 'restrict_violation';
end;
$fn$;

create or replace function public.mirsad_sealed_immutable()
returns trigger
language plpgsql
set search_path = ''
as $fn$
begin
  if tg_op = 'TRUNCATE' then
    raise exception 'sealed records are immutable: TRUNCATE is not permitted'
      using errcode = 'restrict_violation';
  end if;
  raise exception 'sealed records are immutable: a seal cannot be % once written', lower(tg_op)
    using errcode = 'restrict_violation';
end;
$fn$;

drop trigger if exists findings_append_only on public.findings;
create trigger findings_append_only
  before update or delete on public.findings
  for each row execute function public.mirsad_append_only();

drop trigger if exists findings_no_truncate on public.findings;
create trigger findings_no_truncate
  before truncate on public.findings
  for each statement execute function public.mirsad_append_only();

drop trigger if exists attachments_append_only on public.attachments;
create trigger attachments_append_only
  before update or delete on public.attachments
  for each row execute function public.mirsad_append_only();

drop trigger if exists attachments_no_truncate on public.attachments;
create trigger attachments_no_truncate
  before truncate on public.attachments
  for each statement execute function public.mirsad_append_only();

drop trigger if exists sealed_records_immutable on public.sealed_records;
create trigger sealed_records_immutable
  before update or delete on public.sealed_records
  for each row execute function public.mirsad_sealed_immutable();

drop trigger if exists sealed_records_no_truncate on public.sealed_records;
create trigger sealed_records_no_truncate
  before truncate on public.sealed_records
  for each statement execute function public.mirsad_sealed_immutable();
