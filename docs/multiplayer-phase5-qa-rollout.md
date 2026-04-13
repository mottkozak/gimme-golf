# Multiplayer Phase 5 QA + Rollout Runbook

This runbook covers final validation and controlled release for room-code multiplayer.

## V1 Scope Under Test

- Create round and share 8-character room code.
- Join by code with display name (no friends graph).
- Realtime sync for 2-4 active players.
- Offline queue + reconnect replay.
- Host controls round-level actions.
- Non-host players can edit only their own score/mission state.

## Automated Coverage

Run the multiplayer-focused suite locally:

```bash
npx vitest run --config vitest.config.ts \
  src/app/orchestration/useMultiplayerRoundSync.component.test.tsx \
  src/features/multiplayer/MultiplayerAccessScreen.component.test.tsx \
  src/features/multiplayer/MultiplayerLobbyScreen.component.test.tsx
```

Scenarios covered:

- Join/create room flows and session persistence.
- Disconnect -> local queue -> reconnect replay.
- Conflict policy: revision mismatch + one retry + review message.
- Non-host guardrails on round-level mutations.
- Host leave-room flow from lobby UI.

## 4-Device Field Test (Weak Cellular)

Use 4 phones (A/B/C/D) on the same course.

1. Device A creates round and shares room code.
2. Devices B/C/D join via code.
3. Validate player list and host badge are identical on all devices.
4. Hole 1: each player enters only their own score; verify all devices converge.
5. Force concurrent edits:
   - A and B submit score changes within 1-2 seconds.
   - Confirm one retry behavior and no silent data loss.
6. Force offline replay:
   - Put C in airplane mode.
   - C enters score update; confirm offline/queued banner.
   - Restore connectivity; confirm replay applies and queue drains.
7. Host control validation:
   - B (non-host) attempts round-level action; verify blocked.
   - A performs same action; verify accepted and synced.
8. Host leave scenario:
   - A taps Leave Room.
   - Verify round remains available and another participant is promoted host after refresh.
9. Reconnect resilience:
   - Hard-close D app, reopen, and auto-resume same room/session.
10. Repeat steps 4-9 on at least 3 holes.

Pass criteria:

- No stuck "syncing" state > 10s on stable network.
- No unsurfaced conflicts or silent overwrites.
- Queued updates replay automatically after reconnect.
- Host reassignment works after host leave.

## Telemetry Signals To Watch

`useMultiplayerRoundSync` now reports multiplayer stability events via `reportTelemetryEvent` scope `multiplayer-sync`.

Watch warn/error counts for these messages:

- `Queued multiplayer update for later replay`
- `Multiplayer replay paused due to network error`
- `Multiplayer replay conflicted and queue was cleared`
- `Multiplayer update failed before retry`
- `Multiplayer retry conflicted after one retry`
- `Unexpected multiplayer replay failure`
- `Unexpected multiplayer update pipeline failure`

Release gate suggestion (first staged rollout):

- Replay conflict rate < 2% of multiplayer updates.
- Unexpected replay/update failures = 0 in staged cohort.
- No blocker defects in 4-device field test.

## Rollout Sequence

1. Keep `VITE_ENABLE_MULTIPLAYER=true` only in internal/staging builds.
2. Run automated suite above + field test script.
3. Roll out to small pilot cohort (single-digit rounds/day).
4. Review telemetry + user feedback for 48 hours.
5. Expand rollout only if gate thresholds stay green.

## Rollback Trigger

Disable multiplayer immediately for new sessions if either occurs:

- data-loss or overwrite bug reproduced,
- unexpected replay/update failures recur in production telemetry.

Rollback action: set `VITE_ENABLE_MULTIPLAYER=false` in release environment and redeploy.
