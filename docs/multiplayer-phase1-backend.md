# Multiplayer Phase 1 Backend (Supabase)

This phase adds the server foundation for room-code multiplayer with:

- 8-character room codes
- 9-hour round expiry
- max 4 active participants
- server revision conflict detection
- one-auto-retry-friendly response contract (`applied=false`, `conflict=true`)
- host-only round-control operations (`advance_hole`, `end_round`, `abandon_round`, `reset_round`)

## Migration File

- [20260408_phase1_multiplayer_foundation.sql](/Users/pzs0188/Documents/experiment/gimme-golf/supabase/migrations/20260408_phase1_multiplayer_foundation.sql)
- [20260408_phase5_multiplayer_hardening.sql](/Users/pzs0188/Documents/experiment/gimme-golf/supabase/migrations/20260408_phase5_multiplayer_hardening.sql)

## Included Objects

- Tables:
  - `public.rounds`
  - `public.round_participants`
  - `public.round_events` (audit/event log)
- RPC functions:
  - `public.create_round(p_display_name, p_initial_state)`
  - `public.join_round(p_room_code, p_display_name)`
  - `public.apply_round_update(p_round_id, p_expected_revision, p_next_state, p_operation, p_patch)`
  - `public.leave_round(p_round_id)`
  - `public.cleanup_expired_rounds(p_grace_interval)` (service role)
  - Hardening helpers:
    - `public.reconcile_round_participant_player_ids(p_round_id, p_state_json)`
    - `public.non_host_round_update_allowed(p_previous_state, p_next_state, p_actor_player_id)`
- Security:
  - RLS enabled on all multiplayer tables
  - participants-only read policies
  - function execution granted to `authenticated` (cleanup to `service_role`)
- Realtime:
  - adds `rounds` and `round_participants` to `supabase_realtime` publication

## Apply Steps

1. Open Supabase project SQL editor.
2. Run migration SQL from:
   - [20260408_phase1_multiplayer_foundation.sql](/Users/pzs0188/Documents/experiment/gimme-golf/supabase/migrations/20260408_phase1_multiplayer_foundation.sql)
3. Verify objects exist:
   - `rounds`, `round_participants`, `round_events`
   - RPCs listed above
4. Verify Realtime publication includes:
   - `public.rounds`
   - `public.round_participants`

## RPC Behavior (Client Contract)

### `create_round`
- Creates round with:
  - `revision = 0`
  - `expires_at = now() + 9 hours`
  - caller as host participant

### `join_round`
- Accepts room code + display name.
- Validates round is active and not expired.
- Enforces `max 4` active players.
- Rejoin by same authenticated user restores membership if previously left.

### `apply_round_update`
- Validates caller is an active participant.
- Revision match:
  - applies update
  - increments `revision`
  - returns `applied=true`, `conflict=false`
- Revision mismatch:
  - no write
  - returns latest state with `applied=false`, `conflict=true`
- Intended client policy:
  - fetch latest, reapply local intent, retry once.

### `leave_round`
- Marks caller as left.
- If host leaves, next active participant is promoted host.
- If no active participants remain, round becomes `abandoned`.

## Notes For Phase 2

- Host-only enforcement is operation-name based.
- Per-player score ownership is now enforced by server-side non-host diff validation plus participant `player_id` mapping.
- Typed patch commands remain a recommended future improvement to reduce write cost and simplify validation logic.

## Phase 5 Hardening Outcome

- Non-host writes are now validated on the server:
  - actor slot must match participant `player_id`
  - non-host can only mutate own `strokesByPlayerId`/`missionStatusByPlayerId`
  - round-level structures remain host-only
- Participant-to-player mapping uses server-assigned `player_id` (not display-name matching).
