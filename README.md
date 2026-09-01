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

Run [supabase/migrations/event-image-upload.sql](./supabase/migrations/event-image-upload.sql) to create the public `event-images` Storage bucket for event image uploads.

Required Supabase project settings:

- Enable Email auth.
- Enable Google auth if you want the Google button to work.
- Add your local URL and production URL to Auth > URL Configuration:
  - `http://localhost:5173`
  - your Vercel domain
- Add redirect URLs:
  - `http://localhost:5173/*`
  - `https://your-vercel-domain.vercel.app/*`
- Set Auth OTP/link expiry to `300` seconds if you want reset-password links to expire after 5 minutes.

The browser app uses only the Supabase anon key. Never expose the service-role key in Vercel client env vars.

## Vercel Setup

Use the normal Vercel Vite defaults:

- Build command: `npm run build`
- Output directory: `dist`
- Environment variables:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `VITE_GEOCODE_REGION` optional, defaults to `Chicago, IL, USA` for estimating hub map coordinates from campus/neighborhood text

The service-role key is used only by the Vercel `/api/invite-user` server route for admin invites. Never prefix it with `VITE_`.

`vercel.json` rewrites all routes to `index.html` so direct links such as `/hubs/:id`, `/login`, and `/reset-password` work.

## Admin Notes

User roles and hub assignments live in the `profiles` table. To make your first admin, update your profile row after signing up:

```sql
update public.profiles
set role = 'admin'
where email = 'you@example.com';
```

Inviting and deleting hub admins uses the Vercel `/api/invite-user` and `/api/delete-user` routes. Set `SUPABASE_SERVICE_ROLE_KEY` in Vercel before using those admin actions.

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
