create table if not exists public.csb_construction_titles (
  id       integer primary key,
  title_en text,
  title_ar text,
  units    text
);
comment on table public.csb_construction_titles is
  'Distinct table headings; the same table recurs each survey year, so the heading is stored once.';

truncate table public.csb_construction_columns;
delete from public.csb_construction_tables;

alter table public.csb_construction_tables drop column if exists title_en;
alter table public.csb_construction_tables drop column if exists title_ar;
alter table public.csb_construction_tables drop column if exists units;
alter table public.csb_construction_tables drop column if exists source_file;
alter table public.csb_construction_tables drop column if exists sheet_name;
alter table public.csb_construction_tables
  add column if not exists title_id integer references public.csb_construction_titles(id);

alter table public.csb_construction_titles enable row level security;
drop policy if exists csb_titles_read on public.csb_construction_titles;
create policy csb_titles_read on public.csb_construction_titles
  for select to authenticated using (true);
