import type { AppScreen } from '../router.tsx'
import type { GameMode } from '../../types/game.ts'

function getScreenOrder(screen: AppScreen): number {
  if (screen === 'home') {
    return 0
  }
  if (screen === 'multiplayerAccess') {
    return 1
  }
  if (screen === 'multiplayerLobby') {
    return 2
  }
  if (screen === 'profile' || screen === 'settings') {
    return 3
  }
  if (screen === 'roundSetup') {
    return 4
  }
  if (screen === 'holePlay') {
    return 5
  }
  if (screen === 'holeResults') {
    return 6
  }
  if (screen === 'leaderboard') {
    return 7
  }
  return 8
}

export function getBackTargetScreen(
  activeScreen: AppScreen,
  currentHoleIndex: number,
  gameMode: GameMode,
): AppScreen | null {
  void gameMode

  if (
    activeScreen === 'profile' ||
    activeScreen === 'settings' ||
    activeScreen === 'roundSetup' ||
    activeScreen === 'multiplayerAccess'
  ) {
    return 'home'
  }

  if (activeScreen === 'multiplayerLobby') {
    return 'multiplayerAccess'
  }

  if (activeScreen === 'holePlay') {
    return currentHoleIndex > 0 ? 'leaderboard' : 'roundSetup'
  }

  if (activeScreen === 'holeResults') {
    return 'holePlay'
  }

  if (activeScreen === 'leaderboard') {
    return 'holeResults'
  }

  if (activeScreen === 'endRound') {
    return 'home'
  }

  return null
}

export function getScreenLabel(screen: AppScreen): string {
  if (screen === 'home') {
    return 'Home'
  }
  if (screen === 'multiplayerAccess') {
    return 'Multiplayer'
  }
  if (screen === 'multiplayerLobby') {
    return 'Room Lobby'
  }
  if (screen === 'profile') {
    return 'Profile'
  }
  if (screen === 'settings') {
    return 'Settings'
  }
  if (screen === 'roundSetup') {
    return 'Round Config'
  }
  if (screen === 'holePlay') {
    return 'Hole Setup'
  }
  if (screen === 'holeResults') {
    return 'Hole Results'
  }
  if (screen === 'leaderboard') {
    return 'Hole Recap'
  }
  return 'Home'
}

export function getScreenTransitionDirection(
  previousScreen: AppScreen,
  nextScreen: AppScreen,
): 'forward' | 'backward' {
  const previousOrder = getScreenOrder(previousScreen)
  const nextOrder = getScreenOrder(nextScreen)

  if (nextOrder === previousOrder) {
    return 'forward'
  }

  return nextOrder > previousOrder ? 'forward' : 'backward'
}
