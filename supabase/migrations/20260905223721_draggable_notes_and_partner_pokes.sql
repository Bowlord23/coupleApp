alter table public.notes
  add column position_x real not null default ((0.04 + random() * 0.68)::real),
  add column position_y real not null default ((0.03 + random() * 0.58)::real),
  add column archived_at timestamptz;

alter table public.notes
  add constraint notes_position_x_check check(position_x between 0 and 1),
  add constraint notes_position_y_check check(position_y between 0 and 1);

create index notes_active_couple_idx
  on public.notes(couple_id, created_at desc)
  where archived_at is null;

create table private.partner_pokes (
  id uuid primary key,
  couple_id uuid not null references public.couples(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table private.partner_pokes enable row level security;
create index partner_pokes_sender_idx
  on private.partner_pokes(sender_id, created_at desc);

create function public.move_note(target_note uuid, x real, y real) returns void
language plpgsql security definer set search_path = '' as $$
declare cid uuid := public.my_couple_id();
begin
  if cid is null or x is null or y is null or x not between 0 and 1 or y not between 0 and 1
    then raise exception 'INVALID_POSITION';
  end if;
  update public.notes
  set position_x = x, position_y = y
  where id = target_note and couple_id = cid and archived_at is null;
  if not found then raise exception 'FORBIDDEN'; end if;
end $$;

create function public.archive_note(target_note uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare cid uuid := public.my_couple_id();
begin
  if cid is null then raise exception 'FORBIDDEN'; end if;
  update public.notes
  set archived_at = coalesce(archived_at, now())
  where id = target_note and couple_id = cid;
  if not found then raise exception 'FORBIDDEN'; end if;
end $$;

create function public.poke_partner(request_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  cid uuid := public.my_couple_id();
  recipient uuid;
begin
  if uid is null or cid is null then raise exception 'FORBIDDEN'; end if;
  perform 1 from public.couples where id = cid for update;
  if public.my_couple_id() is distinct from cid then raise exception 'FORBIDDEN'; end if;

  select recipient_id into recipient
  from private.partner_pokes
  where id = request_id and sender_id = uid;
  if recipient is not null then return recipient; end if;

  select user_id into recipient
  from public.couple_members
  where couple_id = cid and user_id <> uid;
  if recipient is null then raise exception 'NO_PARTNER'; end if;

  if exists(
    select 1 from private.partner_pokes
    where sender_id = uid and created_at > now() - interval '30 seconds'
  ) then raise exception 'POKE_RATE_LIMIT'; end if;

  insert into private.partner_pokes(id, couple_id, sender_id, recipient_id)
  values(request_id, cid, uid, recipient);
  delete from private.partner_pokes where created_at < now() - interval '7 days';

  perform realtime.send(
    jsonb_build_object('user_id', uid, 'id', request_id, 'at', now()),
    'attention',
    'couple:' || cid::text || ':' || (select channel_version::text from public.couples where id = cid),
    true
  );
  return recipient;
end $$;

revoke execute on function public.move_note(uuid, real, real),
  public.archive_note(uuid), public.poke_partner(uuid) from public, anon;
grant execute on function public.move_note(uuid, real, real),
  public.archive_note(uuid), public.poke_partner(uuid) to authenticated;
revoke all on table private.partner_pokes from public, anon, authenticated;
grant select on public.push_tokens, public.couple_members to service_role;
