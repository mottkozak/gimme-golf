-- Phase 5 multiplayer hardening
-- 1) Server-side non-host update enforcement.
-- 2) Participant-to-player ID mapping to avoid display-name matching.

alter table public.round_participants
  add column if not exists player_id text;

alter table public.round_participants
  drop constraint if exists round_participants_player_id_length_chk;

alter table public.round_participants
  add constraint round_participants_player_id_length_chk
  check (player_id is null or char_length(btrim(player_id)) between 1 and 128);

create unique index if not exists round_participants_round_player_active_unique_idx
  on public.round_participants (round_id, player_id)
  where left_at is null and player_id is not null;

create or replace function public.extract_player_ids_from_state(p_state jsonb)
returns text[]
language plpgsql
immutable
as $$
declare
  v_players jsonb := coalesce(p_state->'players', '[]'::jsonb);
  v_player jsonb;
  v_player_id text;
  v_result text[] := '{}'::text[];
begin
  if jsonb_typeof(v_players) <> 'array' then
    return v_result;
  end if;

  for v_player in
    select value
    from jsonb_array_elements(v_players)
  loop
    if jsonb_typeof(v_player) <> 'object' then
      continue;
    end if;

    v_player_id := btrim(coalesce(v_player->>'id', ''));
    if v_player_id = '' then
      continue;
    end if;

    if not (v_player_id = any(v_result)) then
      v_result := array_append(v_result, v_player_id);
    end if;
  end loop;

  return v_result;
end;
$$;

create or replace function public.reconcile_round_participant_player_ids(
  p_round_id uuid,
  p_state_json jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_ids text[] := public.extract_player_ids_from_state(coalesce(p_state_json, '{}'::jsonb));
  v_claimed_player_ids text[] := '{}'::text[];
  v_participant record;
  v_next_player_id text;
begin
  if p_round_id is null then
    return;
  end if;

  if coalesce(array_length(v_player_ids, 1), 0) = 0 then
    update public.round_participants
    set player_id = null
    where round_id = p_round_id
      and left_at is null
      and player_id is not null;
    return;
  end if;

  for v_participant in
    select id, player_id
    from public.round_participants
    where round_id = p_round_id
      and left_at is null
    order by joined_at asc, id asc
  loop
    if v_participant.player_id is not null
       and v_participant.player_id = any(v_player_ids)
       and not (v_participant.player_id = any(v_claimed_player_ids)) then
      v_claimed_player_ids := array_append(v_claimed_player_ids, v_participant.player_id);
      continue;
    end if;

    if v_participant.player_id is not null then
      update public.round_participants
      set player_id = null
      where id = v_participant.id;
    end if;
  end loop;

  for v_participant in
    select id
    from public.round_participants
    where round_id = p_round_id
      and left_at is null
      and player_id is null
    order by joined_at asc, id asc
  loop
    select player_id
    into v_next_player_id
    from unnest(v_player_ids) as player_id
    where not (player_id = any(v_claimed_player_ids))
    order by array_position(v_player_ids, player_id)
    limit 1;

    if v_next_player_id is null then
      exit;
    end if;

    update public.round_participants
    set player_id = v_next_player_id
    where id = v_participant.id;

    v_claimed_player_ids := array_append(v_claimed_player_ids, v_next_player_id);
  end loop;
end;
$$;

create or replace function public.non_host_round_update_allowed(
  p_previous_state jsonb,
  p_next_state jsonb,
  p_actor_player_id text
)
returns boolean
language plpgsql
immutable
as $$
declare
  v_previous_state jsonb := coalesce(p_previous_state, '{}'::jsonb);
  v_next_state jsonb := coalesce(p_next_state, '{}'::jsonb);
  v_actor_player_id text := btrim(coalesce(p_actor_player_id, ''));
  v_previous_hole_results jsonb;
  v_next_hole_results jsonb;
  v_previous_hole_result jsonb;
  v_next_hole_result jsonb;
  v_previous_strokes jsonb;
  v_next_strokes jsonb;
  v_previous_missions jsonb;
  v_next_missions jsonb;
  v_hole_index integer;
  v_hole_count integer;
  v_player_key text;
begin
  if v_actor_player_id = '' then
    return false;
  end if;

  if coalesce(v_previous_state->'config', 'null'::jsonb) is distinct from coalesce(v_next_state->'config', 'null'::jsonb) then
    return false;
  end if;

  if coalesce(v_previous_state->'players', 'null'::jsonb) is distinct from coalesce(v_next_state->'players', 'null'::jsonb) then
    return false;
  end if;

  if coalesce(v_previous_state->'holes', 'null'::jsonb) is distinct from coalesce(v_next_state->'holes', 'null'::jsonb) then
    return false;
  end if;

  if coalesce(v_previous_state->'holeCards', 'null'::jsonb) is distinct from coalesce(v_next_state->'holeCards', 'null'::jsonb) then
    return false;
  end if;

  if coalesce(v_previous_state->'holePowerUps', 'null'::jsonb) is distinct from coalesce(v_next_state->'holePowerUps', 'null'::jsonb) then
    return false;
  end if;

  if coalesce(v_previous_state->'deckMemory', 'null'::jsonb) is distinct from coalesce(v_next_state->'deckMemory', 'null'::jsonb) then
    return false;
  end if;

  if coalesce(v_previous_state->>'currentHoleIndex', '') <> coalesce(v_next_state->>'currentHoleIndex', '') then
    return false;
  end if;

  v_previous_hole_results := coalesce(v_previous_state->'holeResults', '[]'::jsonb);
  v_next_hole_results := coalesce(v_next_state->'holeResults', '[]'::jsonb);

  if jsonb_typeof(v_previous_hole_results) <> 'array' or jsonb_typeof(v_next_hole_results) <> 'array' then
    return false;
  end if;

  if jsonb_array_length(v_previous_hole_results) <> jsonb_array_length(v_next_hole_results) then
    return false;
  end if;

  v_hole_count := jsonb_array_length(v_previous_hole_results);
  if v_hole_count = 0 then
    return true;
  end if;

  for v_hole_index in 0..(v_hole_count - 1) loop
    v_previous_hole_result := v_previous_hole_results->v_hole_index;
    v_next_hole_result := v_next_hole_results->v_hole_index;

    if jsonb_typeof(v_previous_hole_result) <> 'object' or jsonb_typeof(v_next_hole_result) <> 'object' then
      return false;
    end if;

    if coalesce(v_previous_hole_result->'publicPointDeltaByPlayerId', '{}'::jsonb) is distinct from
       coalesce(v_next_hole_result->'publicPointDeltaByPlayerId', '{}'::jsonb) then
      return false;
    end if;

    if coalesce(v_previous_hole_result->'publicCardResolutionsByCardId', '{}'::jsonb) is distinct from
       coalesce(v_next_hole_result->'publicCardResolutionsByCardId', '{}'::jsonb) then
      return false;
    end if;

    if coalesce(v_previous_hole_result->>'publicCardResolutionNotes', '') <>
       coalesce(v_next_hole_result->>'publicCardResolutionNotes', '') then
      return false;
    end if;

    v_previous_strokes := coalesce(v_previous_hole_result->'strokesByPlayerId', '{}'::jsonb);
    v_next_strokes := coalesce(v_next_hole_result->'strokesByPlayerId', '{}'::jsonb);
    v_previous_missions := coalesce(v_previous_hole_result->'missionStatusByPlayerId', '{}'::jsonb);
    v_next_missions := coalesce(v_next_hole_result->'missionStatusByPlayerId', '{}'::jsonb);

    if jsonb_typeof(v_previous_strokes) <> 'object' or jsonb_typeof(v_next_strokes) <> 'object' then
      return false;
    end if;

    if jsonb_typeof(v_previous_missions) <> 'object' or jsonb_typeof(v_next_missions) <> 'object' then
      return false;
    end if;

    for v_player_key in
      select key
      from (
        select jsonb_object_keys(v_previous_strokes) as key
        union
        select jsonb_object_keys(v_next_strokes) as key
      ) stroke_keys
    loop
      if v_player_key = v_actor_player_id then
        continue;
      end if;

      if coalesce(v_previous_strokes->v_player_key, 'null'::jsonb) is distinct from
         coalesce(v_next_strokes->v_player_key, 'null'::jsonb) then
        return false;
      end if;
    end loop;

    for v_player_key in
      select key
      from (
        select jsonb_object_keys(v_previous_missions) as key
        union
        select jsonb_object_keys(v_next_missions) as key
      ) mission_keys
    loop
      if v_player_key = v_actor_player_id then
        continue;
      end if;

      if coalesce(v_previous_missions->v_player_key, 'null'::jsonb) is distinct from
         coalesce(v_next_missions->v_player_key, 'null'::jsonb) then
        return false;
      end if;
    end loop;
  end loop;

  return true;
end;
$$;

drop function if exists public.create_round(text, jsonb);
create or replace function public.create_round(
  p_display_name text,
  p_initial_state jsonb default '{}'::jsonb
)
returns table(
  round_id uuid,
  room_code text,
  expires_at timestamptz,
  participant_id uuid,
  participant_player_id text,
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
  v_initial_state jsonb := coalesce(p_initial_state, '{}'::jsonb);
  v_round_id uuid;
  v_room_code text;
  v_expires_at timestamptz := now() + interval '9 hours';
  v_participant_id uuid;
  v_participant_player_id text;
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
    is_host,
    last_seen_at
  )
  values (
    v_round_id,
    v_user_id,
    v_display_name,
    true,
    now()
  )
  returning id into v_participant_id;

  perform public.reconcile_round_participant_player_ids(v_round_id, v_initial_state);

  select player_id
  into v_participant_player_id
  from public.round_participants
  where id = v_participant_id;

  return query
  select
    v_round_id,
    v_room_code,
    v_expires_at,
    v_participant_id,
    v_participant_player_id,
    0::bigint,
    v_initial_state;
end;
$$;

drop function if exists public.join_round(text, text);
create or replace function public.join_round(
  p_room_code text,
  p_display_name text
)
returns table(
  round_id uuid,
  room_code text,
  expires_at timestamptz,
  participant_id uuid,
  participant_player_id text,
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
  v_round public.rounds%rowtype;
  v_participant_id uuid;
  v_participant_player_id text;
  v_is_host boolean;
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
      is_host,
      last_seen_at
    )
    values (
      v_round.id,
      v_user_id,
      v_display_name,
      false,
      now()
    )
    returning id, is_host into v_participant_id, v_is_host;
  end if;

  perform public.reconcile_round_participant_player_ids(v_round.id, v_round.state_json);

  select player_id, is_host
  into v_participant_player_id, v_is_host
  from public.round_participants
  where id = v_participant_id;

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
    v_is_host,
    v_round.revision,
    v_round.state_json;
end;
$$;

create or replace function public.apply_round_update(
  p_round_id uuid,
  p_expected_revision bigint,
  p_next_state jsonb,
  p_operation text default 'state_replace',
  p_patch jsonb default '{}'::jsonb
)
returns table(
  applied boolean,
  conflict boolean,
  revision bigint,
  state_json jsonb,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_round public.rounds%rowtype;
  v_participant_id uuid;
  v_is_host boolean;
  v_player_id text;
  v_actor_player_id text;
  v_next_state jsonb := coalesce(p_next_state, '{}'::jsonb);
  v_operation text := btrim(coalesce(p_operation, ''));
  v_patch jsonb := coalesce(p_patch, '{}'::jsonb);
  v_applied_revision bigint;
  v_applied_state jsonb;
  v_updated_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_round_id is null then
    raise exception 'ROUND_ID_REQUIRED';
  end if;

  if p_expected_revision is null or p_expected_revision < 0 then
    raise exception 'INVALID_EXPECTED_REVISION';
  end if;

  if char_length(v_operation) < 1 or char_length(v_operation) > 64 then
    raise exception 'INVALID_OPERATION';
  end if;

  if pg_column_size(v_next_state) > 262144 then
    raise exception 'STATE_TOO_LARGE';
  end if;

  select *
  into v_round
  from public.rounds
  where id = p_round_id
    and expires_at > now()
    and status in ('lobby', 'active')
  for update;

  if not found then
    raise exception 'ROUND_NOT_FOUND_OR_EXPIRED';
  end if;

  perform public.reconcile_round_participant_player_ids(p_round_id, v_round.state_json);

  select id, is_host, player_id
  into v_participant_id, v_is_host, v_player_id
  from public.round_participants
  where round_id = p_round_id
    and user_id = v_user_id
    and left_at is null;

  if not found then
    raise exception 'NOT_A_ROUND_PARTICIPANT';
  end if;

  if v_round.revision <> p_expected_revision then
    return query
    select
      false,
      true,
      v_round.revision,
      v_round.state_json,
      v_round.updated_at;
    return;
  end if;

  if v_operation in ('advance_hole', 'end_round', 'abandon_round', 'reset_round')
     and not v_is_host then
    raise exception 'HOST_REQUIRED_FOR_OPERATION';
  end if;

  if not v_is_host then
    if v_operation <> 'state_replace' then
      raise exception 'HOST_REQUIRED_FOR_OPERATION';
    end if;

    if v_player_id is null then
      raise exception 'PLAYER_SLOT_UNASSIGNED';
    end if;

    v_actor_player_id := btrim(coalesce(v_patch->>'actorPlayerId', ''));
    if v_actor_player_id <> v_player_id then
      raise exception 'ACTOR_PLAYER_MISMATCH';
    end if;

    if not public.non_host_round_update_allowed(v_round.state_json, v_next_state, v_player_id) then
      raise exception 'NON_HOST_STATE_UPDATE_FORBIDDEN';
    end if;
  end if;

  update public.rounds
  set state_json = v_next_state,
      revision = revision + 1,
      status = case when status = 'lobby' then 'active' else status end,
      last_activity_at = now()
  where id = p_round_id
  returning revision, state_json, updated_at
  into v_applied_revision, v_applied_state, v_updated_at;

  perform public.reconcile_round_participant_player_ids(p_round_id, v_applied_state);

  update public.round_participants
  set last_seen_at = now()
  where id = v_participant_id;

  insert into public.round_events (
    round_id,
    actor_user_id,
    base_revision,
    applied_revision,
    operation,
    patch_json
  )
  values (
    p_round_id,
    v_user_id,
    p_expected_revision,
    v_applied_revision,
    v_operation,
    v_patch
  );

  return query
  select
    true,
    false,
    v_applied_revision,
    v_applied_state,
    v_updated_at;
end;
$$;

create or replace function public.leave_round(p_round_id uuid)
returns table(
  round_id uuid,
  was_host boolean,
  new_host_user_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_round public.rounds%rowtype;
  v_was_host boolean := false;
  v_new_host_participant_id uuid;
  v_new_host_user_id uuid;
  v_active_count integer;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select *
  into v_round
  from public.rounds
  where id = p_round_id
  for update;

  if not found then
    raise exception 'ROUND_NOT_FOUND';
  end if;

  with target as (
    select rp.id, rp.is_host
    from public.round_participants rp
    where rp.round_id = p_round_id
      and rp.user_id = v_user_id
      and rp.left_at is null
    for update
  ), updated as (
    update public.round_participants rp
    set left_at = now(),
        is_host = false,
        player_id = null,
        last_seen_at = now()
    from target t
    where rp.id = t.id
    returning t.is_host as was_host
  )
  select u.was_host
  into v_was_host
  from updated u;

  if v_was_host is null then
    raise exception 'NOT_A_ROUND_PARTICIPANT';
  end if;

  if v_was_host then
    select id, user_id
    into v_new_host_participant_id, v_new_host_user_id
    from public.round_participants
    where round_id = p_round_id
      and left_at is null
    order by joined_at asc
    limit 1;

    if found then
      update public.round_participants
      set is_host = true
      where id = v_new_host_participant_id;
    end if;
  end if;

  select count(*)
  into v_active_count
  from public.round_participants
  where round_id = p_round_id
    and left_at is null;

  if v_active_count = 0 and v_round.status in ('lobby', 'active') then
    update public.rounds
    set status = 'abandoned',
        last_activity_at = now()
    where id = p_round_id;
  else
    update public.rounds
    set last_activity_at = now()
    where id = p_round_id;
  end if;

  return query
  select
    p_round_id,
    v_was_host,
    v_new_host_user_id;
end;
$$;

do $$
declare
  v_round record;
begin
  for v_round in
    select id, state_json
    from public.rounds
    where status in ('lobby', 'active')
      and expires_at > now()
  loop
    perform public.reconcile_round_participant_player_ids(v_round.id, v_round.state_json);
  end loop;
end
$$;

revoke all on function public.create_round(text, jsonb) from public;
revoke all on function public.join_round(text, text) from public;
revoke all on function public.apply_round_update(uuid, bigint, jsonb, text, jsonb) from public;
revoke all on function public.leave_round(uuid) from public;
revoke all on function public.extract_player_ids_from_state(jsonb) from public;
revoke all on function public.reconcile_round_participant_player_ids(uuid, jsonb) from public;
revoke all on function public.non_host_round_update_allowed(jsonb, jsonb, text) from public;

grant execute on function public.create_round(text, jsonb) to authenticated;
grant execute on function public.join_round(text, text) to authenticated;
grant execute on function public.apply_round_update(uuid, bigint, jsonb, text, jsonb) to authenticated;
grant execute on function public.leave_round(uuid) to authenticated;
grant execute on function public.reconcile_round_participant_player_ids(uuid, jsonb) to authenticated;
grant execute on function public.non_host_round_update_allowed(jsonb, jsonb, text) to authenticated;
