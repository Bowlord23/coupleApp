begin;
create schema if not exists private;
revoke all on schema private from public;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Партнёр' check (length(trim(display_name)) between 1 and 40),
  haptics boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.couples (
  id uuid primary key default gen_random_uuid(),
  invite_code text unique,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  connected_at timestamptz,
  channel_version uuid not null default gen_random_uuid()
);
create table public.couple_members (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  display_name text not null,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz
);
create index members_couple_idx on public.couple_members(couple_id);
create table public.plants (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null unique references public.couples(id) on delete cascade,
  name text not null default 'Наше растение' check(length(trim(name)) between 1 and 40),
  growth_points integer not null default 0 check(growth_points >= 0),
  stage integer not null default 0 check(stage between 0 and 5),
  water_level integer not null default 0 check(water_level between 0 and 100),
  last_watered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.plant_actions (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  plant_id uuid not null references public.plants(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  action_type text not null check(action_type in ('water','touch','shared')),
  growth_delta integer not null,
  created_at timestamptz not null default now()
);
create index actions_cooldown_idx on public.plant_actions(plant_id, user_id, action_type, created_at desc);
create index actions_couple_idx on public.plant_actions(couple_id, created_at desc);
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  text text not null check(length(trim(text)) between 1 and 180),
  created_at timestamptz not null default now(),
  unique(couple_id,author_id)
);
create table public.memories (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  type text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index memories_couple_idx on public.memories(couple_id, created_at desc);
create table public.push_tokens (
  token text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index push_user_idx on public.push_tokens(user_id);
create table private.invite_attempts (user_id uuid primary key references auth.users(id) on delete cascade, attempted_at timestamptz not null);
create table private.touch_state (
  plant_id uuid not null references public.plants(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  touched_at timestamptz not null,
  consumed boolean not null default false,
  primary key(plant_id,user_id)
);
create table private.action_receipts (
  id uuid primary key, user_id uuid not null references public.profiles(id) on delete cascade,
  plant_id uuid not null references public.plants(id) on delete cascade,
  created_at timestamptz not null default now()
);

create function private.on_signup() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id) values(new.id);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.on_signup();
insert into public.profiles(id) select id from auth.users on conflict(id) do nothing;

create function public.my_couple_id() returns uuid language sql stable security definer set search_path = '' as $$
  select couple_id from public.couple_members where user_id = (select auth.uid())
$$;
create function public.growth_config() returns jsonb language sql immutable set search_path = '' as $$
  select '{"water":5,"touch":1,"shared":8,"water_seconds":21600,"touch_seconds":3,"shared_seconds":60,"window_seconds":10,"stages":[0,10,40,100,200,350]}'::jsonb
$$;
create function public.plant_stage(points integer) returns integer language sql immutable set search_path = '' as $$
  select greatest(0, count(*)::integer - 1) from jsonb_array_elements(public.growth_config()->'stages') v where points >= v::text::integer
$$;

alter table public.profiles enable row level security;
alter table public.couples enable row level security;
alter table public.couple_members enable row level security;
alter table public.plants enable row level security;
alter table public.plant_actions enable row level security;
alter table public.notes enable row level security;
alter table public.memories enable row level security;
alter table public.push_tokens enable row level security;
create policy own_profile on public.profiles for select to authenticated using(id = (select auth.uid()));
create policy own_couple on public.couples for select to authenticated using(id = (select public.my_couple_id()));
create policy own_members on public.couple_members for select to authenticated using(couple_id = (select public.my_couple_id()));
create policy own_plant on public.plants for select to authenticated using(couple_id = (select public.my_couple_id()));
create policy own_actions on public.plant_actions for select to authenticated using(couple_id = (select public.my_couple_id()));
create policy own_notes on public.notes for select to authenticated using(couple_id = (select public.my_couple_id()));
create policy own_memories on public.memories for select to authenticated using(couple_id = (select public.my_couple_id()));
create policy own_push on public.push_tokens for all to authenticated using(user_id = (select auth.uid())) with check(user_id = (select auth.uid()));
revoke all on public.profiles, public.couples, public.couple_members, public.plants, public.plant_actions, public.notes, public.memories, public.push_tokens from anon, authenticated;
grant select on public.profiles, public.couples, public.couple_members, public.plants, public.plant_actions, public.notes, public.memories to authenticated;
grant select, insert, update, delete on public.push_tokens to authenticated;

create function public.create_couple() returns uuid language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); cid uuid; invite text;
begin
  if uid is null then raise exception 'FORBIDDEN'; end if;
  perform 1 from public.profiles where id=uid for update;
  if public.my_couple_id() is not null then raise exception 'ALREADY_MEMBER'; end if;
  loop
    invite := upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
    begin
      insert into public.couples(invite_code,created_by) values(invite,uid) returning id into cid;
      exit;
    exception when unique_violation then null;
    end;
  end loop;
  insert into public.couple_members(user_id,couple_id,display_name) select uid,cid,display_name from public.profiles where id=uid;
  insert into public.plants(couple_id) values(cid);
  insert into public.memories(couple_id,type) values(cid,'planted');
  return cid;
end $$;

-- Invalid attempts return NULL, so the throttling write commits instead of rolling back.
create function public.join_couple(code text) returns uuid language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); c public.couples; last_attempt timestamptz;
begin
  if uid is null then raise exception 'FORBIDDEN'; end if;
  perform 1 from public.profiles where id=uid for update;
  select * into c from public.couples where invite_code=upper(trim(code)) for update;
  if c.created_by=uid then raise exception 'OWN_INVITE'; end if;
  if public.my_couple_id() is not null then raise exception 'ALREADY_MEMBER'; end if;
  select attempted_at into last_attempt from private.invite_attempts where user_id=uid;
  if last_attempt > now()-interval '5 seconds' then raise exception 'RATE_LIMIT'; end if;
  insert into private.invite_attempts values(uid,now()) on conflict(user_id) do update set attempted_at=now();
  if upper(trim(code)) !~ '^[A-F0-9]{8}$' or c.id is null then return null; end if;
  if (select count(*) from public.couple_members where couple_id=c.id)>=2 then return null; end if;
  insert into public.couple_members(user_id,couple_id,display_name) select uid,c.id,display_name from public.profiles where id=uid;
  update public.couples set invite_code=null,connected_at=now() where id=c.id;
  insert into public.memories(couple_id,type) values(c.id,'connected');
  return c.id;
end $$;

create function public.perform_action(target_plant uuid, kind text, request_id uuid) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid(); p public.plants; cfg jsonb := public.growth_config();
  last_action timestamptz; delta integer; shared boolean := false; partner uuid; cid uuid;
begin
  cid := public.my_couple_id();
  if uid is null or cid is null or kind not in ('water','touch') or request_id is null then raise exception 'FORBIDDEN'; end if;
  -- Same lock order as leave_couple; membership is rechecked after acquiring the lock.
  perform 1 from public.couples where id=cid for update;
  if public.my_couple_id() is distinct from cid then raise exception 'FORBIDDEN'; end if;
  select * into p from public.plants where id=target_plant and couple_id=cid for update;
  if p.id is null then raise exception 'FORBIDDEN'; end if;
  if exists(select 1 from private.action_receipts where id=request_id and user_id=uid and plant_id=p.id) then
    return jsonb_build_object('shared',false,'duplicate',true);
  end if;
  if kind='water' then
    select max(created_at) into last_action from public.plant_actions where plant_id=p.id and user_id=uid and action_type='water';
  else
    select touched_at into last_action from private.touch_state where plant_id=p.id and user_id=uid;
  end if;
  if last_action is not null and now()-last_action < make_interval(secs => (cfg->>(kind||'_seconds'))::integer) then raise exception 'COOLDOWN'; end if;
  delta := (cfg->>kind)::integer;
  if kind='touch' then
    select user_id into partner from private.touch_state where plant_id=p.id and user_id<>uid and not consumed
      and touched_at>=now()-make_interval(secs => (cfg->>'window_seconds')::integer);
    shared := partner is not null and not exists(select 1 from public.plant_actions where plant_id=p.id and action_type='shared' and created_at>now()-make_interval(secs => (cfg->>'shared_seconds')::integer));
    insert into private.touch_state values(p.id,uid,now(),shared) on conflict(plant_id,user_id) do update set touched_at=now(),consumed=shared;
    if shared then
      update private.touch_state set consumed=true where plant_id=p.id;
      delta := delta + (cfg->>'shared')::integer;
      insert into public.plant_actions(couple_id,plant_id,user_id,action_type,growth_delta) values(cid,p.id,uid,'shared',(cfg->>'shared')::integer);
      insert into public.memories(couple_id,type) values(cid,'shared');
    end if;
  else
    insert into public.plant_actions(id,couple_id,plant_id,user_id,action_type,growth_delta) values(request_id,cid,p.id,uid,kind,delta);
  end if;
  insert into private.action_receipts values(request_id,uid,p.id,now());
  delete from private.action_receipts where plant_id=p.id and created_at<now()-interval '1 day';
  update public.plants set growth_points=growth_points+delta,stage=public.plant_stage(growth_points+delta),
    water_level=case when kind='water' then least(100,water_level+20) else water_level end,
    last_watered_at=case when kind='water' then now() else last_watered_at end,updated_at=now() where id=p.id;
  if public.plant_stage(p.growth_points+delta)>p.stage then
    insert into public.memories(couple_id,type,metadata) values(cid,'stage',jsonb_build_object('stage',public.plant_stage(p.growth_points+delta)));
  end if;
  -- Only the server sends touch broadcasts. Clients may publish presence, not forged touches.
  perform realtime.send(jsonb_build_object('user_id',uid,'kind',kind,'shared',shared,'id',request_id,'at',now()), 'interaction',
    'couple:'||cid::text||':'||(select channel_version::text from public.couples where id=cid),true);
  return jsonb_build_object('shared',shared,'duplicate',false);
end $$;

create function public.save_note(body text) returns void language plpgsql security definer set search_path = '' as $$
declare cid uuid := public.my_couple_id();
begin
  if cid is null then raise exception 'FORBIDDEN'; end if;
  perform 1 from public.couples where id=cid for update;
  if public.my_couple_id() is distinct from cid then raise exception 'FORBIDDEN'; end if;
  if length(trim(body)) not between 1 and 180 then raise exception 'INVALID_NOTE'; end if;
  if exists(select 1 from public.notes where couple_id=cid and author_id=auth.uid() and created_at>now()-interval '10 seconds') then raise exception 'RATE_LIMIT'; end if;
  insert into public.notes(couple_id,author_id,text) values(cid,auth.uid(),trim(body))
    on conflict(couple_id,author_id) do update set text=excluded.text,created_at=now();
end $$;
create function public.update_profile(new_name text, enable_haptics boolean) returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'FORBIDDEN'; end if;
  if length(trim(new_name)) not between 1 and 40 then raise exception 'INVALID_NAME'; end if;
  update public.profiles set display_name=trim(new_name),haptics=enable_haptics where id=auth.uid();
  update public.couple_members set display_name=trim(new_name) where user_id=auth.uid();
end $$;
create function public.rename_plant(new_name text) returns void language plpgsql security definer set search_path = '' as $$
begin
  if length(trim(new_name)) not between 1 and 40 then raise exception 'INVALID_NAME'; end if;
  update public.plants set name=trim(new_name),updated_at=now() where couple_id=public.my_couple_id();
  if not found then raise exception 'FORBIDDEN'; end if;
end $$;
create function public.mark_seen() returns void language sql security definer set search_path = '' as $$
  update public.couple_members set last_seen_at=now() where user_id=auth.uid() and (last_seen_at is null or last_seen_at<now()-interval '1 minute')
$$;
create function public.leave_couple() returns void language plpgsql security definer set search_path = '' as $$
declare cid uuid := public.my_couple_id();
begin
  if cid is null then return; end if;
  perform 1 from public.couples where id=cid for update;
  delete from public.couple_members where user_id=auth.uid() and couple_id=cid;
  delete from public.notes where author_id=auth.uid() and couple_id=cid;
  delete from private.touch_state where user_id=auth.uid();
  -- Retire the invite and rotate the topic: already-authorized sockets cannot receive future events.
  update public.couples set invite_code=null,channel_version=gen_random_uuid() where id=cid;
  if not exists(select 1 from public.couple_members where couple_id=cid) then delete from public.couples where id=cid; end if;
end $$;
create function public.delete_own_account() returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'FORBIDDEN'; end if;
  perform public.leave_couple();
  delete from auth.users where id=auth.uid();
end $$;

create policy couple_realtime_read on realtime.messages for select to authenticated using (
  extension in ('presence','broadcast') and exists(select 1 from public.couples c where c.id=public.my_couple_id() and realtime.topic()='couple:'||c.id::text||':'||c.channel_version::text)
);
create policy couple_realtime_presence on realtime.messages for insert to authenticated with check (
  extension='presence' and exists(select 1 from public.couples c where c.id=public.my_couple_id() and realtime.topic()='couple:'||c.id::text||':'||c.channel_version::text)
);

revoke execute on all functions in schema private from public, anon, authenticated;
revoke execute on function public.my_couple_id(), public.growth_config(), public.plant_stage(integer), public.create_couple(), public.join_couple(text), public.perform_action(uuid,text,uuid), public.save_note(text), public.update_profile(text,boolean), public.rename_plant(text), public.mark_seen(), public.leave_couple(), public.delete_own_account() from public,anon;
grant execute on function public.my_couple_id(), public.growth_config(), public.plant_stage(integer), public.create_couple(), public.join_couple(text), public.perform_action(uuid,text,uuid), public.save_note(text), public.update_profile(text,boolean), public.rename_plant(text), public.mark_seen(), public.leave_couple(), public.delete_own_account() to authenticated;
alter publication supabase_realtime add table public.plants, public.couples, public.couple_members, public.notes, public.memories;
commit;
