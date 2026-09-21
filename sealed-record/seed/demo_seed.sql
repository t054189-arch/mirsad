-- Demo content, mirroring the structures and findings already shown in the
-- Mirsad front end. This is not part of the Sealed Record layer; it exists so
-- the acceptance test has something real to seal.

insert into public.assets (id, name_ar, name_en, asset_type, location_ar, location_en, construction_year)
values ('site-jaber', 'جسر جابر', 'Jaber Bridge', 'bridge', 'الكويت', 'Kuwait', 2019)
on conflict (id) do nothing;

insert into public.inspections (
  id, code, asset_id, inspection_date, inspection_type,
  inspector_ar, inspector_en, notes_ar, notes_en, status
) values (
  'insp-2025-jaber', 'INSP-2025-041', 'site-jaber', '2025-09-18', 'periodic',
  'هيا العنزي', 'Haya Al-Anazi',
  'فحص دوري سنوي شمل الركائز والوصلات.',
  'Annual periodic inspection covering piers and joints.',
  'approved'
) on conflict (id) do nothing;

with f as (
  insert into public.findings (
    inspection_id, title_ar, title_en, severity,
    location_ar, location_en, description_ar, description_en,
    recommendation_ar, recommendation_en, confidence
  ) values (
    'insp-2025-jaber',
    'تشقق سطحي في الركيزة رقم 2', 'Surface crack at pier no. 2', 'medium',
    'الركيزة رقم 2', 'Pier no. 2',
    'تشقق بعرض 1.0 مم على السطح الجانبي للركيزة، تحت المراقبة.',
    'A 1.0 mm wide crack on the lateral face of the pier, kept under observation.',
    'المتابعة في الفحص القادم.', 'Re-measure at the next inspection.', 81
  )
  returning id
)
insert into public.attachments (finding_id, filename, content_sha256, byte_size)
select f.id, 'pier-2-crack.jpg',
       encode(extensions.digest(convert_to('demo image bytes: pier-2-crack', 'UTF8'), 'sha256'), 'hex'),
       248193
from f;
