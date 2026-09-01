alter table public.hubs alter column campus drop not null;
alter table public.hubs alter column neighborhood drop not null;

alter table public.hubs drop constraint if exists hubs_campus_or_neighborhood_check;
alter table public.hubs
  add constraint hubs_campus_or_neighborhood_check
  check (
    nullif(trim(coalesce(campus, '')), '') is not null
    or nullif(trim(coalesce(neighborhood, '')), '') is not null
  ) not valid;

insert into storage.buckets (id, name, public)
values ('hub-images', 'hub-images', true)
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
