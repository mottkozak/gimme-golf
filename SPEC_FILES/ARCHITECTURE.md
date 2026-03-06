# GIMME GOLF - Architecture

## Preferred structure
src/
  app/
    App.tsx
    router.tsx
  screens/
    HomeScreen.tsx
    RoundSetupScreen.tsx
    HoleSetupScreen.tsx
    HolePlayScreen.tsx
    HoleResultsScreen.tsx
    LeaderboardScreen.tsx
    EndRoundScreen.tsx
  components/
    PlayerCard.tsx
    ChallengeCardView.tsx
    PublicCardView.tsx
    LeaderboardTable.tsx
    HoleRecap.tsx
    ToggleRow.tsx
  data/
    cards.ts
  logic/
    roundSetup.ts
    filterCards.ts
    dealCards.ts
    scoring.ts
    leaderboard.ts
    storage.ts
    publicCardResolution.ts
  types/
    cards.ts
    game.ts
  styles/
    app.css
    tokens.css

## Principles
- Keep card data separate from logic
- Keep scoring logic pure and testable
- Prefer utility functions over giant screen components
- Keep UI mobile-first and simple
- Keep public card resolution manual in v1
- Use strong TypeScript types for all domain models

## State
The app should track:
- round config
- player list
- hole definitions
- current hole index
- dealt personal cards
- selected card per player
- public cards per hole
- strokes entered per player per hole
- mission success per player per hole
- public card resolution
- real score totals
- game point totals
- adjusted score values
