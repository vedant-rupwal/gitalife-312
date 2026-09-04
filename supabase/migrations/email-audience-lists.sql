create table if not exists public.email_audience_lists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  emails text[] not null default '{}',
  hub_id uuid references public.hubs(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists touch_email_audience_lists_updated_at on public.email_audience_lists;
create trigger touch_email_audience_lists_updated_at
before update on public.email_audience_lists
for each row execute function public.touch_updated_at();

alter table public.email_audience_lists enable row level security;

grant select, insert, update, delete on public.email_audience_lists to authenticated;

drop policy if exists "Admins and hub managers read email audience lists" on public.email_audience_lists;
create policy "Admins and hub managers read email audience lists"
on public.email_audience_lists for select
using (public.is_admin() or public.can_manage_hub(hub_id));

drop policy if exists "Admins and hub managers create email audience lists" on public.email_audience_lists;
create policy "Admins and hub managers create email audience lists"
on public.email_audience_lists for insert
with check (public.is_admin() or public.can_manage_hub(hub_id));

drop policy if exists "Admins and hub managers update email audience lists" on public.email_audience_lists;
create policy "Admins and hub managers update email audience lists"
on public.email_audience_lists for update
using (public.is_admin() or public.can_manage_hub(hub_id))
with check (public.is_admin() or public.can_manage_hub(hub_id));

drop policy if exists "Admins and hub managers delete email audience lists" on public.email_audience_lists;
create policy "Admins and hub managers delete email audience lists"
on public.email_audience_lists for delete
using (public.is_admin() or public.can_manage_hub(hub_id));
