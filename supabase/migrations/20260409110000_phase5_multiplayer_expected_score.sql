-- Phase 5 follow-up: persist per-participant expected score and sync it into round player state.

alter table public.round_participants
  add column if not exists expected_score_18 integer;

update public.round_participants
set expected_score_18 = 90
where expected_score_18 is null;

alter table public.round_participants
  alter column expected_score_18 set default 90;

alter table public.round_participants
  alter column expected_score_18 set not null;

alter table public.round_participants
  drop constraint if exists round_participants_expected_score_18_chk;

alter table public.round_participants
  add constraint round_participants_expected_score_18_chk
  check (expected_score_18 between 54 and 180);

create or replace function public.normalize_expected_score_18(p_value integer)
returns integer
language plpgsql
immutable
as $$
begin
  if p_value is null then
    return 90;
  end if;

  return greatest(54, least(180, p_value));
end;
$$;

create or replace function public.sync_participant_profile_into_round_state(
  p_round_id uuid,
  p_participant_id uuid
)
returns table(
  revision bigint,
  state_json jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_round public.rounds%rowtype;
  v_participant record;
  v_players jsonb;
  v_next_players jsonb := '[]'::jsonb;
  v_player jsonb;
  v_player_id text;
  v_existing_name text;
  v_existing_expected_raw text;
  v_existing_expected integer;
  v_next_player jsonb;
  v_player_found boolean := false;
  v_profile_changed boolean := false;
  v_next_state jsonb;
begin
  select *
  into v_round
  from public.rounds
  where id = p_round_id
  for update;

  if not found then
    raise exception 'ROUND_NOT_FOUND';
  end if;

  select
    rp.id,
    rp.display_name,
    rp.expected_score_18,
    rp.player_id,
    rp.left_at
  into v_participant
  from public.round_participants rp
  where rp.id = p_participant_id
    and rp.round_id = p_round_id;

  if not found then
    return query select v_round.revision, v_round.state_json;
    return;
  end if;

  if v_participant.left_at is not null or v_participant.player_id is null then
    return query select v_round.revision, v_round.state_json;
    return;
  end if;

  v_players := coalesce(v_round.state_json->'players', '[]'::jsonb);
  if jsonb_typeof(v_players) <> 'array' then
    return query select v_round.revision, v_round.state_json;
    return;
  end if;

  for v_player in
    select value
    from jsonb_array_elements(v_players)
  loop
    if jsonb_typeof(v_player) <> 'object' then
      v_next_players := v_next_players || jsonb_build_array(v_player);
      continue;
    end if;

    v_player_id := btrim(coalesce(v_player->>'id', ''));
    if v_player_id <> v_participant.player_id then
      v_next_players := v_next_players || jsonb_build_array(v_player);
      continue;
    end if;

    v_player_found := true;
    v_next_player := v_player;

    v_existing_name := coalesce(v_player->>'name', '');
    if v_existing_name is distinct from v_participant.display_name then
      v_next_player := jsonb_set(v_next_player, '{name}', to_jsonb(v_participant.display_name), true);
      v_profile_changed := true;
    end if;

    v_existing_expected_raw := btrim(coalesce(v_player->>'expectedScore18', ''));
    if v_existing_expected_raw ~ '^-?\\d+$' then
      v_existing_expected := v_existing_expected_raw::integer;
    else
      v_existing_expected := null;
    end if;

    if v_existing_expected is distinct from v_participant.expected_score_18 then
      v_next_player := jsonb_set(v_next_player, '{expectedScore18}', to_jsonb(v_participant.expected_score_18), true);
      v_profile_changed := true;
    end if;

    v_next_players := v_next_players || jsonb_build_array(v_next_player);
  end loop;

  if not v_player_found or not v_profile_changed then
    return query select v_round.revision, v_round.state_json;
    return;
  end if;

  v_next_state := jsonb_set(v_round.state_json, '{players}', v_next_players, true);

  update public.rounds
  set state_json = v_next_state,
      revision = revision + 1,
      last_activity_at = now()
  where id = p_round_id
  returning public.rounds.revision, public.rounds.state_json
  into revision, state_json;

  return;
end;
$$;

drop function if exists public.create_round(text, integer, jsonb);
drop function if exists public.create_round(text, jsonb);
create or replace function public.create_round(
  p_display_name text,
  p_expected_score_18 integer default 90,
  p_initial_state jsonb default '{}'::jsonb
)
returns table(
  round_id uuid,
  room_code text,
  expires_at timestamptz,
  participant_id uuid,
  participant_player_id text,
  participant_expected_score_18 integer,
  revision bigint,
  state_json jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_display_name text := btrim(coalesce(p_display_name, ''));
  v_expected_score_18 integer := public.normalize_expected_score_18(p_expected_score_18);
  v_initial_state jsonb := coalesce(p_initial_state, '{}'::jsonb);
  v_round_id uuid;
  v_room_code text;
  v_expires_at timestamptz := now() + interval '9 hours';
  v_participant_id uuid;
  v_participant_player_id text;
  v_participant_expected_score_18 integer;
  v_round_revision bigint;
  v_round_state_json jsonb;
  v_attempts integer := 0;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if char_length(v_display_name) < 1 or char_length(v_display_name) > 40 then
    raise exception 'INVALID_DISPLAY_NAME';
  end if;

  if pg_column_size(v_initial_state) > 262144 then
    raise exception 'STATE_TOO_LARGE';
  end if;

  loop
    v_attempts := v_attempts + 1;
    v_room_code := public.generate_room_code();
    begin
      insert into public.rounds (
        room_code,
        created_by,
        status,
        state_json,
        revision,
        expires_at,
        last_activity_at
      )
      values (
        v_room_code,
        v_user_id,
        'lobby',
        v_initial_state,
        0,
        v_expires_at,
        now()
      )
      returning id into v_round_id;
      exit;
    exception
      when unique_violation then
        if v_attempts >= 8 then
          raise exception 'ROOM_CODE_GENERATION_FAILED';
        end if;
    end;
  end loop;

  insert into public.round_participants (
    round_id,
    user_id,
    display_name,
    expected_score_18,
    is_host,
    last_seen_at
  )
  values (
    v_round_id,
    v_user_id,
    v_display_name,
    v_expected_score_18,
    true,
    now()
  )
  returning id into v_participant_id;

  perform public.reconcile_round_participant_player_ids(v_round_id, v_initial_state);

  select player_id, expected_score_18
  into v_participant_player_id, v_participant_expected_score_18
  from public.round_participants
  where id = v_participant_id;

  select synced.revision, synced.state_json
  into v_round_revision, v_round_state_json
  from public.sync_participant_profile_into_round_state(v_round_id, v_participant_id) synced;

  return query
  select
    v_round_id,
    v_room_code,
    v_expires_at,
    v_participant_id,
    v_participant_player_id,
    coalesce(v_participant_expected_score_18, v_expected_score_18),
    coalesce(v_round_revision, 0::bigint),
    coalesce(v_round_state_json, v_initial_state);
end;
$$;

drop function if exists public.join_round(text, text, integer);
drop function if exists public.join_round(text, text);
create or replace function public.join_round(
  p_room_code text,
  p_display_name text,
  p_expected_score_18 integer default 90
)
returns table(
  round_id uuid,
  room_code text,
  expires_at timestamptz,
  participant_id uuid,
  participant_player_id text,
  participant_expected_score_18 integer,
  is_host boolean,
  revision bigint,
  state_json jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_code text := public.normalize_room_code(p_room_code);
  v_display_name text := btrim(coalesce(p_display_name, ''));
  v_expected_score_18 integer := public.normalize_expected_score_18(p_expected_score_18);
  v_round public.rounds%rowtype;
  v_participant_id uuid;
  v_participant_player_id text;
  v_participant_expected_score_18 integer;
  v_is_host boolean;
  v_round_revision bigint;
  v_round_state_json jsonb;
  v_active_count integer;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if char_length(v_code) <> 8 then
    raise exception 'INVALID_ROOM_CODE';
  end if;

  if char_length(v_display_name) < 1 or char_length(v_display_name) > 40 then
    raise exception 'INVALID_DISPLAY_NAME';
  end if;

  select *
  into v_round
  from public.rounds
  where room_code = v_code
    and expires_at > now()
    and status in ('lobby', 'active')
  for update;

  if not found then
    raise exception 'ROUND_NOT_FOUND_OR_EXPIRED';
  end if;

  select id, is_host
  into v_participant_id, v_is_host
  from public.round_participants
  where round_id = v_round.id
    and user_id = v_user_id;

  if found then
    update public.round_participants
    set display_name = v_display_name,
        expected_score_18 = v_expected_score_18,
        left_at = null,
        last_seen_at = now()
    where id = v_participant_id
    returning is_host into v_is_host;
  else
    select count(*)
    into v_active_count
    from public.round_participants
    where round_id = v_round.id
      and left_at is null;

    if v_active_count >= 4 then
      raise exception 'ROUND_FULL';
    end if;

    insert into public.round_participants (
      round_id,
      user_id,
      display_name,
      expected_score_18,
      is_host,
      last_seen_at
    )
    values (
      v_round.id,
      v_user_id,
      v_display_name,
      v_expected_score_18,
      false,
      now()
    )
    returning id, is_host into v_participant_id, v_is_host;
  end if;

  perform public.reconcile_round_participant_player_ids(v_round.id, v_round.state_json);

  select player_id, expected_score_18, is_host
  into v_participant_player_id, v_participant_expected_score_18, v_is_host
  from public.round_participants
  where id = v_participant_id;

  select synced.revision, synced.state_json
  into v_round_revision, v_round_state_json
  from public.sync_participant_profile_into_round_state(v_round.id, v_participant_id) synced;

  update public.rounds
  set last_activity_at = now()
  where id = v_round.id
  returning * into v_round;

  return query
  select
    v_round.id,
    v_round.room_code,
    v_round.expires_at,
    v_participant_id,
    v_participant_player_id,
    coalesce(v_participant_expected_score_18, v_expected_score_18),
    v_is_host,
    coalesce(v_round_revision, v_round.revision),
    coalesce(v_round_state_json, v_round.state_json);
end;
$$;

revoke all on function public.create_round(text, integer, jsonb) from public;
revoke all on function public.join_round(text, text, integer) from public;
revoke all on function public.sync_participant_profile_into_round_state(uuid, uuid) from public;
revoke all on function public.normalize_expected_score_18(integer) from public;

grant execute on function public.create_round(text, integer, jsonb) to authenticated;
grant execute on function public.join_round(text, text, integer) to authenticated;
grant execute on function public.sync_participant_profile_into_round_state(uuid, uuid) to authenticated;
grant execute on function public.normalize_expected_score_18(integer) to authenticated;
