-- Make the reference dataset readable without signing in, so the static public
-- site can show it. Deliberate, and narrow:
--
--   * Only the catalogue and the images. reference_benchmark_runs and
--     reference_predictions stay signed-in only — how the agent scored is not
--     public information.
--   * Read only. anon cannot insert, update or delete any of it.
--
-- The licence (CC BY 4.0) permits redistribution but REQUIRES attribution, so
-- reference_datasets.attribution is exposed alongside the images and any page
-- that renders them must display it. Publishing the images without it would
-- breach the licence.

create policy reference_datasets_public_read on public.reference_datasets
  for select to anon using (true);

create policy reference_images_public_read on public.reference_images
  for select to anon using (true);

-- Objects in a public bucket are served over plain URLs with no token.
update storage.buckets set public = true where id = 'reference-images';

create policy "anyone reads reference images"
  on storage.objects for select to anon
  using (bucket_id = 'reference-images');
