create table if not exists public.gallery_photos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  caption text,
  image_url text not null,
  album_id uuid not null default gen_random_uuid(),
  is_cover boolean not null default false,
  hub_id uuid references public.hubs(id) on delete set null,
  event_id uuid references public.community_events(id) on delete set null,
  is_featured boolean not null default false,
  sort_order numeric not null default 0,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.gallery_photos add column if not exists album_id uuid not null default gen_random_uuid();
alter table public.gallery_photos add column if not exists is_cover boolean not null default false;
create index if not exists gallery_photos_album_id_idx on public.gallery_photos(album_id);

drop trigger if exists touch_gallery_photos_updated_at on public.gallery_photos;
create trigger touch_gallery_photos_updated_at
before update on public.gallery_photos
for each row execute function public.touch_updated_at();

alter table public.gallery_photos enable row level security;

grant select on public.gallery_photos to anon, authenticated;
grant insert, update, delete on public.gallery_photos to authenticated;

drop policy if exists "Gallery photos are public" on public.gallery_photos;
create policy "Gallery photos are public"
on public.gallery_photos for select
using (true);

drop policy if exists "Admins and hub managers create gallery photos" on public.gallery_photos;
create policy "Admins and hub managers create gallery photos"
on public.gallery_photos for insert
with check (public.is_admin() or public.can_manage_hub(hub_id));

drop policy if exists "Admins and hub managers update gallery photos" on public.gallery_photos;
create policy "Admins and hub managers update gallery photos"
on public.gallery_photos for update
using (public.is_admin() or public.can_manage_hub(hub_id))
with check (public.is_admin() or public.can_manage_hub(hub_id));

drop policy if exists "Admins and hub managers delete gallery photos" on public.gallery_photos;
create policy "Admins and hub managers delete gallery photos"
on public.gallery_photos for delete
using (public.is_admin() or public.can_manage_hub(hub_id));

insert into storage.buckets (id, name, public)
values ('gallery-images', 'gallery-images', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Gallery images are public" on storage.objects;
create policy "Gallery images are public"
on storage.objects for select
using (bucket_id = 'gallery-images');

drop policy if exists "Admins and hub managers upload gallery images" on storage.objects;
create policy "Admins and hub managers upload gallery images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'gallery-images'
  and exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and (role = 'admin' or assigned_hub_id is not null or cardinality(assigned_hub_ids) > 0)
  )
);

drop policy if exists "Admins and hub managers update gallery images" on storage.objects;
create policy "Admins and hub managers update gallery images"
on storage.objects for update
to authenticated
using (
  bucket_id = 'gallery-images'
  and exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and (role = 'admin' or assigned_hub_id is not null or cardinality(assigned_hub_ids) > 0)
  )
)
with check (
  bucket_id = 'gallery-images'
  and exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and (role = 'admin' or assigned_hub_id is not null or cardinality(assigned_hub_ids) > 0)
  )
);

drop policy if exists "Admins and hub managers delete gallery images" on storage.objects;
create policy "Admins and hub managers delete gallery images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'gallery-images'
  and exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and (role = 'admin' or assigned_hub_id is not null or cardinality(assigned_hub_ids) > 0)
  )
);
