# Gimme Golf Team Onboarding

## 1) What This Project Is
Gimme Golf is a mobile-first web app that adds a side-game on top of a real golf round.

Players track:
- **Real Score**: actual golf strokes (never changed by card effects)
- **Game Points**: points from personal cards, public cards, featured-hole bonuses, and momentum
- **Adjusted Score**: `realScore - gamePoints` for leaderboard views

It is intentionally lightweight:
- Frontend-only React + TypeScript + Vite
- No backend/auth/payments/live APIs
- State persisted in `localStorage`

## 2) Product Vision
The app is designed to make casual and competitive rounds more social, replayable, and strategic without changing the integrity of real golf scoring.

Current design direction supports:
- Core mission-card gameplay
- Public chaos/prop modifiers
- Featured-hole pacing events
- Alternate Power Ups mode
- Expansion-ready card packs

## 3) Current App Flow (Implemented)
Main entry: `src/main.tsx` -> `src/app/App.tsx`

Screen sequence:
1. `HomeScreen`
2. `RoundSetupScreen`
3. `HoleSetupScreen`
4. `HolePlayScreen`
5. `HoleResultsScreen`
6. `LeaderboardScreen` (hole recap + round board)
7. `EndRoundScreen`

Round state is centralized in `RoundState` (`src/types/game.ts`) and updated through screen callbacks.

## 4) Gameplay Systems In Place
### Card Packs
Implemented packs:
- `classic` (common/skill/risk)
- `chaos`
- `props`
- `curse`
- `style`
- `novelty`
- `hybrid`

Per-pack docs now live in:
- `SPEC_FILES/CARD_PACKS/classic.md`
- `SPEC_FILES/CARD_PACKS/chaos.md`
- `SPEC_FILES/CARD_PACKS/props.md`
- `SPEC_FILES/CARD_PACKS/curse.md`
- `SPEC_FILES/CARD_PACKS/style.md`
- `SPEC_FILES/CARD_PACKS/novelty.md`
- `SPEC_FILES/CARD_PACKS/hybrid.md`

### Presets + Modes
Game mode presets are defined in `src/data/gameModePresets.ts`:
- Casual
- Competitive
- Party
- Balanced (default)
- Power Ups
- Custom

Custom mode allows pack toggles, featured-hole controls, and option tuning.

### Card Dealing + Resolution
- Personal dealing and draw modes: `src/logic/dealCards.ts`
- Filtering by par/tags/packs: `src/logic/filterCards.ts`
- Public resolution engine (multiple resolution modes): `src/logic/publicCardResolution.ts`
- Scoring + totals recompute: `src/logic/scoring.ts`
- Momentum/streak bonuses + rivalry logic: `src/logic/streaks.ts`, `src/logic/featuredHoles.ts`

### Featured Holes
Featured-hole types (jackpot, chaos, double points, rivalry, no mercy) are implemented and auto-assigned by spacing/frequency.

### Power Ups
Power Ups mode is implemented as a separate flow (`src/data/powerUps.ts`, `src/logic/powerUps.ts`).

### End-of-Round Experience
- Multi-metric winners (real/game/adjusted)
- Awards computation (`src/logic/awards.ts`)
- Per-hole summary list

## 5) What Is Done vs What Still Needs Work
### Done
- End-to-end playable round flow
- Persistence and resume behavior
- Multiple card packs and presets
- Public-card manual resolution UI
- Featured-hole engine with effects
- Power Ups mode
- Round summary + awards

### Still Open / Likely Next
- **Manual featured-hole assignment editor**: currently scaffolded; auto-spacing is primary path
- **Entitlements/premium gating**: placeholder only (`src/logic/entitlements.ts` unlocks all packs)
- **Robust automated tests**: core logic is structured for testing, but test suite coverage is limited
- **Content balancing pass**: tune points/difficulty/interactions based on playtest data
- **Analytics/telemetry strategy**: not present (if desired)
- **Cloud sync/multiplayer**: intentionally out-of-scope today

## 6) Notes For Physical Companion Card Game Direction
Your stated goal is a physical companion deck for golfers who skip the app. The current app data model already gives a strong source of truth for print design.

Recommended path:
1. Treat `src/data/cards.ts` + `src/data/expansionCards.ts` as canonical content.
2. Lock a print schema per card (code, name, challenge, rules, points, type, difficulty, icons).
3. Define physical-only resolution rules for Chaos/Prop cards that currently assume app UI/manual selection.
4. Create a print-layout export pipeline (CSV/JSON -> design template) so card text updates stay synchronized.
5. Build iconography/system tokens (pack color, type badge, difficulty badge, tag icons) before visual polishing.

## 7) Notes For Turning UI Cards Into Physical Card Designs
Use the generated pack markdown files in `SPEC_FILES/CARD_PACKS/` as your content QA layer before design.

Then create a print-production spec covering:
- Card size/bleed/safe area
- Front/back structure
- Font hierarchy and max text lengths
- Color system by pack/type
- Accessibility/readability targets outdoors
- Prototype print checks (sunlight readability, distance legibility, wet-hand handling)

## 8) Quick Orientation For New Engineers
If someone is onboarding to code quickly:
1. Start with `src/app/App.tsx` and screen files to learn flow.
2. Read `src/types/game.ts` + `src/types/cards.ts` for domain model.
3. Read `src/logic/dealCards.ts`, `src/logic/publicCardResolution.ts`, `src/logic/scoring.ts` for core rules.
4. Use `SPEC_FILES/CARD_PACKS/*.md` for complete card content by pack.
