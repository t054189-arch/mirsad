-- Reference data for the AI agent.
--
-- Two things live here, and they are deliberately kept apart from the
-- inspection tables:
--
--   * data_sources      -- every upstream source we evaluated, with the access
--                          we actually verified rather than the access the
--                          site advertises.
--   * reference_*       -- third-party benchmark imagery used to develop and
--                          measure the agent. These are NOT Kuwaiti structures
--                          and must never be presented as MIRSAAD inspections.
--
-- Real inspection data (structures, inspections, findings) stays where it is.

-- ------------------------------------------------------------ data sources --

create type public.source_kind as enum ('gis', 'statistics', 'imagery', 'portal');

-- open       -- fetched anonymously, in full, from this network
-- partial    -- reachable, but most of the content needs credentials
-- restricted -- reachable, but the data itself needs a login or an agreement
-- unreachable-- could not be contacted at all
create type public.source_access as enum ('open', 'partial', 'restricted', 'unreachable');

create table public.data_sources (
  key          text primary key,
  name_en      text not null,
  name_ar      text,
  publisher    text not null,
  url          text not null,
  kind         public.source_kind not null,
  access       public.source_access not null,
  -- What was actually observed when the URL was fetched. Keep it factual.
  access_note  text not null,
  licence      text,
  checked_at   timestamptz not null default now()
);

comment on table public.data_sources is
  'Candidate upstream sources and the access level we verified by fetching them.';
comment on column public.data_sources.access_note is
  'Observed result of the fetch, not the access the publisher advertises.';

-- ------------------------------------------------------ reference datasets --

create type public.crack_label as enum ('cracked', 'uncracked');
create type public.dataset_split as enum ('train', 'validation', 'test');

create table public.reference_datasets (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  title          text not null,
  publisher      text not null,
  doi            text,
  source_url     text not null,
  licence        text not null,
  licence_url    text,
  -- CC BY and similar licences require this to be shown wherever the images are.
  attribution    text not null,
  archive_sha256 text check (archive_sha256 is null or archive_sha256 ~ '^[0-9a-f]{64}$'),
  archive_bytes  bigint check (archive_bytes is null or archive_bytes >= 0),
  image_count    integer not null default 0 check (image_count >= 0),
  purpose        text,
  -- False for every third-party set: the images are not Kuwaiti structures and
  -- results from them say nothing about a specific Kuwaiti asset.
  is_kuwaiti     boolean not null default false,
  imported_at    timestamptz not null default now()
);

comment on table public.reference_datasets is
  'Third-party datasets used to develop and benchmark the agent. Not inspection records.';
comment on column public.reference_datasets.is_kuwaiti is
  'False means the imagery is foreign; never present its results as a Kuwaiti asset assessment.';

create table public.reference_images (
  id           uuid primary key default gen_random_uuid(),
  dataset_id   uuid not null references public.reference_datasets (id) on delete cascade,
  file_name    text not null,
  -- Path inside the publisher's archive, so a row can be traced back to source.
  source_path  text not null,
  label        public.crack_label not null,
  split        public.dataset_split not null,
  storage_path text not null unique,
  sha256       text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  width        integer check (width is null or width > 0),
  height       integer check (height is null or height > 0),
  bytes        bigint not null check (bytes >= 0),
  -- The copy in Storage is downscaled; bytes above is the publisher's original.
  stored_bytes bigint check (stored_bytes is null or stored_bytes >= 0),
  created_at   timestamptz not null default now(),
  unique (dataset_id, sha256)
);

comment on table public.reference_images is
  'One row per image. sha256 is of the publisher''s original file, so a re-download can be verified.';
comment on column public.reference_images.stored_bytes is
  'Size of the downscaled copy in Storage. bytes is the original, which we do not host.';

create index reference_images_dataset_idx on public.reference_images (dataset_id, label);
create index reference_images_split_idx on public.reference_images (dataset_id, split);

-- ---------------------------------------------------------- benchmark runs --

create table public.reference_benchmark_runs (
  id           uuid primary key default gen_random_uuid(),
  dataset_id   uuid not null references public.reference_datasets (id) on delete cascade,
  split        public.dataset_split,
  model        text not null,
  note         text,
  started_at   timestamptz not null default now(),
  completed_at timestamptz,
  created_by   uuid references public.profiles (id) on delete set null
);

comment on table public.reference_benchmark_runs is
  'One evaluation of the agent against a labelled dataset, so accuracy claims are reproducible.';

create table public.reference_predictions (
  id                 uuid primary key default gen_random_uuid(),
  run_id             uuid not null references public.reference_benchmark_runs (id) on delete cascade,
  reference_image_id uuid not null references public.reference_images (id) on delete cascade,
  predicted_label    public.crack_label not null,
  confidence         numeric(5, 2) check (confidence is null or confidence between 0 and 100),
  created_at         timestamptz not null default now(),
  unique (run_id, reference_image_id)
);

comment on table public.reference_predictions is
  'What the agent said about one reference image. Ground truth stays on reference_images.label.';

-- Scored per run. The join to the ground-truth label is what makes a claimed
-- accuracy checkable instead of asserted.
create view public.reference_benchmark_scores
with (security_invoker = true) as
select
  r.id as run_id,
  r.dataset_id,
  r.model,
  r.split,
  count(*) as scored,
  count(*) filter (where p.predicted_label = i.label) as correct,
  round(
    100.0 * count(*) filter (where p.predicted_label = i.label) / nullif(count(*), 0),
    2
  ) as accuracy_pct,
  count(*) filter (where p.predicted_label = 'cracked' and i.label = 'uncracked') as false_positives,
  count(*) filter (where p.predicted_label = 'uncracked' and i.label = 'cracked') as false_negatives
from public.reference_benchmark_runs r
join public.reference_predictions p on p.run_id = r.id
join public.reference_images i on i.id = p.reference_image_id
group by r.id, r.dataset_id, r.model, r.split;

-- ------------------------------------------------------------------- RLS ----

alter table public.data_sources            enable row level security;
alter table public.reference_datasets      enable row level security;
alter table public.reference_images        enable row level security;
alter table public.reference_benchmark_runs enable row level security;
alter table public.reference_predictions   enable row level security;

create policy data_sources_read on public.data_sources
  for select to authenticated using (true);
create policy data_sources_admin on public.data_sources
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy reference_datasets_read on public.reference_datasets
  for select to authenticated using (true);
create policy reference_datasets_admin on public.reference_datasets
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy reference_images_read on public.reference_images
  for select to authenticated using (true);
create policy reference_images_admin on public.reference_images
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy reference_runs_read on public.reference_benchmark_runs
  for select to authenticated using (true);
create policy reference_runs_write on public.reference_benchmark_runs
  for insert to authenticated
  with check (public.can_write() and created_by = (select auth.uid()));
create policy reference_runs_update on public.reference_benchmark_runs
  for update to authenticated
  using (created_by = (select auth.uid()) or public.is_admin())
  with check (created_by = (select auth.uid()) or public.is_admin());

create policy reference_predictions_read on public.reference_predictions
  for select to authenticated using (true);
create policy reference_predictions_write on public.reference_predictions
  for insert to authenticated with check (public.can_write());

-- --------------------------------------------------------------- storage ----

-- Private. The licence permits redistribution, but there is no reason to serve
-- a 2.5 GB benchmark set to the open internet from this project.
insert into storage.buckets (id, name, public)
values ('reference-images', 'reference-images', false)
on conflict (id) do nothing;

create policy "signed-in users read reference images"
  on storage.objects for select to authenticated
  using (bucket_id = 'reference-images');

create policy "admins manage reference images"
  on storage.objects for all to authenticated
  using (bucket_id = 'reference-images' and public.is_admin())
  with check (bucket_id = 'reference-images' and public.is_admin());
