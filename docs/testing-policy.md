# Testing Policy

## CI Gates

Every pull request must pass:

- `npm run lint`
- `npm run typecheck`
- `npm run test:unit:coverage`
- `npm run test:component:coverage`
- `npm run test:e2e:web`
- `npm run test:e2e:device` (Android emulator + Maestro smoke)
- `npm run build:android:release`
- `npm run build:ios:release`

## Coverage Thresholds

- Unit tests (`c8`): branches >= 70, functions >= 70, lines >= 80, statements >= 80.
- Component tests (`vitest` + RTL):
  - Targets: `HomeScreen` and `RoundSetupScreen`.
  - branches >= 30, functions >= 25, lines >= 40, statements >= 40.

Coverage failures are blocking in CI.

## Flaky-Test Policy

- CI retries are disabled for automated gating suites.
- A test that fails intermittently is treated as a production risk and must be fixed before merge.
- If immediate fix is not possible, quarantine the test in a dedicated follow-up PR with:
  - root-cause notes,
  - issue link,
  - owner,
  - expected restore date.
- Quarantined tests may not remain skipped for more than one release cycle.
