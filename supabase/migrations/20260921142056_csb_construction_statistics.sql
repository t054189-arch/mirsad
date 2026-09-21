-- Kuwait CSB "Annual Survey of Establishments >> Construction" statistics, 2012-2019.
-- Source: csb.gov.kw, Economic Statistics > Construction (ID=29, ParentCatID=3).

create table if not exists public.csb_construction_tables (
  id            bigint primary key,
  year          integer not null,
  table_code    text,
  sheet_name    text,
  title_en      text,
  title_ar      text,
  units         text,
  source_file   text,
  columns       jsonb not null default '[]'::jsonb,
  row_count     integer not null default 0,
  imported_at   timestamptz not null default now()
);
comment on table public.csb_construction_tables is
  'One row per statistical table (one worksheet) from the CSB construction survey. columns maps FLD codes to their bilingual header labels.';

create table if not exists public.csb_construction_observations (
  id            bigserial primary key,
  table_id      bigint not null references public.csb_construction_tables(id) on delete cascade,
  source_row    integer,
  isic_code     text,
  label_en      text,
  label_ar      text,
  sector        text check (sector is null or sector in ('PUBLIC','PRIVATE','TOTAL')),
  values        jsonb not null default '{}'::jsonb
);
comment on table public.csb_construction_observations is
  'One row per data line. values holds only non-zero measures keyed by FLD code; a code listed in the parent table''s columns but absent here is an explicit zero.';

create index if not exists csb_obs_table_idx  on public.csb_construction_observations(table_id);
create index if not exists csb_obs_isic_idx   on public.csb_construction_observations(isic_code);
create index if not exists csb_obs_values_idx on public.csb_construction_observations using gin(values);
create index if not exists csb_tables_year_idx on public.csb_construction_tables(year, table_code);

alter table public.csb_construction_tables       enable row level security;
alter table public.csb_construction_observations enable row level security;

drop policy if exists csb_tables_read on public.csb_construction_tables;
create policy csb_tables_read on public.csb_construction_tables
  for select to authenticated using (true);

drop policy if exists csb_obs_read on public.csb_construction_observations;
create policy csb_obs_read on public.csb_construction_observations
  for select to authenticated using (true);
