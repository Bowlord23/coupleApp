alter table public.notes
  drop constraint if exists notes_couple_id_author_id_key;

create index if not exists notes_couple_created_at_idx
  on public.notes(couple_id, created_at desc);

create or replace function public.save_note(body text) returns void
language plpgsql security definer set search_path = '' as $$
declare cid uuid := public.my_couple_id();
begin
  if cid is null then raise exception 'FORBIDDEN'; end if;
  perform 1 from public.couples where id = cid for update;
  if public.my_couple_id() is distinct from cid then raise exception 'FORBIDDEN'; end if;
  if length(trim(body)) not between 1 and 180 then raise exception 'INVALID_NOTE'; end if;
  if exists(
    select 1 from public.notes
    where couple_id = cid
      and author_id = auth.uid()
      and created_at > now() - interval '10 seconds'
  ) then raise exception 'RATE_LIMIT'; end if;

  insert into public.notes(couple_id, author_id, text)
  values(cid, auth.uid(), trim(body));
end $$;

revoke all on function public.save_note(text) from public, anon;
grant execute on function public.save_note(text) to authenticated;
