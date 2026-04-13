# Persistence / Reliability Checklist

This checklist documents the deterministic persistence behavior and automated lifecycle chaos coverage.

## Storage schema and migration

- [x] Versioned storage schema is used for active rounds (`schemaVersion: 2`).
- [x] Legacy active-round payloads (`gimme-golf-active-round-v1`) migrate automatically to v2.
- [x] Migration preserves round data and timestamps where available.

## Typed outcomes and telemetry

- [x] Storage operations return typed `ok/error` outcomes in [`src/platform/storage.ts`](/Users/pzs0188/Documents/experiment/gimme-golf/src/platform/storage.ts).
- [x] Persistence save flows return typed outcomes in [`src/logic/storage.ts`](/Users/pzs0188/Documents/experiment/gimme-golf/src/logic/storage.ts).
- [x] Native mirror and bridge failures emit telemetry events (no silent catches).
- [x] Auth/session-dependent calls use explicit retry/timeout policy with typed results in [`src/logic/account.ts`](/Users/pzs0188/Documents/experiment/gimme-golf/src/logic/account.ts).

## Deterministic recovery paths

- [x] Interrupted writes recover from journal key.
- [x] Corrupt primary with valid backup recovers from backup key.
- [x] App resume reconciles persisted snapshot if it is newer than in-memory state.
- [x] Recovery reason is surfaced for user/system messaging.

## Lifecycle chaos tests

- [x] Background save/reopen scenario covered.
- [x] Terminate/interrupted-write recovery scenario covered.
- [x] Low-memory reopen scenario covered.
- [x] Offline resume scenario covered.

Run:

```bash
npm run test
```

Relevant tests:

- [`src/logic/persistenceChaos.test.ts`](/Users/pzs0188/Documents/experiment/gimme-golf/src/logic/persistenceChaos.test.ts)
- [`src/logic/storage.test.ts`](/Users/pzs0188/Documents/experiment/gimme-golf/src/logic/storage.test.ts)
- [`src/logic/lifecyclePersistence.test.ts`](/Users/pzs0188/Documents/experiment/gimme-golf/src/logic/lifecyclePersistence.test.ts)
