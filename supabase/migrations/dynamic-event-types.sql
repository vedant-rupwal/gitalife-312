do $$
declare
  constraint_name text;
begin
  select conname
  into constraint_name
  from pg_constraint
  where conrelid = 'public.community_events'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%type%'
    and pg_get_constraintdef(oid) like '%kirtan%'
  limit 1;

  if constraint_name is not null then
    execute format('alter table public.community_events drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.community_events
  alter column type set default 'kirtan';
