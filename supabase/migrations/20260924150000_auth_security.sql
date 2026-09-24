-- What the sign-in pages expect to find in the database:
--   auth_events          sign-in log shown on the account-security page (assets/audit.js)
--   set_backup_codes     store hashes of freshly issued backup codes  (assets/account.js)
--   backup_codes_left    how many unused codes remain                 (assets/account.js)
--   use_backup_code      spend one code in place of a lost phone      (assets/auth.js)

-- ---------- sign-in log ----------
-- The browser may write only the event kind and its own user agent. Who and
-- when are filled in by the server, and nobody can edit or delete a row.
create table public.auth_events (
  id      bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  at      timestamptz not null default now(),
  kind    text not null check (kind ~ '^[a-z0-9_]{1,40}$'),
  agent   text check (char_length(agent) <= 300)
);
comment on table public.auth_events is 'Sign-in, sign-out and two-step events, written by the browser, shown to the account owner.';
create index auth_events_user_at on public.auth_events (user_id, at desc);

alter table public.auth_events enable row level security;

create policy "own events: read" on public.auth_events
  for select to authenticated using (user_id = (select auth.uid()));
create policy "own events: add" on public.auth_events
  for insert to authenticated with check (user_id = (select auth.uid()));

revoke all on public.auth_events from anon, authenticated;
grant select (id, at, kind, agent) on public.auth_events to authenticated;
grant insert (kind, agent) on public.auth_events to authenticated;

-- ---------- backup codes ----------
-- Only SHA-256 hashes are stored; the codes themselves never leave the browser
-- that generated them. No policies: reached only through the functions below.
create table public.backup_codes (
  id      bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  hash    text not null check (hash ~ '^[0-9a-f]{64}$'),
  used_at timestamptz,
  unique (user_id, hash)
);
comment on table public.backup_codes is 'Hashed one-time codes that stand in for a lost authenticator app.';
alter table public.backup_codes enable row level security;
revoke all on public.backup_codes from anon, authenticated;

-- Issuing codes replaces any earlier set. Requires a full (aal2) session, so a
-- stolen password alone cannot mint codes that later skip the authenticator.
create function public.set_backup_codes(hashes text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not signed in'; end if;
  if coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then
    raise exception 'authenticator code required';
  end if;
  if hashes is null or cardinality(hashes) not between 1 and 20 then
    raise exception 'between 1 and 20 codes';
  end if;
  if exists (select 1 from unnest(hashes) h where h !~ '^[0-9a-f]{64}$') then
    raise exception 'bad hash';
  end if;

  delete from public.backup_codes where user_id = uid;
  insert into public.backup_codes (user_id, hash)
    select distinct uid, h from unnest(hashes) h;
end;
$$;

create function public.backup_codes_left()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer from public.backup_codes
  where user_id = auth.uid() and used_at is null;
$$;

-- Called at the authenticator step (aal1: the password was right). A matching
-- code is spent and the account's authenticator factors are removed, so the
-- account falls back to the email link as its second step. The sign-in page
-- then sends that link: a backup code alone never completes a sign-in.
create function public.use_backup_code(code text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  hit bigint;
begin
  if uid is null or code is null then return false; end if;

  update public.backup_codes
     set used_at = now()
   where id = (
     select id from public.backup_codes
      where user_id = uid
        and used_at is null
        and hash = encode(extensions.digest(upper(trim(code)), 'sha256'), 'hex')
      limit 1
      for update)
  returning id into hit;

  if hit is null then return false; end if;

  delete from auth.mfa_factors where user_id = uid;
  return true;
end;
$$;

revoke all on function public.set_backup_codes(text[]) from public, anon;
revoke all on function public.backup_codes_left() from public, anon;
revoke all on function public.use_backup_code(text) from public, anon;
grant execute on function public.set_backup_codes(text[]) to authenticated;
grant execute on function public.backup_codes_left() to authenticated;
grant execute on function public.use_backup_code(text) to authenticated;
