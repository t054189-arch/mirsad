-- External reference data: Central Statistical Bureau (Kuwait) publication catalogue.
--
-- Source: https://www.csb.gov.kw/Pages/Statistics?ID=29&ParentCatID=3
-- Series: البحث السنوي للمنشآت >> التشييد والبناء
--         (Annual Survey of Establishments >> Construction & Building)
--
-- This table holds the CATALOGUE — one row per published edition — not the
-- statistics inside those publications. CSB serves the files through ASP.NET
-- postbacks rather than static URLs, so `postback_target` records the control
-- that triggers each download and `file_url` is left null until a file is
-- actually retrieved.

create table public.csb_publications (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'csb.gov.kw',
  catalog_id integer not null,
  parent_category_id integer not null,
  series_ar text not null,
  title_ar text not null,
  reference_year integer not null,
  release_type_ar text not null,
  download_count integer check (download_count is null or download_count >= 0),
  source_url text not null,
  -- The __doPostBack control id; the download cannot be addressed by URL.
  postback_target text not null,
  -- Set once the underlying file has been fetched and stored.
  file_url text,
  fetched_at timestamptz not null default now(),
  unique (catalog_id, postback_target)
);

comment on table public.csb_publications is
  'Catalogue of Kuwait CSB statistical publications (metadata only, not the underlying figures).';

create index csb_publications_year_idx on public.csb_publications (reference_year desc);

alter table public.csb_publications enable row level security;

create policy "reference data is readable by signed-in users"
  on public.csb_publications for select to authenticated
  using (true);

create policy "admins manage reference data"
  on public.csb_publications for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Catalogue as published on 2026-09-21. Titles are the series name plus the
-- edition year, exactly as CSB renders them.
insert into public.csb_publications
  (catalog_id, parent_category_id, series_ar, title_ar, reference_year,
   release_type_ar, download_count, source_url, postback_target)
select
  29,
  3,
  'البحث السنوي للمنشآت >> التشييد والبناء',
  'البحث السنوي للمنشآت >> التشييد والبناء ' || v.year::text,
  v.year,
  'سنوية',
  v.downloads,
  'https://www.csb.gov.kw/Pages/Statistics?ID=29&ParentCatID=3',
  'ctl00$MainContent$RPT_Statistic$' || v.ctl || '$' || v.button
from (values
  (2019, 2980, 'ctl01', 'LinkButton3'),
  (2018, 1908, 'ctl02', 'LinkButton3'),
  (2017, 2445, 'ctl03', 'LinkButton3'),
  (2016, 2002, 'ctl04', 'LinkButton3'),
  (2015,  967, 'ctl05', 'LinkButton3'),
  (2014,  305, 'ctl06', 'LinkButton3'),
  (2013, 2476, 'ctl07', 'LinkButton3'),
  (2012, 1504, 'ctl08', 'LinkButton4'),
  (2012,  356, 'ctl09', 'LinkButton3'),
  (2011,  744, 'ctl10', 'LinkButton3'),
  (2010,  432, 'ctl11', 'LinkButton3'),
  (2009,  184, 'ctl12', 'LinkButton3'),
  (2008,  156, 'ctl13', 'LinkButton3'),
  (2007,  139, 'ctl14', 'LinkButton3'),
  (2006,  121, 'ctl15', 'LinkButton3'),
  (2005,  135, 'ctl16', 'LinkButton3'),
  (2004,  117, 'ctl17', 'LinkButton3'),
  (2003,  110, 'ctl18', 'LinkButton3'),
  (2002,  116, 'ctl19', 'LinkButton3'),
  (2001,  107, 'ctl20', 'LinkButton3'),
  (2000,  139, 'ctl21', 'LinkButton3')
) as v(year, downloads, ctl, button);
