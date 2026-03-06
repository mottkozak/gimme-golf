export type AppScreen =
  | 'home'
  | 'roundSetup'
  | 'holeSetup'
  | 'holePlay'
  | 'holeResults'
  | 'leaderboard'
  | 'endRound'

export interface ScreenNavItem {
  id: AppScreen
  label: string
}

export const SCREEN_ORDER: AppScreen[] = [
  'home',
  'roundSetup',
  'holeSetup',
  'holePlay',
  'holeResults',
  'leaderboard',
  'endRound',
]

export const SCREEN_NAV_ITEMS: ScreenNavItem[] = [
  { id: 'home', label: 'Home' },
  { id: 'roundSetup', label: 'Round' },
  { id: 'holeSetup', label: 'Hole' },
  { id: 'holePlay', label: 'Play' },
  { id: 'holeResults', label: 'Results' },
  { id: 'leaderboard', label: 'Board' },
  { id: 'endRound', label: 'End' },
]

export function getNextScreen(currentScreen: AppScreen): AppScreen {
  const index = SCREEN_ORDER.indexOf(currentScreen)

  if (index < 0 || index === SCREEN_ORDER.length - 1) {
    return SCREEN_ORDER[SCREEN_ORDER.length - 1]
  }

  return SCREEN_ORDER[index + 1]
}

export function getPreviousScreen(currentScreen: AppScreen): AppScreen {
  const index = SCREEN_ORDER.indexOf(currentScreen)

  if (index <= 0) {
    return SCREEN_ORDER[0]
  }

  return SCREEN_ORDER[index - 1]
}
