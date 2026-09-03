create extension if not exists vector;

create table if not exists public.scripture_chunks (
  id uuid primary key default gen_random_uuid(),
  source_collection text not null,
  source_id text not null,
  book_title text,
  source_ref text,
  chapter_num text,
  verse_num text,
  paragraph text,
  content_type text,
  text_content text not null,
  source_url text,
  metadata jsonb not null default '{}'::jsonb,
  embedding vector(384) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_collection, source_id)
);

create index if not exists scripture_chunks_embedding_idx
on public.scripture_chunks
using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

create index if not exists scripture_chunks_book_title_idx
on public.scripture_chunks (book_title);

create or replace function public.match_scripture_chunks(
  query_embedding vector(384),
  match_count int default 6,
  book_filter text[] default null
)
returns table (
  id uuid,
  source_collection text,
  source_id text,
  book_title text,
  source_ref text,
  chapter_num text,
  verse_num text,
  paragraph text,
  content_type text,
  text_content text,
  source_url text,
  metadata jsonb,
  similarity double precision
)
language sql
stable
as $$
  select
    scripture_chunks.id,
    scripture_chunks.source_collection,
    scripture_chunks.source_id,
    scripture_chunks.book_title,
    scripture_chunks.source_ref,
    scripture_chunks.chapter_num,
    scripture_chunks.verse_num,
    scripture_chunks.paragraph,
    scripture_chunks.content_type,
    scripture_chunks.text_content,
    scripture_chunks.source_url,
    scripture_chunks.metadata,
    1 - (scripture_chunks.embedding <=> query_embedding) as similarity
  from public.scripture_chunks
  where
    book_filter is null
    or cardinality(book_filter) = 0
    or scripture_chunks.book_title = any(book_filter)
    or scripture_chunks.source_collection = any(book_filter)
  order by scripture_chunks.embedding <=> query_embedding
  limit least(match_count, 20);
$$;

alter table public.scripture_chunks enable row level security;

grant select on public.scripture_chunks to anon, authenticated;
grant select, insert, update, delete on public.scripture_chunks to authenticated;
grant execute on function public.match_scripture_chunks(vector(384), int, text[]) to anon, authenticated;

drop policy if exists "Scripture chunks are public" on public.scripture_chunks;
create policy "Scripture chunks are public"
on public.scripture_chunks for select
using (true);

drop policy if exists "Admins manage scripture chunks" on public.scripture_chunks;
create policy "Admins manage scripture chunks"
on public.scripture_chunks for all
using (public.is_admin())
with check (public.is_admin());
