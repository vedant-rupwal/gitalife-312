alter table public.community_events
  add column if not exists needs_volunteers boolean not null default false;

create table if not exists public.volunteer_opportunities (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.community_events(id) on delete set null,
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

drop trigger if exists volunteer_signups_increment_count on public.volunteer_signups;
create trigger volunteer_signups_increment_count
after insert on public.volunteer_signups
for each row execute function public.increment_volunteer_signup_count();

drop trigger if exists touch_volunteer_opportunities_updated_at on public.volunteer_opportunities;
create trigger touch_volunteer_opportunities_updated_at
before update on public.volunteer_opportunities
for each row execute function public.touch_updated_at();

drop trigger if exists touch_volunteer_signups_updated_at on public.volunteer_signups;
create trigger touch_volunteer_signups_updated_at
before update on public.volunteer_signups
for each row execute function public.touch_updated_at();

alter table public.volunteer_opportunities enable row level security;
alter table public.volunteer_signups enable row level security;

grant select on public.volunteer_opportunities to anon, authenticated;
grant insert on public.volunteer_signups to anon, authenticated;
grant select, insert, update, delete on public.volunteer_opportunities, public.volunteer_signups to authenticated;

drop policy if exists "Volunteer opportunities are public" on public.volunteer_opportunities;
create policy "Volunteer opportunities are public"
on public.volunteer_opportunities for select
using (is_active = true or public.is_admin());

drop policy if exists "Admins manage volunteer opportunities" on public.volunteer_opportunities;
create policy "Admins manage volunteer opportunities"
on public.volunteer_opportunities for all
using (
  public.is_admin()
  or exists (
    select 1
    from public.community_events e
    where e.id = event_id and public.can_manage_hub(e.hub_id)
  )
)
with check (
  public.is_admin()
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
    where o.id = opportunity_id and public.can_manage_hub(e.hub_id)
  )
);
