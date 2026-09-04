create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'user' check (role in ('admin', 'user')),
  assigned_hub_id uuid,
  assigned_hub_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  campus text,
  neighborhood text,
  coordinator_name text,
  coordinator_contact text,
  whatsapp_link text,
  meeting_day text,
  meeting_time text,
  description text,
  image_url text,
  lat numeric,
  lng numeric,
  instagram_handle text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.hubs alter column campus drop not null;
alter table public.hubs alter column neighborhood drop not null;
alter table public.hubs drop constraint if exists hubs_campus_or_neighborhood_check;
alter table public.hubs
  add constraint hubs_campus_or_neighborhood_check
  check (
    nullif(trim(coalesce(campus, '')), '') is not null
    or nullif(trim(coalesce(neighborhood, '')), '') is not null
  ) not valid;

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'profiles'
      and constraint_name = 'profiles_assigned_hub_id_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_assigned_hub_id_fkey
      foreign key (assigned_hub_id) references public.hubs(id) on delete set null;
  end if;
end $$;

create table if not exists public.community_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  type text not null default 'kirtan',
  tags text[] not null default '{}',
  location text,
  campus text,
  hub_id uuid references public.hubs(id) on delete set null,
  event_date timestamptz not null,
  image_url text,
  coordinator text,
  whatsapp_link text,
  capacity numeric,
  signup_count numeric not null default 0,
  needs_volunteers boolean not null default false,
  recurrence_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_signups (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.community_events(id) on delete cascade,
  event_title text,
  name text not null,
  email text not null,
  phone text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hub_contacts (
  id uuid primary key default gen_random_uuid(),
  hub_id uuid not null references public.hubs(id) on delete cascade,
  hub_name text,
  name text not null,
  email text not null,
  phone text not null,
  how_found text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.volunteer_opportunities (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.community_events(id) on delete set null,
  hub_id uuid references public.hubs(id) on delete set null,
  title text not null,
  description text,
  role_details text,
  location text,
  starts_at timestamptz,
  needed_count numeric,
  signup_count numeric not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.volunteer_signups (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.volunteer_opportunities(id) on delete cascade,
  opportunity_title text,
  name text not null,
  email text not null,
  phone text not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_drafts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  draft_type text not null default 'event',
  body text not null,
  prompt text,
  status text not null default 'draft' check (status in ('draft', 'approved', 'used', 'archived')),
  hub_id uuid references public.hubs(id) on delete set null,
  related_event_id uuid references public.community_events(id) on delete set null,
  related_opportunity_id uuid references public.volunteer_opportunities(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.impact_stats (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  value numeric not null,
  unit text,
  icon text,
  sort_order numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.japa_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  rounds numeric not null default 0,
  log_date date not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, log_date)
);

create table if not exists public.verses (
  id uuid primary key default gen_random_uuid(),
  sanskrit text not null,
  transliteration text,
  synonyms text,
  translation text not null,
  purport text,
  chapter numeric,
  verse_ref text,
  verse_number numeric,
  source_url text,
  display_date date,
  is_active boolean not null default true,
  posted_cycle boolean not null default false,
  is_displayed_today boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.verses add column if not exists transliteration text;
alter table public.verses add column if not exists synonyms text;
alter table public.verses add column if not exists verse_ref text;
alter table public.verses add column if not exists source_url text;

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'verses'
      and constraint_name = 'verses_chapter_verse_ref_key'
  ) then
    alter table public.verses
      add constraint verses_chapter_verse_ref_key unique (chapter, verse_ref);
  end if;
end $$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.can_manage_hub(target_hub_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and (
        role = 'admin'
        or assigned_hub_id = target_hub_id
        or target_hub_id = any(assigned_hub_ids)
      )
  );
$$;

create or replace function public.increment_event_signup_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.community_events
  set signup_count = signup_count + 1
  where id = new.event_id;
  return new;
end;
$$;

create or replace function public.increment_volunteer_signup_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.volunteer_opportunities
  set signup_count = coalesce(signup_count, 0) + 1
  where id = new.opportunity_id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.create_profile_for_new_user();

drop trigger if exists event_signups_increment_count on public.event_signups;
create trigger event_signups_increment_count
after insert on public.event_signups
for each row execute function public.increment_event_signup_count();

drop trigger if exists volunteer_signups_increment_count on public.volunteer_signups;
create trigger volunteer_signups_increment_count
after insert on public.volunteer_signups
for each row execute function public.increment_volunteer_signup_count();

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles',
    'hubs',
    'community_events',
    'event_signups',
    'hub_contacts',
    'impact_stats',
    'japa_logs',
    'verses',
    'volunteer_opportunities',
    'volunteer_signups',
    'ai_drafts'
  ]
  loop
    execute format('drop trigger if exists touch_%I_updated_at on public.%I', table_name, table_name);
    execute format('create trigger touch_%I_updated_at before update on public.%I for each row execute function public.touch_updated_at()', table_name, table_name);
  end loop;
end $$;

alter table public.profiles enable row level security;
alter table public.hubs enable row level security;
alter table public.community_events enable row level security;
alter table public.event_signups enable row level security;
alter table public.hub_contacts enable row level security;
alter table public.impact_stats enable row level security;
alter table public.japa_logs enable row level security;
alter table public.verses enable row level security;
alter table public.volunteer_opportunities enable row level security;
alter table public.volunteer_signups enable row level security;
alter table public.ai_drafts enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.hubs, public.community_events, public.impact_stats, public.verses, public.volunteer_opportunities to anon, authenticated;
grant insert on public.event_signups, public.hub_contacts, public.volunteer_signups to anon, authenticated;
grant select, insert, update, delete on public.japa_logs to authenticated;
grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.hubs, public.community_events, public.event_signups, public.hub_contacts, public.impact_stats, public.verses, public.volunteer_opportunities, public.volunteer_signups, public.ai_drafts to authenticated;
grant update on public.profiles to authenticated;

drop policy if exists "Profiles are visible to self and admins" on public.profiles;
create policy "Profiles are visible to self and admins"
on public.profiles for select
using (id = auth.uid() or public.is_admin());

drop policy if exists "Admins can update profiles" on public.profiles;
create policy "Admins can update profiles"
on public.profiles for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Hubs are public" on public.hubs;
create policy "Hubs are public"
on public.hubs for select
using (true);

drop policy if exists "Admins create hubs" on public.hubs;
create policy "Admins create hubs"
on public.hubs for insert
with check (public.is_admin());

drop policy if exists "Admins and assigned users update hubs" on public.hubs;
create policy "Admins and assigned users update hubs"
on public.hubs for update
using (public.can_manage_hub(id))
with check (public.can_manage_hub(id));

drop policy if exists "Admins and assigned users delete hubs" on public.hubs;
create policy "Admins and assigned users delete hubs"
on public.hubs for delete
using (public.can_manage_hub(id));

drop policy if exists "Events are public" on public.community_events;
create policy "Events are public"
on public.community_events for select
using (true);

drop policy if exists "Admins and hub managers create events" on public.community_events;
create policy "Admins and hub managers create events"
on public.community_events for insert
with check (public.can_manage_hub(hub_id));

drop policy if exists "Admins and hub managers update events" on public.community_events;
create policy "Admins and hub managers update events"
on public.community_events for update
using (public.can_manage_hub(hub_id))
with check (public.can_manage_hub(hub_id));

drop policy if exists "Admins and hub managers delete events" on public.community_events;
create policy "Admins and hub managers delete events"
on public.community_events for delete
using (public.can_manage_hub(hub_id));

drop policy if exists "Event signups are public to create" on public.event_signups;
create policy "Event signups are public to create"
on public.event_signups for insert
with check (true);

drop policy if exists "Admins can read event signups" on public.event_signups;
create policy "Admins can read event signups"
on public.event_signups for select
using (
  public.is_admin()
  or exists (
    select 1
    from public.community_events e
    where e.id = event_id and public.can_manage_hub(e.hub_id)
  )
);

drop policy if exists "Hub contacts are public to create" on public.hub_contacts;
create policy "Hub contacts are public to create"
on public.hub_contacts for insert
with check (
  nullif(trim(name), '') is not null
  and nullif(trim(email), '') is not null
  and nullif(trim(phone), '') is not null
);

drop policy if exists "Admins can read hub contacts" on public.hub_contacts;
create policy "Admins can read hub contacts"
on public.hub_contacts for select
using (public.is_admin() or public.can_manage_hub(hub_id));

drop policy if exists "Volunteer opportunities are public" on public.volunteer_opportunities;
create policy "Volunteer opportunities are public"
on public.volunteer_opportunities for select
using (is_active = true or public.is_admin());

drop policy if exists "Admins manage volunteer opportunities" on public.volunteer_opportunities;
create policy "Admins manage volunteer opportunities"
on public.volunteer_opportunities for all
using (
  public.is_admin()
  or public.can_manage_hub(hub_id)
  or exists (
    select 1
    from public.community_events e
    where e.id = event_id and public.can_manage_hub(e.hub_id)
  )
)
with check (
  public.is_admin()
  or public.can_manage_hub(hub_id)
  or exists (
    select 1
    from public.community_events e
    where e.id = event_id and public.can_manage_hub(e.hub_id)
  )
);

drop policy if exists "Volunteer signups are public to create" on public.volunteer_signups;
create policy "Volunteer signups are public to create"
on public.volunteer_signups for insert
with check (true);

drop policy if exists "Admins can read volunteer signups" on public.volunteer_signups;
create policy "Admins can read volunteer signups"
on public.volunteer_signups for select
using (
  public.is_admin()
  or exists (
    select 1
    from public.volunteer_opportunities o
    left join public.community_events e on e.id = o.event_id
    where o.id = opportunity_id
      and (public.can_manage_hub(o.hub_id) or public.can_manage_hub(e.hub_id))
  )
);

drop policy if exists "Admins and hub managers read AI drafts" on public.ai_drafts;
create policy "Admins and hub managers read AI drafts"
on public.ai_drafts for select
using (public.is_admin() or public.can_manage_hub(hub_id));

drop policy if exists "Admins and hub managers create AI drafts" on public.ai_drafts;
create policy "Admins and hub managers create AI drafts"
on public.ai_drafts for insert
with check (public.is_admin() or public.can_manage_hub(hub_id));

drop policy if exists "Admins and hub managers update AI drafts" on public.ai_drafts;
create policy "Admins and hub managers update AI drafts"
on public.ai_drafts for update
using (public.is_admin() or public.can_manage_hub(hub_id))
with check (public.is_admin() or public.can_manage_hub(hub_id));

drop policy if exists "Impact stats are public" on public.impact_stats;
create policy "Impact stats are public"
on public.impact_stats for select
using (true);

drop policy if exists "Admins update impact stats" on public.impact_stats;
create policy "Admins update impact stats"
on public.impact_stats for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Japa logs are private" on public.japa_logs;
create policy "Japa logs are private"
on public.japa_logs for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Verses are public" on public.verses;
create policy "Verses are public"
on public.verses for select
using (true);

drop policy if exists "Admins manage verses" on public.verses;
create policy "Admins manage verses"
on public.verses for all
using (public.is_admin())
with check (public.is_admin());

insert into storage.buckets (id, name, public)
values ('hub-images', 'hub-images', true)
on conflict (id) do update set public = excluded.public;

insert into storage.buckets (id, name, public)
values ('event-images', 'event-images', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Hub images are public" on storage.objects;
create policy "Hub images are public"
on storage.objects for select
using (bucket_id = 'hub-images');

drop policy if exists "Admins upload hub images" on storage.objects;
create policy "Admins upload hub images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'hub-images' and public.is_admin());

drop policy if exists "Admins update hub images" on storage.objects;
create policy "Admins update hub images"
on storage.objects for update
to authenticated
using (bucket_id = 'hub-images' and public.is_admin())
with check (bucket_id = 'hub-images' and public.is_admin());

drop policy if exists "Admins delete hub images" on storage.objects;
create policy "Admins delete hub images"
on storage.objects for delete
to authenticated
using (bucket_id = 'hub-images' and public.is_admin());

drop policy if exists "Event images are public" on storage.objects;
create policy "Event images are public"
on storage.objects for select
using (bucket_id = 'event-images');

drop policy if exists "Admins and hub managers upload event images" on storage.objects;
create policy "Admins and hub managers upload event images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'event-images'
  and exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and (role = 'admin' or assigned_hub_id is not null or cardinality(assigned_hub_ids) > 0)
  )
);

drop policy if exists "Admins and hub managers update event images" on storage.objects;
create policy "Admins and hub managers update event images"
on storage.objects for update
to authenticated
using (
  bucket_id = 'event-images'
  and exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and (role = 'admin' or assigned_hub_id is not null or cardinality(assigned_hub_ids) > 0)
  )
)
with check (
  bucket_id = 'event-images'
  and exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and (role = 'admin' or assigned_hub_id is not null or cardinality(assigned_hub_ids) > 0)
  )
);
