# GitaLife

Standalone Vite + React app for Vercel with Supabase as the backend.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` from `.env.example`:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

3. Run the frontend:

```bash
npm run dev
```

## Supabase Setup

Run [supabase/schema.sql](./supabase/schema.sql) in the Supabase SQL editor. It creates the app tables, profile trigger, row-level security policies, and event signup counter trigger.

If you already ran the older schema, run [supabase/migrations/hub-location-and-image-upload.sql](./supabase/migrations/hub-location-and-image-upload.sql). It creates the public `hub-images` Storage bucket and enforces that each hub has either a campus or a neighborhood.

Required Supabase project settings:

- Enable Email auth.
- Enable Google auth if you want the Google button to work.
- Add your local URL and production URL to Auth > URL Configuration:
  - `http://localhost:5173`
  - your Vercel domain
- Add redirect URLs:
  - `http://localhost:5173/*`
  - `https://your-vercel-domain.vercel.app/*`

The browser app uses only the Supabase anon key. Never expose the service-role key in Vercel client env vars.

## Vercel Setup

Use the normal Vercel Vite defaults:

- Build command: `npm run build`
- Output directory: `dist`
- Environment variables:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

`vercel.json` rewrites all routes to `index.html` so direct links such as `/hubs/:id`, `/login`, and `/reset-password` work.

## Admin Notes

User roles and hub assignments live in the `profiles` table. To make your first admin, update your profile row after signing up:

```sql
update public.profiles
set role = 'admin'
where email = 'you@example.com';
```

Inviting users from the browser requires a Supabase Edge Function or another server route that uses the service-role key. The current frontend leaves that call guarded with a clear error until that server-side function exists.

## Import Gita Verses

If you have permission to use the Vedabase Bhagavad-gita text, generate a local seed file:

```bash
npm run import:gita
```

That writes:

- `supabase/vedabase-gita-verses.json`
- `supabase/seed-verses.sql`
- `supabase/seed-verses/*.sql`

Run `supabase/seed-verses.sql` in the Supabase SQL editor after `supabase/schema.sql`. If the SQL editor struggles with the large file, run the smaller files in `supabase/seed-verses/` in filename order from `001.sql` through `132.sql`.
