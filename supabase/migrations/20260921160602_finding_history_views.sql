-- "مقارنة بالسابق": what a finding looks like next to the same defect in an
-- earlier inspection of the same structure.
--
-- findings.previous_finding_id already carries the link the agent makes. These
-- views resolve it into something the UI can render without a four-table join,
-- and give the agent a place to look for candidates in the first place.

-- How severe is severe. Used to say whether a defect got worse or better.
create or replace function public.severity_rank(s public.severity)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case s when 'high' then 3 when 'medium' then 2 when 'low' then 1 end;
$$;

revoke execute on function public.severity_rank(public.severity) from public;
grant execute on function public.severity_rank(public.severity) to authenticated;

-- One row per finding, with the earlier finding it was matched against.
-- direction is null when there is nothing to compare against, which is the
-- normal case for a structure's first inspection.
create view public.finding_comparison
with (security_invoker = true) as
select
  f.id as finding_id,
  f.inspection_id,
  i.structure_id,
  i.reference as inspection_reference,
  i.inspection_date,
  f.title,
  f.severity,
  f.component,
  f.confidence,
  f.comparison_note,
  f.previous_finding_id,
  pf.severity as previous_severity,
  pi.reference as previous_inspection_reference,
  pi.inspection_date as previous_inspection_date,
  (i.inspection_date - pi.inspection_date) as days_since_previous,
  case
    when pf.id is null then null
    when public.severity_rank(f.severity) > public.severity_rank(pf.severity) then 'worse'
    when public.severity_rank(f.severity) < public.severity_rank(pf.severity) then 'improved'
    else 'unchanged'
  end as direction
from public.findings f
join public.inspections i on i.id = f.inspection_id
left join public.findings pf on pf.id = f.previous_finding_id
left join public.inspections pi on pi.id = pf.inspection_id;

comment on view public.finding_comparison is
  'Each finding beside the earlier finding it was matched to, with the severity movement. direction is null on a first inspection.';

-- Every inspection of a structure, newest first, with how many findings each
-- carried. This is what the agent reads to decide which earlier inspection a
-- new finding should be compared against.
create view public.structure_inspection_history
with (security_invoker = true) as
select
  i.structure_id,
  s.name as structure_name,
  s.type as structure_type,
  i.id as inspection_id,
  i.reference,
  i.inspection_date,
  i.type as inspection_type,
  i.status,
  count(f.id) as finding_count,
  count(f.id) filter (where f.severity = 'high') as high_severity_count,
  max(public.severity_rank(f.severity)) as worst_severity_rank,
  row_number() over (partition by i.structure_id order by i.inspection_date desc, i.created_at desc) as recency
from public.inspections i
join public.structures s on s.id = i.structure_id
left join public.findings f on f.inspection_id = i.id
group by i.structure_id, s.name, s.type, i.id, i.reference, i.inspection_date, i.type, i.status, i.created_at;

comment on view public.structure_inspection_history is
  'One row per inspection with its finding counts. recency = 1 is the latest inspection of that structure.';
