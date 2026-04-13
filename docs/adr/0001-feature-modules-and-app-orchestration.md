# ADR 0001: Feature Modules and App Orchestration

- Status: Accepted
- Date: 2026-03-18

## Context
The app shell had grown into a single orchestration hotspot (`src/app/App.tsx`) and feature screens lived in a flat `src/screens` folder. This made ownership and dependency boundaries harder to reason about.

## Decision
- Group core gameplay flows into explicit feature modules:
  - `src/features/home`
  - `src/features/setup`
  - `src/features/hole-play`
  - `src/features/results`
  - `src/features/recap`
- Move screen implementations into those feature modules.
- Keep app-wide orchestration concerns in `src/app/orchestration/*` (navigation helpers, splash behavior, transition state, lifecycle message timing, round refs).
- Keep `src/app/stateMachine.ts` reducer-focused and extract transition policy/state normalization to dedicated app modules.

## Consequences
- Feature ownership is clearer and easier to evolve.
- The app shell composes smaller units instead of centralizing flow logic in one file.
- Navigation and state transitions are easier to test independently.
- New features must declare dependencies through shared modules or app orchestration, not direct feature-to-feature imports.
