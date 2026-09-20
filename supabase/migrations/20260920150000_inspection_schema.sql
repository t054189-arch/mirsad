-- Mirsad inspection domain.
--
-- Models the user journey: sign in, pick a structure, record an inspection,
-- upload files, run the AI analysis, review its findings, and notify the user.
--
-- Emails and passwords are NOT stored here. Supabase Auth owns `auth.users`;
-- `public.profiles` holds the app-level data that hangs off an account.

-- ---------------------------------------------------------------- enums ----

create type public.user_role as enum ('admin', 'inspector', 'viewer');

create type public.structure_type as enum ('bridge', 'building', 'road', 'tunnel', 'other');

create type public.inspection_type as enum ('periodic', 'detailed', 'emergency', 'follow_up');

create type public.inspection_status as enum (
  'draft',            -- basic data entered
  'files_uploaded',   -- images / reports / measurements attached
  'analyzing',        -- the agent is working
  'analyzed',         -- findings produced, awaiting the user
  'under_review',     -- user is working through the findings
  'completed'         -- every finding decided, record updated
);

create type public.file_kind as enum ('image', 'report', 'measurement');

create type public.severity as enum ('high', 'medium', 'low');

create type public.analysis_status as enum ('queued', 'running', 'succeeded', 'failed');

create type public.review_decision as enum ('approved', 'rejected', 'edited');

create type public.notification_kind as enum ('success', 'warning', 'info');

-- Display labels are the app's job. These values stay in English so they are
-- stable identifiers; the Arabic UI maps them to "عالية", "متوسطة", etc.

-- ------------------------------------------------------------- helpers ----

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------ profiles ----

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  role public.user_role not null default 'inspector',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'App-level user data. Credentials live in auth.users, not here.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Every new auth user gets a profile automatically.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- These read public.profiles, so they are defined after that table exists.
-- SECURITY DEFINER so RLS policies can read a user's role without the policy
-- on `profiles` recursing into itself.
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid());
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

create or replace function public.can_write()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role in ('admin', 'inspector')
  );
$$;

-- ---------------------------------------------------------- structures ----

create table public.structures (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type public.structure_type not null,
  location text,
  description text,
  cover_image_path text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.structures is
  'Bridges, buildings and roads that get inspected (المنشآت).';

create index structures_type_idx on public.structures (type);
create index structures_created_by_idx on public.structures (created_by);

create trigger structures_set_updated_at
  before update on public.structures
  for each row execute function public.set_updated_at();

-- --------------------------------------------------------- inspections ----

-- Reference numbers look like INSP-2026-014: a per-year counter. The upsert
-- below is atomic, so concurrent inserts cannot hand out the same number.
create table public.inspection_counters (
  year integer primary key,
  last_value integer not null default 0
);

create table public.inspections (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  structure_id uuid not null references public.structures (id) on delete cascade,
  inspection_date date not null default current_date,
  type public.inspection_type not null default 'periodic',
  status public.inspection_status not null default 'draft',
  inspector_notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.inspections is
  'One inspection visit against one structure (الفحوصات).';

create index inspections_structure_idx on public.inspections (structure_id, inspection_date desc);
create index inspections_status_idx on public.inspections (status);
create index inspections_created_by_idx on public.inspections (created_by);

create trigger inspections_set_updated_at
  before update on public.inspections
  for each row execute function public.set_updated_at();

create or replace function public.set_inspection_reference()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  ref_year integer := extract(year from coalesce(new.inspection_date, current_date));
  next_value integer;
begin
  if new.reference is not null and new.reference <> '' then
    return new;
  end if;

  insert into public.inspection_counters (year, last_value)
  values (ref_year, 1)
  on conflict (year)
    do update set last_value = public.inspection_counters.last_value + 1
  returning last_value into next_value;

  new.reference := 'INSP-' || ref_year::text || '-' || lpad(next_value::text, 3, '0');
  return new;
end;
$$;

create trigger inspections_set_reference
  before insert on public.inspections
  for each row execute function public.set_inspection_reference();

-- --------------------------------------------------- inspection files ----

create table public.inspection_files (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.inspections (id) on delete cascade,
  kind public.file_kind not null,
  storage_path text not null unique,
  file_name text not null,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.inspection_files is
  'Images, reports and measurement files. The bytes live in Storage; this row points at them.';

create index inspection_files_inspection_idx on public.inspection_files (inspection_id, kind);

-- -------------------------------------------------------- analysis runs ----

create table public.analysis_runs (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.inspections (id) on delete cascade,
  status public.analysis_status not null default 'queued',
  progress smallint not null default 0 check (progress between 0 and 100),
  accuracy numeric(5, 2) check (accuracy is null or accuracy between 0 and 100),
  -- The step checklist shown while the agent works, e.g.
  -- [{"key": "image_analysis", "done": true}, ...]
  steps jsonb not null default '[]'::jsonb,
  error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.analysis_runs is
  'One pass of the AI agent over an inspection (بدء التحليل).';

create index analysis_runs_inspection_idx on public.analysis_runs (inspection_id, created_at desc);

-- ------------------------------------------------------------- findings ----

create table public.findings (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.inspections (id) on delete cascade,
  analysis_run_id uuid references public.analysis_runs (id) on delete set null,
  title text not null,
  severity public.severity not null,
  component text,
  description text,
  recommendation text,
  confidence numeric(5, 2) check (confidence is null or confidence between 0 and 100),
  comparison_note text,
  -- Set when the agent matched this against the same defect in an earlier
  -- inspection, which is what "مقارنة بالسابق" shows.
  previous_finding_id uuid references public.findings (id) on delete set null,
  primary_file_id uuid references public.inspection_files (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.findings is
  'What the analysis reported: cracking, corrosion, or nothing (الملاحظات).';

create index findings_inspection_idx on public.findings (inspection_id, severity);
create index findings_previous_idx on public.findings (previous_finding_id);

create trigger findings_set_updated_at
  before update on public.findings
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------ finding reviews ----

create table public.finding_reviews (
  id uuid primary key default gen_random_uuid(),
  finding_id uuid not null references public.findings (id) on delete cascade,
  decision public.review_decision not null,
  note text,
  reviewed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.finding_reviews is
  'Approve / reject / edit decisions. Kept as history, so the newest row wins.';

create index finding_reviews_finding_idx on public.finding_reviews (finding_id, created_at desc);

-- The current decision for each finding, newest first.
create view public.finding_current_review
with (security_invoker = true) as
select distinct on (fr.finding_id)
  fr.finding_id,
  fr.id as review_id,
  fr.decision,
  fr.note,
  fr.reviewed_by,
  fr.created_at
from public.finding_reviews fr
order by fr.finding_id, fr.created_at desc;

-- -------------------------------------------------------- notifications ----

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind public.notification_kind not null default 'info',
  title text not null,
  body text,
  inspection_id uuid references public.inspections (id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.notifications is
  'Messages from the agent after a review (إشعار من الوكيل الذكي).';

create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;
