# AGENTS.md

## Project Context

This is a standalone Vite + React application. Keep changes focused on the user's request and preserve existing project conventions.

Start with `README.md` for local setup, environment variables, Supabase setup, and Vercel deployment notes.

## Key Files

- `src/`: frontend application source.
- `src/api/appClient.js`: frontend Supabase client and app data adapter.
- `supabase/schema.sql`: database schema, triggers, and row-level security policies.
- `vite.config.js`: Vite config.
- `.env.local`: local-only environment values; never commit secrets.

## Working Notes

- Use `npm run dev` for local development.
- Run the relevant checks from `package.json` before finishing code changes.
