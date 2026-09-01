insert into storage.buckets (id, name, public)
values ('event-images', 'event-images', true)
on conflict (id) do update set public = excluded.public;

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
