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

Run [supabase/migrations/hub-contacts.sql](./supabase/migrations/hub-contacts.sql) to create the hub contact form submissions table.

Run [supabase/migrations/standalone-hub-volunteer-opportunities.sql](./supabase/migrations/standalone-hub-volunteer-opportunities.sql) to let hub admins create volunteer opportunities that are tied to a hub without being linked to an event.

Run [supabase/migrations/ai-drafts.sql](./supabase/migrations/ai-drafts.sql) to create the admin-only AI drafts table.

Run [supabase/migrations/email-audience-lists.sql](./supabase/migrations/email-audience-lists.sql) to let admins save reusable manual email lists.

Run [supabase/migrations/gallery-photos.sql](./supabase/migrations/gallery-photos.sql) to let admins upload/manage public gallery photos.

Run [supabase/scripture_vectors.sql](./supabase/scripture_vectors.sql) to create the `scripture_chunks` pgvector table and search function for Ask the Pandit.

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

Recommended Supabase email template links:

- Confirm signup: `<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup">Confirm your email</a>`
- Invite user: `<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite">Accept invite</a>`
- Reset password: `<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">Reset password</a>`

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
  - `HF_TOKEN` for the floating Ask the Pandit scripture chatbot
  - `HF_MODEL` optional, defaults to `openai/gpt-oss-20b:fastest`; do not use the Together `-Turbo` model name unless you have created a dedicated endpoint for it
  - `HF_EMBEDDING_MODEL` optional, defaults to `sentence-transformers/all-MiniLM-L6-v2`
  - `RESEND_API_KEY` for email notifications when someone signs up for an event or volunteer opportunity
  - `SIGNUP_NOTIFICATION_EMAILS` optional comma-separated recipient list; if omitted, root admin emails from `profiles` are used
  - `SIGNUP_NOTIFICATION_FROM` optional verified sender, for example `GitaLife 312 <hello@yourdomain.com>`
  - `VITE_ELFSIGHT_INSTAGRAM_WIDGET_ID` optional Elfsight Instagram Feed widget ID for showing the live Instagram feed on `/gallery`

The service-role key is used only by the Vercel `/api/invite-user` server route for admin invites. Never prefix it with `VITE_`.

The Ask the Pandit chatbot runs through the Vercel `/api/ask-pandit` server route. That route searches scripture vectors in Supabase and calls the Hugging Face model from the server, so no separate Hugging Face Space or hosted chatbot site is required.

To debug chatbot response time, open the site with `?panditDebug=1`, ask a question, and the chat response will include retrieval and model timing details.

Admin AI drafts run through the Vercel `/api/generate-admin-draft` server route. Root admins can use all hub data; hub admins can only generate drafts for hubs assigned to them.

Signup notification emails run through the Vercel `/api/notifySignup` server route and Resend. Admin audience emails run through `/api/send-admin-email`. Signups still save if Resend is not configured, but no notification email will be sent.

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

## Import Existing Chroma Vectors

The GooglePlugin Chroma database already contains vectorized scripture embeddings. To reuse those exact embeddings in Supabase, first run [supabase/scripture_vectors.sql](./supabase/scripture_vectors.sql), then run:

```powershell
cd C:/Users/vedan/Python/GitaLife_312
$env:SUPABASE_URL="https://your-project-ref.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
python scripts/import-chroma-vectors-to-supabase.py --chroma-path C:/Users/vedan/Python/GooglePlugin/chroma_db
```

The importer copies documents, metadata, and stored Chroma embeddings into `public.scripture_chunks`; it does not regenerate the corpus embeddings.
