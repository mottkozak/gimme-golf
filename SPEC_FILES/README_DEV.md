# Dev Notes

## Working style for Codex
- Implement one phase at a time
- Do not rewrite unrelated files
- Prefer small focused changes
- Keep code readable and modular
- After each phase, summarize:
  - files changed
  - assumptions made
  - next recommended step

## Product guardrails
- No backend
- No auth
- No GPS
- No live course APIs
- No multiplayer sync
- No betting or payments
- No mutation of actual golf score by card effects
- Adjusted score is display-only

## Testing expectations
After each major phase:
- app runs locally
- no TypeScript errors
- no broken navigation
- state survives refresh if a round is active