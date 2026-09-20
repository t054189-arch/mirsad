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
  client.ts   createClient() for Client Components
  server.ts   createClient() for Server Components, Actions, Route Handlers
  proxy.ts    updateSession() — refreshes the auth session per request
  env.ts      reads and validates the environment variables
  health.ts   the connection check shown on the home page
src/proxy.ts  wires updateSession() into every matched request
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

## Scripts

```bash
npm run dev     # local dev server
npm run build   # production build
npm run start   # serve the production build
npm run lint    # eslint
```

## Deployment

The Vercel project **mirsad** exists and both environment variables are already
set for Production, Preview and Development.

It is **not yet connected to this repository**, so pushes do not deploy on their
own. Vercel's GitHub App is currently installed on the `wduwaisan` account,
while this repository lives under `t054189-arch`, so Vercel cannot see it.

To finish the connection — this needs someone with admin rights on the
`t054189-arch` GitHub account:

1. Open the mirsad project on Vercel → **Settings → Git**.
2. Choose **Connect Git Repository** and pick `t054189-arch/mirsad`.
3. Vercel will ask to install its GitHub App on `t054189-arch`. Approve it and
   grant access to the `mirsad` repository.

After that, pushes to `main` deploy to production and every other branch gets a
preview URL.
