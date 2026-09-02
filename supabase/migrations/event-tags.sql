alter table public.community_events
  add column if not exists tags text[] not null default '{}';
