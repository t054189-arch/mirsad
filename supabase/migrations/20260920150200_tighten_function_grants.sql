-- Follow-up on the Supabase security advisors.
--
-- 1. set_updated_at had a mutable search_path.
-- 2. Every function was executable over the REST API by anon and authenticated,
--    because Postgres grants EXECUTE to PUBLIC by default. Trigger functions
--    have no business being callable as RPC.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Trigger functions: nobody calls these directly. Postgres checks EXECUTE when
-- the trigger is created, not each time it fires, so the triggers keep working.
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_inspection_reference() from public, anon, authenticated;
revoke execute on function public.guard_profile_role() from public, anon, authenticated;

-- Predicate helpers: these are referenced inside RLS policies, which are
-- evaluated as the querying role, so `authenticated` must keep EXECUTE.
-- `anon` never reaches a policy that uses them, so it loses access.
revoke execute on function public.current_user_role() from public, anon;
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.can_write() from public, anon;
revoke execute on function public.can_edit_inspection(uuid) from public, anon;

grant execute on function public.current_user_role() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.can_write() to authenticated;
grant execute on function public.can_edit_inspection(uuid) to authenticated;
