-- Mirsad · Sealed Record layer — sealing, correcting and verifying
--
-- mirsad_seal_payload() is the single canonical serialisation of an
-- inspection's full content. Sealing hashes it; verification rebuilds it from
-- the database and hashes it again. Because both paths call this one function,
-- they cannot drift apart.

-- Timestamps are rendered at a fixed UTC offset. to_jsonb() on a timestamptz
-- would render it in the session's TimeZone, which would make identical content
-- hash differently from one connection to the next.
create or replace function public.mirsad_ts(p_ts timestamptz)
returns text
language sql
immutable
set search_path = ''
as $fn$
  select to_char(timezone(interval '+00:00', p_ts), 'YYYY-MM-DD"T"HH24:MI:SS.US') || 'Z';
$fn$;

-- to_jsonb() is strict: to_jsonb(NULL) is NULL, and one NULL field would
-- otherwise collapse the whole payload. A missing value is the JSON null,
-- which is distinguishable from an empty string.
create or replace function public.mirsad_j(p_value jsonb)
returns text
language sql
immutable
set search_path = ''
as $fn$
  select coalesce(p_value::text, 'null');
$fn$;

-- ---------------------------------------------------------------------------
-- Canonical payload
-- ---------------------------------------------------------------------------
-- Every value is emitted as a JSON scalar, so text is escaped unambiguously and
-- NULL is distinguishable from ''. Field order is fixed by this function, and
-- the covered rows are visited in the order recorded in the seal's manifest.

create or replace function public.mirsad_seal_payload(
  p_inspection_id   text,
  p_signer_name     text,
  p_signer_license  text,
  p_sealed_at_local text,
  p_manifest        jsonb
) returns text
language plpgsql
stable
set search_path = ''
as $fn$
declare
  v_out   text;
  v_ins   public.inspections%rowtype;
  v_ast   public.assets%rowtype;
  v_fnd   public.findings%rowtype;
  v_att   public.attachments%rowtype;
  v_entry jsonb;
  v_att_id jsonb;
  v_fi    integer := 0;
  v_ai    integer;
  v_pfx   text;
  v_apfx  text;
begin
  select * into v_ins from public.inspections where id = p_inspection_id;
  if not found then
    raise exception 'inspection % not found', p_inspection_id;
  end if;
  select * into v_ast from public.assets where id = v_ins.asset_id;

  v_out := 'mirsad-seal-v1';

  v_out := v_out || E'\n' || 'asset.id:'                || public.mirsad_j(to_jsonb(v_ast.id));
  v_out := v_out || E'\n' || 'asset.name_ar:'           || public.mirsad_j(to_jsonb(v_ast.name_ar));
  v_out := v_out || E'\n' || 'asset.name_en:'           || public.mirsad_j(to_jsonb(v_ast.name_en));
  v_out := v_out || E'\n' || 'asset.asset_type:'        || public.mirsad_j(to_jsonb(v_ast.asset_type));
  v_out := v_out || E'\n' || 'asset.location_ar:'       || public.mirsad_j(to_jsonb(v_ast.location_ar));
  v_out := v_out || E'\n' || 'asset.location_en:'       || public.mirsad_j(to_jsonb(v_ast.location_en));
  v_out := v_out || E'\n' || 'asset.construction_year:' || public.mirsad_j(to_jsonb(v_ast.construction_year));

  v_out := v_out || E'\n' || 'inspection.id:'              || public.mirsad_j(to_jsonb(v_ins.id));
  v_out := v_out || E'\n' || 'inspection.code:'            || public.mirsad_j(to_jsonb(v_ins.code));
  v_out := v_out || E'\n' || 'inspection.inspection_date:' || public.mirsad_j(to_jsonb(v_ins.inspection_date));
  v_out := v_out || E'\n' || 'inspection.inspection_type:' || public.mirsad_j(to_jsonb(v_ins.inspection_type));
  v_out := v_out || E'\n' || 'inspection.inspector_ar:'    || public.mirsad_j(to_jsonb(v_ins.inspector_ar));
  v_out := v_out || E'\n' || 'inspection.inspector_en:'    || public.mirsad_j(to_jsonb(v_ins.inspector_en));
  v_out := v_out || E'\n' || 'inspection.notes_ar:'        || public.mirsad_j(to_jsonb(v_ins.notes_ar));
  v_out := v_out || E'\n' || 'inspection.notes_en:'        || public.mirsad_j(to_jsonb(v_ins.notes_en));
  v_out := v_out || E'\n' || 'inspection.status:'          || public.mirsad_j(to_jsonb(v_ins.status));

  -- 1. WHO SIGNED and 2. WHEN are hashed with the content, not stored beside it.
  v_out := v_out || E'\n' || 'signer.name:'     || public.mirsad_j(to_jsonb(p_signer_name));
  v_out := v_out || E'\n' || 'signer.license:'  || public.mirsad_j(to_jsonb(p_signer_license));
  v_out := v_out || E'\n' || 'sealed_at_local:' || public.mirsad_j(to_jsonb(p_sealed_at_local));

  v_out := v_out || E'\n' || 'findings.count:'
                 || public.mirsad_j(to_jsonb(jsonb_array_length(coalesce(p_manifest -> 'findings', '[]'::jsonb))));

  for v_entry in
    select value from jsonb_array_elements(coalesce(p_manifest -> 'findings', '[]'::jsonb))
  loop
    v_pfx := 'finding[' || v_fi || ']';

    select * into v_fnd
      from public.findings
     where id = (v_entry ->> 'id')::uuid;

    if not found then
      -- A covered row that is gone can never hash to the sealed value.
      v_out := v_out || E'\n' || v_pfx || ':MISSING:' || public.mirsad_j(to_jsonb(v_entry ->> 'id'));
    else
      v_out := v_out || E'\n' || v_pfx || '.id:'                || public.mirsad_j(to_jsonb(v_fnd.id));
      v_out := v_out || E'\n' || v_pfx || '.inspection_id:'     || public.mirsad_j(to_jsonb(v_fnd.inspection_id));
      v_out := v_out || E'\n' || v_pfx || '.supersedes_id:'     || public.mirsad_j(to_jsonb(v_fnd.supersedes_id));
      v_out := v_out || E'\n' || v_pfx || '.change_reason:'     || public.mirsad_j(to_jsonb(v_fnd.change_reason));
      v_out := v_out || E'\n' || v_pfx || '.title_ar:'          || public.mirsad_j(to_jsonb(v_fnd.title_ar));
      v_out := v_out || E'\n' || v_pfx || '.title_en:'          || public.mirsad_j(to_jsonb(v_fnd.title_en));
      v_out := v_out || E'\n' || v_pfx || '.severity:'          || public.mirsad_j(to_jsonb(v_fnd.severity));
      v_out := v_out || E'\n' || v_pfx || '.location_ar:'       || public.mirsad_j(to_jsonb(v_fnd.location_ar));
      v_out := v_out || E'\n' || v_pfx || '.location_en:'       || public.mirsad_j(to_jsonb(v_fnd.location_en));
      v_out := v_out || E'\n' || v_pfx || '.description_ar:'    || public.mirsad_j(to_jsonb(v_fnd.description_ar));
      v_out := v_out || E'\n' || v_pfx || '.description_en:'    || public.mirsad_j(to_jsonb(v_fnd.description_en));
      v_out := v_out || E'\n' || v_pfx || '.recommendation_ar:' || public.mirsad_j(to_jsonb(v_fnd.recommendation_ar));
      v_out := v_out || E'\n' || v_pfx || '.recommendation_en:' || public.mirsad_j(to_jsonb(v_fnd.recommendation_en));
      v_out := v_out || E'\n' || v_pfx || '.confidence:'        || public.mirsad_j(to_jsonb(v_fnd.confidence));
      v_out := v_out || E'\n' || v_pfx || '.created_at:'        || public.mirsad_j(to_jsonb(public.mirsad_ts(v_fnd.created_at)));
    end if;

    v_out := v_out || E'\n' || v_pfx || '.attachments.count:'
                   || public.mirsad_j(to_jsonb(jsonb_array_length(coalesce(v_entry -> 'attachments', '[]'::jsonb))));

    v_ai := 0;
    for v_att_id in
      select value from jsonb_array_elements(coalesce(v_entry -> 'attachments', '[]'::jsonb))
    loop
      v_apfx := v_pfx || '.attachment[' || v_ai || ']';

      select * into v_att
        from public.attachments
       where id = (v_att_id #>> '{}')::uuid;

      if not found then
        v_out := v_out || E'\n' || v_apfx || ':MISSING:' || public.mirsad_j(to_jsonb(v_att_id #>> '{}'));
      else
        v_out := v_out || E'\n' || v_apfx || '.id:'             || public.mirsad_j(to_jsonb(v_att.id));
        v_out := v_out || E'\n' || v_apfx || '.finding_id:'     || public.mirsad_j(to_jsonb(v_att.finding_id));
        v_out := v_out || E'\n' || v_apfx || '.filename:'       || public.mirsad_j(to_jsonb(v_att.filename));
        -- the hash of the image itself
        v_out := v_out || E'\n' || v_apfx || '.content_sha256:' || public.mirsad_j(to_jsonb(v_att.content_sha256));
        v_out := v_out || E'\n' || v_apfx || '.byte_size:'      || public.mirsad_j(to_jsonb(v_att.byte_size));
        v_out := v_out || E'\n' || v_apfx || '.created_at:'     || public.mirsad_j(to_jsonb(public.mirsad_ts(v_att.created_at)));
      end if;

      v_ai := v_ai + 1;
    end loop;

    v_fi := v_fi + 1;
  end loop;

  return v_out;
end;
$fn$;

-- ---------------------------------------------------------------------------
-- Sealing — on approval
-- ---------------------------------------------------------------------------

create or replace function public.seal_inspection(
  p_inspection_id  text,
  p_signer_name    text,
  p_signer_license text
) returns text
language plpgsql
volatile
set search_path = ''
as $fn$
declare
  v_status    text;
  v_seal_id   text;
  v_sealed_at timestamptz := now();
  v_local     text;
  v_manifest  jsonb;
begin
  if length(btrim(coalesce(p_signer_name, ''))) = 0
     or length(btrim(coalesce(p_signer_license, ''))) = 0 then
    raise exception 'a seal needs a named signer and a professional licence number';
  end if;

  select status into v_status from public.inspections where id = p_inspection_id;
  if not found then
    raise exception 'inspection % not found', p_inspection_id;
  end if;
  if v_status <> 'approved' then
    raise exception 'inspection % is %, only an approved inspection can be sealed',
      p_inspection_id, v_status;
  end if;

  -- Same expression as the sealed_at_local generated column, so the hashed
  -- timestamp and the stored one are the same string.
  v_local := to_char(timezone(interval '+03:00', v_sealed_at), 'YYYY-MM-DD"T"HH24:MI:SS') || '+03:00';

  -- Pin exactly which rows this seal covers, in a fixed order. Later appended
  -- corrections are new rows and are not covered by an existing seal.
  select jsonb_build_object('findings', coalesce(jsonb_agg(f.entry order by f.created_at, f.id), '[]'::jsonb))
    into v_manifest
    from (
      select fnd.id,
             fnd.created_at,
             jsonb_build_object(
               'id', fnd.id,
               'attachments', coalesce((
                 select jsonb_agg(att.id order by att.created_at, att.id)
                   from public.attachments att
                  where att.finding_id = fnd.id
               ), '[]'::jsonb)
             ) as entry
        from public.findings fnd
       where fnd.inspection_id = p_inspection_id
    ) f;

  v_seal_id := 'MRS-' || upper(encode(extensions.gen_random_bytes(8), 'hex'));

  insert into public.sealed_records (
    seal_id, inspection_id, signer_name, signer_license,
    sealed_at, algorithm, content_manifest, fingerprint
  ) values (
    v_seal_id, p_inspection_id, btrim(p_signer_name), btrim(p_signer_license),
    v_sealed_at, 'mirsad-seal-v1', v_manifest,
    encode(
      extensions.digest(
        convert_to(
          public.mirsad_seal_payload(
            p_inspection_id, btrim(p_signer_name), btrim(p_signer_license), v_local, v_manifest
          ),
          'UTF8'
        ),
        'sha256'
      ),
      'hex'
    )
  );

  return v_seal_id;
end;
$fn$;

-- ---------------------------------------------------------------------------
-- Correcting — the only way to change a finding
-- ---------------------------------------------------------------------------

create or replace function public.correct_finding(
  p_finding_id    uuid,
  p_patch         jsonb,
  p_change_reason text
) returns uuid
language plpgsql
volatile
set search_path = ''
as $fn$
declare
  v_old public.findings%rowtype;
  v_new uuid;
begin
  if length(btrim(coalesce(p_change_reason, ''))) = 0 then
    raise exception 'a correction needs a change_reason';
  end if;

  select * into v_old from public.findings where id = p_finding_id;
  if not found then
    raise exception 'finding % not found', p_finding_id;
  end if;

  insert into public.findings (
    inspection_id, supersedes_id, change_reason,
    title_ar, title_en, severity, location_ar, location_en,
    description_ar, description_en, recommendation_ar, recommendation_en, confidence
  ) values (
    v_old.inspection_id, v_old.id, btrim(p_change_reason),
    coalesce(p_patch ->> 'title_ar',          v_old.title_ar),
    coalesce(p_patch ->> 'title_en',          v_old.title_en),
    coalesce(p_patch ->> 'severity',          v_old.severity),
    coalesce(p_patch ->> 'location_ar',       v_old.location_ar),
    coalesce(p_patch ->> 'location_en',       v_old.location_en),
    coalesce(p_patch ->> 'description_ar',    v_old.description_ar),
    coalesce(p_patch ->> 'description_en',    v_old.description_en),
    coalesce(p_patch ->> 'recommendation_ar', v_old.recommendation_ar),
    coalesce(p_patch ->> 'recommendation_en', v_old.recommendation_en),
    coalesce((p_patch ->> 'confidence')::integer, v_old.confidence)
  )
  returning id into v_new;

  return v_new;
end;
$fn$;

-- ---------------------------------------------------------------------------
-- 4. Verification — recomputed on the server, no finding text in the answer
-- ---------------------------------------------------------------------------

create or replace function public.verify_seal(p_seal_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $fn$
declare
  v_seal public.sealed_records%rowtype;
  v_ins  public.inspections%rowtype;
  v_ast  public.assets%rowtype;
  v_recomputed text;
begin
  select * into v_seal from public.sealed_records where seal_id = p_seal_id;
  if not found then
    return jsonb_build_object('seal_id', p_seal_id, 'result', 'not_found');
  end if;

  select * into v_ins from public.inspections where id = v_seal.inspection_id;
  select * into v_ast from public.assets where id = v_ins.asset_id;

  v_recomputed := encode(
    extensions.digest(
      convert_to(
        public.mirsad_seal_payload(
          v_seal.inspection_id, v_seal.signer_name, v_seal.signer_license,
          v_seal.sealed_at_local, v_seal.content_manifest
        ),
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );

  -- Asset, date, signer, result. Never the finding text.
  return jsonb_build_object(
    'seal_id',         v_seal.seal_id,
    'result',          case when v_recomputed = v_seal.fingerprint then 'valid' else 'mismatch' end,
    'algorithm',       v_seal.algorithm,
    'asset_name_ar',   v_ast.name_ar,
    'asset_name_en',   v_ast.name_en,
    'asset_type',      v_ast.asset_type,
    'asset_location_ar', v_ast.location_ar,
    'asset_location_en', v_ast.location_en,
    'inspection_code', v_ins.code,
    'inspection_date', v_ins.inspection_date,
    'signer_name',     v_seal.signer_name,
    'signer_license',  v_seal.signer_license,
    'sealed_at_local', v_seal.sealed_at_local,
    'sealed_fingerprint',     v_seal.fingerprint,
    'recomputed_fingerprint', v_recomputed
  );
end;
$fn$;

-- ---------------------------------------------------------------------------
-- Exposure
-- ---------------------------------------------------------------------------
-- The record itself is never readable over the public API: row level security
-- is on with no policy, so anon and authenticated select nothing. The only
-- public door is verify_seal(), which answers with a result and never with
-- finding text.

alter table public.assets         enable row level security;
alter table public.inspections    enable row level security;
alter table public.findings       enable row level security;
alter table public.attachments    enable row level security;
alter table public.sealed_records enable row level security;

-- anon / authenticated are Supabase's API roles. Skipped on a plain Postgres,
-- where there is no public API in front of the tables to close off.
do $grants$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on table public.assets, public.inspections, public.findings,
                        public.attachments, public.sealed_records
      from anon, authenticated;

    revoke all on function public.mirsad_j(jsonb)                                     from anon, authenticated;
    revoke all on function public.mirsad_ts(timestamptz)                             from anon, authenticated;
    revoke all on function public.mirsad_seal_payload(text, text, text, text, jsonb) from anon, authenticated;
    revoke all on function public.seal_inspection(text, text, text)                  from anon, authenticated;
    revoke all on function public.correct_finding(uuid, jsonb, text)                 from anon, authenticated;

    -- the one public door
    grant execute on function public.verify_seal(text) to anon, authenticated;
  end if;
end
$grants$;

revoke all on function public.mirsad_j(jsonb)                                     from public;
revoke all on function public.mirsad_ts(timestamptz)                             from public;
revoke all on function public.mirsad_seal_payload(text, text, text, text, jsonb) from public;
revoke all on function public.seal_inspection(text, text, text)                  from public;
revoke all on function public.correct_finding(uuid, jsonb, text)                 from public;
revoke all on function public.verify_seal(text)                                  from public;

-- ---------------------------------------------------------------------------
-- The export behind the PDF
-- ---------------------------------------------------------------------------
-- Unlike verify_seal(), this does carry the finding text: it is the authorised
-- export of a record, not the public verification. It is never granted to anon.

create or replace function public.sealed_record_export(p_seal_id text)
returns jsonb
language plpgsql
stable
set search_path = ''
as $fn$
declare
  v_seal public.sealed_records%rowtype;
  v_ins  public.inspections%rowtype;
  v_ast  public.assets%rowtype;
begin
  select * into v_seal from public.sealed_records where seal_id = p_seal_id;
  if not found then
    return null;
  end if;

  select * into v_ins from public.inspections where id = v_seal.inspection_id;
  select * into v_ast from public.assets where id = v_ins.asset_id;

  return jsonb_build_object(
    'seal_id',         v_seal.seal_id,
    'signer_name',     v_seal.signer_name,
    'signer_license',  v_seal.signer_license,
    'sealed_at_local', v_seal.sealed_at_local,
    'fingerprint',     v_seal.fingerprint,
    'algorithm',       v_seal.algorithm,
    'asset', jsonb_build_object(
      'name_ar', v_ast.name_ar, 'name_en', v_ast.name_en,
      'location_ar', v_ast.location_ar, 'location_en', v_ast.location_en,
      'asset_type', v_ast.asset_type
    ),
    'inspection', jsonb_build_object(
      'code', v_ins.code, 'date', v_ins.inspection_date, 'type', v_ins.inspection_type,
      'inspector_ar', v_ins.inspector_ar, 'inspector_en', v_ins.inspector_en,
      'notes_ar', v_ins.notes_ar, 'notes_en', v_ins.notes_en
    ),
    -- the findings this seal covers, in the order it covers them
    'findings', coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'title_ar', f.title_ar, 'title_en', f.title_en,
                 'severity', f.severity,
                 'location_ar', f.location_ar, 'location_en', f.location_en,
                 'description_ar', f.description_ar, 'description_en', f.description_en,
                 'recommendation_ar', f.recommendation_ar, 'recommendation_en', f.recommendation_en,
                 'change_reason', f.change_reason,
                 'is_correction', f.supersedes_id is not null,
                 'attachments', coalesce((
                   select jsonb_agg(jsonb_build_object(
                            'filename', a.filename, 'content_sha256', a.content_sha256)
                          order by a.created_at, a.id)
                     from public.attachments a
                    where a.finding_id = f.id
                      and (entry -> 'attachments') ? a.id::text
                 ), '[]'::jsonb)
               ) order by entry.ordinality
             )
        from jsonb_array_elements(v_seal.content_manifest -> 'findings')
               with ordinality as entry(entry, ordinality)
        join public.findings f on f.id = (entry.entry ->> 'id')::uuid
    ), '[]'::jsonb)
  );
end;
$fn$;

revoke all on function public.sealed_record_export(text) from public;
do $grants$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function public.sealed_record_export(text) from anon, authenticated;
  end if;
end
$grants$;
