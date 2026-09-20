-- Row level security for every table, plus the Storage buckets that hold the
-- uploaded images, reports and measurement files.
--
-- Shape of the rules: Mirsad is one team looking at shared infrastructure, so
-- any signed-in user can READ the catalogue. Writing is limited to inspectors
-- and admins, and an inspection can only be changed by whoever created it (or
-- an admin). Notifications are private to their recipient.

-- --------------------------------------------------------------- helper ----

create or replace function public.can_edit_inspection(p_inspection_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.inspections i
    where i.id = p_inspection_id
      and (i.created_by = (select auth.uid()) or public.is_admin())
  );
$$;

-- ------------------------------------------------------------ profiles ----

alter table public.profiles enable row level security;

create policy "profiles are readable by signed-in users"
  on public.profiles for select to authenticated
  using (true);

create policy "users update their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "admins update any profile"
  on public.profiles for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- The own-profile policy would otherwise let anyone promote themselves.
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'only an admin can change a profile role';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function public.guard_profile_role();

-- ---------------------------------------------------------- structures ----

alter table public.structures enable row level security;

create policy "structures are readable by signed-in users"
  on public.structures for select to authenticated
  using (true);

create policy "inspectors create structures"
  on public.structures for insert to authenticated
  with check (public.can_write() and created_by = (select auth.uid()));

create policy "inspectors update structures"
  on public.structures for update to authenticated
  using (public.can_write())
  with check (public.can_write());

create policy "admins delete structures"
  on public.structures for delete to authenticated
  using (public.is_admin());

-- --------------------------------------------------------- inspections ----

alter table public.inspections enable row level security;

create policy "inspections are readable by signed-in users"
  on public.inspections for select to authenticated
  using (true);

create policy "inspectors create inspections"
  on public.inspections for insert to authenticated
  with check (public.can_write() and created_by = (select auth.uid()));

create policy "authors update their own inspections"
  on public.inspections for update to authenticated
  using (created_by = (select auth.uid()) or public.is_admin())
  with check (created_by = (select auth.uid()) or public.is_admin());

create policy "admins delete inspections"
  on public.inspections for delete to authenticated
  using (public.is_admin());

-- The counter table is written only by the reference trigger, which is
-- SECURITY DEFINER. No policies, so RLS denies everything else.
alter table public.inspection_counters enable row level security;

-- ---------------------------------------------------- inspection files ----

alter table public.inspection_files enable row level security;

create policy "inspection files are readable by signed-in users"
  on public.inspection_files for select to authenticated
  using (true);

create policy "authors attach files to their inspections"
  on public.inspection_files for insert to authenticated
  with check (
    public.can_edit_inspection(inspection_id)
    and uploaded_by = (select auth.uid())
  );

create policy "authors remove files from their inspections"
  on public.inspection_files for delete to authenticated
  using (public.can_edit_inspection(inspection_id));

-- -------------------------------------------------------- analysis runs ----

alter table public.analysis_runs enable row level security;

create policy "analysis runs are readable by signed-in users"
  on public.analysis_runs for select to authenticated
  using (true);

create policy "authors start analysis on their inspections"
  on public.analysis_runs for insert to authenticated
  with check (public.can_edit_inspection(inspection_id));

create policy "authors update analysis on their inspections"
  on public.analysis_runs for update to authenticated
  using (public.can_edit_inspection(inspection_id))
  with check (public.can_edit_inspection(inspection_id));

-- ------------------------------------------------------------- findings ----

alter table public.findings enable row level security;

create policy "findings are readable by signed-in users"
  on public.findings for select to authenticated
  using (true);

create policy "authors write findings on their inspections"
  on public.findings for insert to authenticated
  with check (public.can_edit_inspection(inspection_id));

create policy "authors update findings on their inspections"
  on public.findings for update to authenticated
  using (public.can_edit_inspection(inspection_id))
  with check (public.can_edit_inspection(inspection_id));

create policy "authors delete findings on their inspections"
  on public.findings for delete to authenticated
  using (public.can_edit_inspection(inspection_id));

-- ------------------------------------------------------ finding reviews ----

alter table public.finding_reviews enable row level security;

create policy "reviews are readable by signed-in users"
  on public.finding_reviews for select to authenticated
  using (true);

create policy "inspectors record their own review decisions"
  on public.finding_reviews for insert to authenticated
  with check (public.can_write() and reviewed_by = (select auth.uid()));

-- No update or delete policy: a review decision is an audit trail. Correcting
-- one means inserting a newer decision, which finding_current_review picks up.

-- -------------------------------------------------------- notifications ----

alter table public.notifications enable row level security;

create policy "users read their own notifications"
  on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));

create policy "users mark their own notifications read"
  on public.notifications for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "users delete their own notifications"
  on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()));

-- Notifications are normally written by the agent using the service role,
-- which bypasses RLS. This lets the app raise one for a teammate too.
create policy "inspectors send notifications"
  on public.notifications for insert to authenticated
  with check (public.can_write());

-- -------------------------------------------------------------- storage ----

insert into storage.buckets (id, name, public)
values
  ('inspection-files', 'inspection-files', false),
  ('structure-covers', 'structure-covers', true)
on conflict (id) do nothing;

-- Inspection files are private: images of defects should not be world readable.
create policy "signed-in users read inspection files"
  on storage.objects for select to authenticated
  using (bucket_id = 'inspection-files');

create policy "inspectors upload inspection files"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'inspection-files' and public.can_write());

create policy "uploaders replace their inspection files"
  on storage.objects for update to authenticated
  using (bucket_id = 'inspection-files' and owner_id = (select auth.uid())::text)
  with check (bucket_id = 'inspection-files' and owner_id = (select auth.uid())::text);

create policy "uploaders delete their inspection files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'inspection-files'
    and (owner_id = (select auth.uid())::text or public.is_admin())
  );

-- Structure cover photos are public, so the catalogue renders without signed URLs.
create policy "anyone reads structure covers"
  on storage.objects for select to public
  using (bucket_id = 'structure-covers');

create policy "inspectors manage structure covers"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'structure-covers' and public.can_write());

create policy "inspectors update structure covers"
  on storage.objects for update to authenticated
  using (bucket_id = 'structure-covers' and public.can_write())
  with check (bucket_id = 'structure-covers' and public.can_write());

create policy "inspectors delete structure covers"
  on storage.objects for delete to authenticated
  using (bucket_id = 'structure-covers' and public.can_write());
