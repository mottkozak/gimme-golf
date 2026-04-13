# ADR 0002: Domain Platform Adapters and Boundary Enforcement

- Status: Accepted
- Date: 2026-03-18

## Context
Domain logic under `src/logic` previously used browser/native APIs directly (`window`, `document`, `navigator`, `localStorage`, Capacitor imports). This made testing, portability, and layer boundaries weaker.

## Decision
- Introduce platform adapters under `src/platform/*` for:
  - browser storage access
  - mirrored native storage
  - custom window events
  - theme/document updates
  - runtime/native checks
  - recap sharing and file operations
- Rewire domain modules to use adapters instead of browser/native APIs directly.
- Enforce architecture boundaries in ESLint:
  - `src/logic/**` cannot import React or Capacitor directly.
  - `src/logic/**` cannot access browser globals directly.
  - `src/features/**` cannot import other feature modules directly.
- Rely on CI lint execution (`npm run lint` in `.github/workflows/ci.yml`) to enforce these rules.

## Consequences
- Domain logic is less coupled to runtime environment details.
- Platform behavior can be evolved in one place without touching domain modules.
- Boundary violations fail lint/CI early.
