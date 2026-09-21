-- storage_path says where an image belongs; uploaded_at says whether the bytes
-- are actually there yet. Metadata is loaded from the publisher's archive in one
-- step and the objects are pushed in another, so the two can legitimately differ.

alter table public.reference_images
  add column if not exists uploaded_at timestamptz;

comment on column public.reference_images.uploaded_at is
  'Null until the downscaled copy has been pushed to the reference-images bucket. A row with a storage_path and no uploaded_at has metadata only.';

create index if not exists reference_images_pending_upload_idx
  on public.reference_images (dataset_id)
  where uploaded_at is null;
