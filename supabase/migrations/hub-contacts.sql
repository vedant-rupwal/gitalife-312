create extension if not exists "pgcrypto";

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

update public.hub_contacts
set phone = ''
where phone is null;

alter table public.hub_contacts
alter column phone set not null;

drop trigger if exists touch_hub_contacts_updated_at on public.hub_contacts;
create trigger touch_hub_contacts_updated_at
before update on public.hub_contacts
for each row execute function public.touch_updated_at();

alter table public.hub_contacts enable row level security;

grant insert on public.hub_contacts to anon, authenticated;
grant select, insert, update, delete on public.hub_contacts to authenticated;

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
