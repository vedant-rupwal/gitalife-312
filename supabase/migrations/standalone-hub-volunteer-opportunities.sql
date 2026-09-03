alter table public.volunteer_opportunities
  add column if not exists hub_id uuid references public.hubs(id) on delete set null;

update public.volunteer_opportunities o
set hub_id = e.hub_id
from public.community_events e
where o.event_id = e.id
  and o.hub_id is null;

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
