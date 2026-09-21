-- Mirsad · Sealed Record — acceptance test
--
--   seal a record  ->  verify (passes)
--   change a finding directly in the database, bypassing the app
--   verify again   ->  must fail with a fingerprint mismatch
--
-- Run against a database that has both migrations and the demo seed applied,
-- or just use test/run.sh, which builds a throwaway database first.

\set ON_ERROR_STOP on
\pset pager off

create function pg_temp.assert(p_ok boolean, p_what text) returns void
language plpgsql as $$
begin
  if not coalesce(p_ok, false) then
    raise exception 'FAIL: %', p_what;
  end if;
  raise notice 'PASS: %', p_what;
end $$;

-- The verification answer must carry no finding text at all.
create function pg_temp.assert_no_finding_text(p_seal_id text) returns void
language plpgsql as $$
declare v jsonb; k text;
begin
  v := public.verify_seal(p_seal_id);
  for k in select jsonb_object_keys(v) loop
    if (v ->> k) ilike '%crack%' or (v ->> k) like '%تشقق%' or (v ->> k) ilike '%hairline%' then
      raise exception 'FAIL: % leaked finding text', k;
    end if;
  end loop;
  raise notice 'PASS: asset, date, signer and result only — no finding text';
end $$;

\echo ''
\echo '== 1. append-only is enforced by the database, not the UI =='

do $$
begin
  update public.findings set title_en = 'edited' where inspection_id = 'insp-2025-jaber';
  raise exception 'FAIL: a finding was updated';
exception when restrict_violation then
  raise notice 'PASS: update refused -> %', sqlerrm;
end $$;

do $$
begin
  delete from public.findings where inspection_id = 'insp-2025-jaber';
  raise exception 'FAIL: a finding was deleted';
exception when restrict_violation then
  raise notice 'PASS: delete refused -> %', sqlerrm;
end $$;

do $$
begin
  delete from public.attachments;
  raise exception 'FAIL: an attachment was deleted';
exception when restrict_violation then
  raise notice 'PASS: attachment delete refused -> %', sqlerrm;
end $$;

do $$
begin
  truncate public.findings cascade;
  raise exception 'FAIL: findings were truncated';
exception when restrict_violation then
  raise notice 'PASS: truncate refused -> %', sqlerrm;
end $$;

do $$
declare v_id uuid;
begin
  select id into v_id from public.findings where inspection_id = 'insp-2025-jaber' limit 1;
  perform public.correct_finding(v_id, '{"severity":"high"}'::jsonb, '   ');
  raise exception 'FAIL: a correction was accepted with no change_reason';
exception when others then
  if sqlerrm like 'FAIL:%' then raise; end if;
  raise notice 'PASS: correction without a reason refused -> %', sqlerrm;
end $$;

\echo ''
\echo '== 2. a correction is a new version, and the old one stays visible =='

select public.correct_finding(
  (select id from public.findings where inspection_id = 'insp-2025-jaber' order by created_at limit 1),
  '{"severity":"high","description_en":"Re-measured at 1.4 mm."}'::jsonb,
  'Re-measured on site; the crack is wider than first recorded.'
) as corrected_id \gset

select severity,
       coalesce(change_reason, '—') as change_reason,
       case when supersedes_id is null then 'original' else 'correction' end as version
  from public.findings
 where inspection_id = 'insp-2025-jaber'
 order by created_at;

select pg_temp.assert(
  (select count(*) from public.findings where inspection_id = 'insp-2025-jaber') = 2,
  'the previous version is still there beside the correction'
);

\echo ''
\echo '== 3. seal the approved inspection =='

select public.seal_inspection(
  'insp-2025-jaber', 'م. نورة الخالد', 'KSE-2019-4471'
) as seal_id \gset

\echo 'sealed as' :'seal_id'

select signer_name, signer_license, sealed_at_local, left(fingerprint, 24) || '…' as fingerprint
  from public.sealed_records where seal_id = :'seal_id';

\echo ''
\echo '== 4. verify -> expect valid =='

select public.verify_seal(:'seal_id') ->> 'result' as result \gset
\echo '   result:' :'result'
select pg_temp.assert(:'result' = 'valid', 'the sealed record verifies');

\echo ''
\echo '== 5. the sealed record itself cannot be changed =='

do $$
begin
  update public.sealed_records set signer_name = 'someone else';
  raise exception 'FAIL: a seal was edited';
exception when restrict_violation then
  raise notice 'PASS: seal edit refused -> %', sqlerrm;
end $$;

do $$
begin
  delete from public.sealed_records;
  raise exception 'FAIL: a seal was deleted';
exception when restrict_violation then
  raise notice 'PASS: seal delete refused -> %', sqlerrm;
end $$;

\echo ''
\echo '== 6. tamper with a finding directly in the database, bypassing the app =='

-- The trigger refuses this, so the tampering is done the only way it really
-- could be: by an operator with the rights to switch the trigger off.
alter table public.findings disable trigger findings_append_only;
update public.findings
   set description_en = 'A 0.2 mm hairline crack, cosmetic only.',
       severity = 'low'
 where inspection_id = 'insp-2025-jaber';
alter table public.findings enable trigger findings_append_only;

\echo '   a finding was rewritten behind the application''s back'

\echo ''
\echo '== 7. verify again -> expect a fingerprint mismatch =='

select public.verify_seal(:'seal_id') ->> 'result'                 as result2   \gset
select public.verify_seal(:'seal_id') ->> 'sealed_fingerprint'     as fp_sealed \gset
select public.verify_seal(:'seal_id') ->> 'recomputed_fingerprint' as fp_now    \gset

\echo '   result:     ' :'result2'
\echo '   sealed:     ' :'fp_sealed'
\echo '   recomputed: ' :'fp_now'

select pg_temp.assert(:'result2' = 'mismatch', 'verification fails after the tampering');
select pg_temp.assert(:'fp_sealed' <> :'fp_now', 'the recomputed fingerprint differs from the sealed one');

\echo ''
\echo '== 8. the verification answer never carries finding text =='

select pg_temp.assert_no_finding_text(:'seal_id');

\echo ''
\echo 'ACCEPTANCE TEST PASSED'
\echo ''
