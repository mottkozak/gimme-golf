# Gimme Golf - MVP Spec

## Core concept
A mobile-first golf side-game web app that runs alongside a real round of golf.

Each player has:
1. Real Score = actual golf strokes
2. Game Points = points earned from completing challenge cards and public card effects
3. Adjusted Score = Real Score - Game Points (display only)

Winners:
- Lowest Real Score wins the golf round
- Highest Game Points wins the side game
- Lowest Adjusted Score wins the adjusted leaderboard

## Setup flow
- Start a round
- Choose 9 or 18 holes
- Choose course style: Par 3 / Standard / Custom
- Edit pars per hole
- Optionally assign tags per hole:
  - water
  - bunkers
  - trees
  - dogleg
  - reachablePar5
- Add 1 to 8 golfers
- Enter golfer names
- Enter expected 18-hole score per golfer
- Toggles:
  - Dynamic difficulty
  - Draw 2 pick 1
  - Auto-assign 1
  - Enable Chaos cards
  - Enable Prop cards

## Scoring
- Real golf score is never changed by card effects
- Personal card types:
  - Common = 1 point
  - Skill = 2 points
  - Risk = 3 points
- Public card types:
  - Chaos = bonus/penalty/modifier logic
  - Prop = prediction-based points
- Adjusted Score is display-only and equals Real Score minus Game Points

## Hole flow
1. Start hole
2. Confirm/edit par and tags
3. Deal personal cards
4. Reveal public Chaos/Prop cards if enabled
5. Players choose their personal card if draw-2 mode is enabled
6. Play hole
7. Enter strokes and challenge success manually
8. Resolve chaos/prop manually
9. Show recap and leaderboard
10. Continue to next hole

## Card system
Five card types:
- Common
- Skill
- Risk
- Chaos
- Prop

Personal cards:
- dealt per player each hole
- filtered by hole par and tags
- weighted by golfer expected score if Dynamic Difficulty is enabled

Dynamic difficulty:
- expected score 72 to 85 => hard bias
- 86 to 100 => medium bias
- 101+ => easy bias

## Persistence
- Save active round to localStorage
- Resume round on refresh
- Reset or abandon round at any time

## Tech
- React
- TypeScript
- Vite
- localStorage only
- static deployable
- GitHub Pages compatible
- mobile-first UI
- dark mode friendly
- large tap targets
- minimal typing during play