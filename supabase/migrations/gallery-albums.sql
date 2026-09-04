alter table public.gallery_photos add column if not exists album_id uuid not null default gen_random_uuid();
alter table public.gallery_photos add column if not exists is_cover boolean not null default false;

create index if not exists gallery_photos_album_id_idx on public.gallery_photos(album_id);
