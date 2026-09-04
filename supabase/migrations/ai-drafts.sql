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

drop trigger if exists touch_ai_drafts_updated_at on public.ai_drafts;
create trigger touch_ai_drafts_updated_at
before update on public.ai_drafts
for each row execute function public.touch_updated_at();

alter table public.ai_drafts enable row level security;

grant select, insert, update, delete on public.ai_drafts to authenticated;

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
