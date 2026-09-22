# مرصاد

مشروع الفريق — تطبيق [Next.js](https://nextjs.org) يعمل على Vercel، وقاعدة بيانات ومصادقة على [Supabase](https://supabase.com).

## Stack

| Piece | What it is |
| --- | --- |
| Next.js 16 (App Router, TypeScript) | The app, in `src/app` |
| Tailwind CSS v4 | Styling |
| Supabase | Postgres, Auth, Storage |
| Vercel | Hosting and preview deployments |

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in the two values below
npm run dev
```

Open <http://localhost:3000>. The home page shows whether the app can reach
Supabase, so you know immediately if your environment is wired up correctly.

### Environment variables

Both values come from the Supabase dashboard under
**Project Settings → API Keys**:

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://sbeftcrvveonvgxetcxq.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | The key starting with `sb_publishable_` |

Both are safe to ship to the browser — Supabase expects that. What protects your
data is **row level security**, so turn RLS on for every table you create.

The secret key (`sb_secret_…`) bypasses RLS. If you ever need it, put it in
`SUPABASE_SECRET_KEY` — server-side only, and never with a `NEXT_PUBLIC_` prefix.

These variables are already set on Vercel for Production, Preview and
Development, so deployments need no extra setup.

## How Supabase is wired in

```
src/lib/supabase/
  client.ts           createClient() for Client Components
  server.ts           createClient() for Server Components, Actions, Route Handlers
  proxy.ts            updateSession() — refreshes the auth session per request
  env.ts              reads and validates the environment variables
  health.ts           the connection check shown on the home page
  database.types.ts   generated schema types — every client is typed with them
src/proxy.ts          wires updateSession() into every matched request
supabase/migrations/  the schema, in order
```

Two things are worth knowing before you write auth code:

- **Create a new server client per request.** It is configured from that
  request's cookies; sharing one across requests leaks sessions between users.
- **Use `getClaims()`, never `getSession()`, in server code.** `getClaims()`
  verifies the JWT signature. A session read from cookies can be forged.

`src/proxy.ts` currently refreshes the session and nothing else. Route
protection is scaffolded as a commented block in `src/lib/supabase/proxy.ts` —
uncomment it once a `/login` page exists, otherwise it will lock out the whole
site.

Next.js 16 renamed the `middleware` convention to `proxy`. Same behaviour, new
file name.

## Database

The schema follows the user-journey flowchart, step by step. Migrations live in
`supabase/migrations/` and are already applied to the project.

| Journey step | Where it lands |
| --- | --- |
| 1. تسجيل الدخول | `auth.users` (Supabase Auth) + `profiles` |
| 2. اختيار المنشأة | `structures` |
| 3. إدخال بيانات الفحص | `inspections` |
| 4. رفع الملفات | `inspection_files` + Storage buckets |
| 5. بدء التحليل | `analysis_runs` |
| 6. عرض النتائج | `findings` |
| 7. مراجعة المستخدم | `finding_reviews` |
| 8. تحديث السجل | `inspections.status` + the review history |
| 9. إشعار الوكيل الذكي | `notifications` |

### Emails and passwords

Neither is stored in our tables. Supabase Auth owns `auth.users`, hashes the
password and handles sessions — writing our own would be a security liability.
`profiles` holds what the app needs on top: display name and role, keyed by the
auth user id. A trigger creates the profile row automatically on sign-up.

### Images and files

Bytes go to Storage, and `inspection_files` records where. Two buckets:

- `inspection-files` — **private**. Photos of defects, PDF reports and
  measurement files. Read them with signed URLs; `kind` marks which of the three
  upload tabs a file came from.
- `structure-covers` — **public**, so the structure list renders without signing
  every thumbnail.

### Findings (الملاحظات)

A `findings` row is one thing the analysis reported: `severity` (high/medium/low),
`component` for where it is ("الركيزة رقم 2"), `confidence` for the accuracy
percentage, and `previous_finding_id` linking to the same defect in an earlier
inspection — that link is what "مقارنة بالسابق" reads.

Review decisions are append-only. Approving, rejecting or editing inserts a new
`finding_reviews` row rather than overwriting the last one, so the audit trail
survives; the `finding_current_review` view exposes the latest decision per
finding.

Two views make that comparison cheap to render. `finding_comparison` puts each
finding beside the earlier finding it was matched to and says whether the defect
got `worse`, `improved` or is `unchanged` (null on a structure's first
inspection). `structure_inspection_history` lists every inspection of a structure
newest first with its finding counts, which is how the agent picks *which*
earlier inspection to compare against.

Inspection references (`INSP-2026-014`) are generated by a trigger using a
per-year counter, so two people creating inspections at once cannot collide.

### Access rules

Every table has row level security on. Roles are `admin`, `inspector`, `viewer`:

- Any signed-in user can read the catalogue — it is one team looking at shared
  infrastructure.
- Inspectors and admins can write; viewers cannot.
- An inspection and everything under it can only be changed by whoever created
  it, or an admin.
- Notifications are readable only by their recipient.
- Users cannot change their own `role`; a trigger blocks it.

Two advisor notices are deliberate and expected to stay: `inspection_counters`
has RLS enabled with no policies (it is written only by the reference trigger,
so everything else is denied), and the four predicate helpers are executable by
`authenticated` because RLS policies are evaluated as the querying role.

## Reference data for the agent

Two kinds of data feed MIRSAAD: records of Kuwaiti structures and projects, and
labelled inspection imagery the agent is developed and measured against. They
are stored apart from each other and apart from real inspections, because they
mean different things.

`data_sources` holds every upstream source that was evaluated, with the access
that was **verified by fetching it**, not the access the publisher advertises:

| Source | Verified access |
| --- | --- |
| MPW — Projects, and the testing & quality-control centre | **Unreachable.** `www.mpw.gov.kw` resolves (93.191.65.12) but four HTTPS attempts were cut off mid-exchange. Probably restricted to Kuwaiti networks; retry from one. |
| eMISK portal (`epa.gov.kw/eMISK`) | Open, but descriptive — the data is on the GIS server. |
| eMISK ArcGIS (`gisportal.emisk.org`) | **Partial.** Of 52 service folders, 48 return error 499 *Token Required*. The only public feature layer is Beatona air-quality monitoring stations — 12 points. The "250+ layers" figure is not anonymously reachable. |
| CSB — construction survey | Open. Already loaded into `csb_publications` and `csb_construction_*`. |
| SDNET2018 (Utah State University) | **Restricted.** The landing page is 200, but the download URL returns 403 to non-browser clients. Obtainable by hand through a browser. |
| Metricéa Lab 380 (Mendeley Data) | Open. Downloaded and ingested — see below. |

So the honest position on Kuwaiti sources is: the CSB construction statistics are
in; MPW and the bulk of eMISK are not available to this project yet, and no
amount of scripting changes that — they need either a Kuwaiti network or
credentials from EPA, plus a licensing answer, since the eMISK REST endpoint
publishes no terms of use.

### The crack dataset

`reference_datasets` and `reference_images` hold labelled third-party imagery.
One dataset is loaded: **Metricéa Lab 380**, doi
[10.17632/cmcx9kvr68.1](https://doi.org/10.17632/cmcx9kvr68.1), CC BY 4.0 —
photographs taken during real bridge and infrastructure inspections in
Île-de-France, labelled cracked / uncracked under the French IQOA framework.
Field conditions, not laboratory tiles: variable light, shadows, weathering.

The archive was downloaded in full and verified against the publisher's
checksum (2,583,659,590 bytes, sha256 `e6e0f6be…e895fb2`). Note that it ships
**476 images** (238 cracked, 238 uncracked) although the abstract says 380; the
row count records what is actually in the archive.

All 476 rows are loaded, each with the file's own sha256, its dimensions and a
deterministic 70/15/15 `train` / `validation` / `test` split that is balanced
within each class (334 / 72 / 70, half cracked and half uncracked in each).

The images themselves are in the `reference-images` bucket: 476 objects,
127,299,107 bytes, downscaled to a 1024 px longest edge from 2,586,124,614 bytes
of originals. Row count, object count and the two byte totals reconcile exactly,
and no row is missing an object or the other way round.

`scripts/ingest-reference-dataset.mjs` is what put them there, and is how a
future dataset gets uploaded. It needs a secret key, since the bucket is
admin-write. It re-verifies the archive checksum, then each file's own checksum
before resizing, and stamps `uploaded_at` and `stored_bytes` per row, so a
re-run skips what is already up and an interrupted run is simply resumed. A row
with a `storage_path` but no `uploaded_at` has metadata only.

**These are not Kuwaiti structures**, which is why `reference_datasets` carries
an `is_kuwaiti` flag set to false. They measure whether the agent can read real
field photographs. A result from them says nothing about any specific Kuwaiti
asset, and must never be shown as an inspection of one.

### Benchmark results

`reference_benchmark_runs` and `reference_predictions` record what the agent
said about each labelled image, and the `reference_benchmark_scores` view joins
predictions to ground truth to produce accuracy, false positives and false
negatives. The point is that an accuracy claim can be recomputed from stored
rows rather than asserted.

## Scripts

```bash
npm run dev     # local dev server
npm run build   # production build
npm run start   # serve the production build
npm run lint    # eslint
```

```bash
# Push a reference dataset's images into Storage (see "Reference data" below).
# Needs a secret key; it is not read from .env.local on purpose.
NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SECRET_KEY=sb_secret_... \
  node scripts/ingest-reference-dataset.mjs --archive ~/Downloads/dataset.zip
```

## Deployment

<https://mirsad-alpha.vercel.app> serves the static Arabic site from the repo
root — that is the public face of the project, chosen deliberately. **This
Next.js app is not what is deployed there.**

Vercel's GitHub App is installed on `t054189-arch`, so every push to `main`
deploys on its own and branches get preview URLs. Nothing is uploaded by hand
any more.

The project's build settings are deliberately all null (`framework`,
`buildCommand`, `outputDirectory`, `installCommand`): `main` is a pre-built
static site and the repo root is served as-is. An earlier stopgap set
`buildCommand` to `bash build.sh`, and every Git build then failed with exit
127 because that file exists only in old hand-uploaded deployments and is not
in the repo. Do not reintroduce it.

Deploying *this* app therefore needs a second Vercel project, or the existing
one switched to `framework: nextjs` — which would take the static site down.
Its two Supabase environment variables are already set for Production, Preview
and Development, so either route works without further setup.

The Supabase project is shared and unaffected: the schema, storage buckets and
policies in `supabase/migrations/` are live regardless of what Vercel serves.
