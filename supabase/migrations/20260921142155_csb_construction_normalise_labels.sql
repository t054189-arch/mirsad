-- Normalise repeated bilingual labels out of the fact tables.

create table if not exists public.csb_construction_labels (
  id        integer primary key,
  isic_code text,
  label_en  text,
  label_ar  text
);
comment on table public.csb_construction_labels is
  'Distinct row labels (ISIC activity class / legal status / asset type) used by the CSB construction tables.';

create table if not exists public.csb_construction_column_labels (
  id    integer primary key,
  label text not null
);
comment on table public.csb_construction_column_labels is
  'Distinct bilingual measure headings (Arabic + English as printed) referenced by csb_construction_columns.';

create table if not exists public.csb_construction_columns (
  table_id   bigint not null references public.csb_construction_tables(id) on delete cascade,
  field_code text not null,
  label_id   integer not null references public.csb_construction_column_labels(id),
  ordinal    smallint not null,
  primary key (table_id, field_code)
);
comment on table public.csb_construction_columns is
  'Which measure each FLD code carries within a given table.';

alter table public.csb_construction_tables drop column if exists columns;
alter table public.csb_construction_tables drop column if exists row_count;

alter table public.csb_construction_observations drop column if exists label_en;
alter table public.csb_construction_observations drop column if exists label_ar;
alter table public.csb_construction_observations drop column if exists isic_code;
alter table public.csb_construction_observations
  add column if not exists label_id integer references public.csb_construction_labels(id);

create index if not exists csb_obs_label_idx on public.csb_construction_observations(label_id);

alter table public.csb_construction_labels        enable row level security;
alter table public.csb_construction_column_labels enable row level security;
alter table public.csb_construction_columns       enable row level security;

drop policy if exists csb_labels_read on public.csb_construction_labels;
create policy csb_labels_read on public.csb_construction_labels
  for select to authenticated using (true);

drop policy if exists csb_collabels_read on public.csb_construction_column_labels;
create policy csb_collabels_read on public.csb_construction_column_labels
  for select to authenticated using (true);

drop policy if exists csb_cols_read on public.csb_construction_columns;
create policy csb_cols_read on public.csb_construction_columns
  for select to authenticated using (true);
