import {
  isPublicCardResolutionComplete,
  normalizePublicCardResolutions,
} from '../logic/publicCardResolution.ts'
import type { RoundState } from '../types/game.ts'
import type { AppScreen } from './router.tsx'

const SCREEN_TRANSITIONS: Record<AppScreen, ReadonlySet<AppScreen>> = {
  home: new Set([
    'home',
    'multiplayerAccess',
    'multiplayerLobby',
    'profile',
    'settings',
    'roundSetup',
    'holePlay',
  ]),
  multiplayerAccess: new Set(['home', 'multiplayerAccess', 'multiplayerLobby']),
  multiplayerLobby: new Set([
    'home',
    'multiplayerAccess',
    'multiplayerLobby',
    'roundSetup',
    'holePlay',
    'holeResults',
    'leaderboard',
    'endRound',
  ]),
  profile: new Set(['home', 'profile', 'settings', 'multiplayerAccess']),
  settings: new Set(['home', 'profile', 'settings', 'multiplayerAccess']),
  roundSetup: new Set(['home', 'roundSetup', 'holePlay']),
  holePlay: new Set(['home', 'roundSetup', 'holePlay', 'holeResults', 'leaderboard']),
  holeResults: new Set(['home', 'holePlay', 'holeResults', 'leaderboard']),
  leaderboard: new Set(['home', 'holePlay', 'holeResults', 'leaderboard', 'endRound']),
  endRound: new Set(['home', 'endRound']),
}

function hasAnyDealtCardsForHole(roundState: RoundState, holeIndex: number): boolean {
  const holeCardState = roundState.holeCards[holeIndex]
  const hasPersonalCards = roundState.players.some((player) => {
    const dealtCards = holeCardState?.dealtPersonalCardsByPlayerId[player.id] ?? []
    return dealtCards.length > 0
  })

  return hasPersonalCards || (holeCardState?.publicCards.length ?? 0) > 0
}

function hasAnyAssignedPowerUpsForHole(roundState: RoundState, holeIndex: number): boolean {
  const holePowerUpState = roundState.holePowerUps[holeIndex]

  return roundState.players.some((player) =>
    Boolean(
      holePowerUpState?.assignedPowerUpIdByPlayerId[player.id] ??
        holePowerUpState?.assignedCurseIdByPlayerId[player.id],
    ),
  )
}

function hasAnyHoleStarted(roundState: RoundState): boolean {
  return roundState.holes.some((_hole, holeIndex) => {
    const holeResultState = roundState.holeResults[holeIndex]
    const hasAnyStrokes = roundState.players.some(
      (player) => typeof holeResultState?.strokesByPlayerId[player.id] === 'number',
    )

    return (
      hasAnyStrokes ||
      hasAnyDealtCardsForHole(roundState, holeIndex) ||
      hasAnyAssignedPowerUpsForHole(roundState, holeIndex)
    )
  })
}

function hasAnyHoleResultsProgress(roundState: RoundState, holeIndex: number): boolean {
  const holeResultState = roundState.holeResults[holeIndex]

  if (!holeResultState) {
    return false
  }

  const hasAnyStrokes = roundState.players.some(
    (player) => typeof holeResultState.strokesByPlayerId[player.id] === 'number',
  )
  const hasAnyMissionResolution = roundState.players.some((player) => {
    const missionStatus = holeResultState.missionStatusByPlayerId[player.id]
    return missionStatus === 'success' || missionStatus === 'failed'
  })
  const hasAnyPublicResolution = Object.keys(holeResultState.publicCardResolutionsByCardId).length > 0

  return hasAnyStrokes || hasAnyMissionResolution || hasAnyPublicResolution
}

function areHoleStrokesComplete(roundState: RoundState, holeIndex: number): boolean {
  const holeResultState = roundState.holeResults[holeIndex]

  return roundState.players.every(
    (player) => typeof holeResultState?.strokesByPlayerId[player.id] === 'number',
  )
}

function areMissionsResolved(roundState: RoundState, holeIndex: number): boolean {
  if (roundState.config.gameMode === 'powerUps') {
    return true
  }

  const holeResultState = roundState.holeResults[holeIndex]
  const holeCardState = roundState.holeCards[holeIndex]

  return roundState.players.every((player) => {
    const dealtCards = holeCardState?.dealtPersonalCardsByPlayerId[player.id] ?? []
    if (dealtCards.length === 0) {
      return true
    }

    const missionStatus = holeResultState?.missionStatusByPlayerId[player.id]
    return missionStatus === 'success' || missionStatus === 'failed'
  })
}

function arePublicCardsResolved(roundState: RoundState, holeIndex: number): boolean {
  if (roundState.config.gameMode === 'powerUps') {
    return true
  }

  const holeCardState = roundState.holeCards[holeIndex]
  const holeResultState = roundState.holeResults[holeIndex]
  const publicCards = holeCardState?.publicCards ?? []

  if (publicCards.length === 0) {
    return true
  }

  const normalizedResolutions = normalizePublicCardResolutions(
    publicCards,
    holeResultState?.publicCardResolutionsByCardId,
  )
  const playerIds = roundState.players.map((player) => player.id)

  return publicCards.every((card) =>
    isPublicCardResolutionComplete(card, normalizedResolutions[card.id], playerIds),
  )
}

function isHoleComplete(roundState: RoundState, holeIndex: number): boolean {
  return (
    areHoleStrokesComplete(roundState, holeIndex) &&
    areMissionsResolved(roundState, holeIndex) &&
    arePublicCardsResolved(roundState, holeIndex)
  )
}

function canTransitionScreen(currentScreen: AppScreen, nextScreen: AppScreen): boolean {
  return SCREEN_TRANSITIONS[currentScreen]?.has(nextScreen) ?? false
}

function getClampedHoleIndex(roundState: RoundState): number {
  if (roundState.holes.length === 0) {
    return 0
  }

  return Math.min(Math.max(roundState.currentHoleIndex, 0), roundState.holes.length - 1)
}

function isHolePreparedForPlay(roundState: RoundState, holeIndex: number): boolean {
  return (
    hasAnyDealtCardsForHole(roundState, holeIndex) ||
    hasAnyAssignedPowerUpsForHole(roundState, holeIndex)
  )
}

export function canTransitionWithRoundState(
  currentScreen: AppScreen,
  nextScreen: AppScreen,
  roundState: RoundState,
): boolean {
  if (!canTransitionScreen(currentScreen, nextScreen)) {
    return false
  }

  if (roundState.holes.length === 0) {
    return (
      nextScreen === 'home' ||
      nextScreen === 'roundSetup' ||
      nextScreen === 'multiplayerAccess' ||
      nextScreen === 'multiplayerLobby'
    )
  }

  const currentHoleIndex = getClampedHoleIndex(roundState)
  const isLastHole = currentHoleIndex === roundState.holes.length - 1

  if (currentScreen === 'holePlay' && nextScreen === 'holeResults') {
    return isHolePreparedForPlay(roundState, currentHoleIndex)
  }

  if (currentScreen === 'holeResults' && nextScreen === 'holePlay') {
    return true
  }

  if (currentScreen === 'holePlay' && nextScreen === 'roundSetup') {
    return currentHoleIndex === 0
  }

  if (currentScreen === 'holePlay' && nextScreen === 'leaderboard') {
    if (currentHoleIndex === 0) {
      return false
    }

    return isHoleComplete(roundState, currentHoleIndex - 1)
  }

  if (currentScreen === 'holeResults' && nextScreen === 'leaderboard') {
    return isHoleComplete(roundState, currentHoleIndex)
  }

  if (currentScreen === 'leaderboard' && nextScreen === 'endRound') {
    return isLastHole && isHoleComplete(roundState, currentHoleIndex)
  }

  if (currentScreen === 'leaderboard' && nextScreen === 'holePlay') {
    if (isLastHole && isHoleComplete(roundState, currentHoleIndex)) {
      return false
    }

    const previousHoleIndex = currentHoleIndex - 1
    return previousHoleIndex < 0 || isHoleComplete(roundState, previousHoleIndex)
  }

  return true
}

export function getResumeScreen(roundState: RoundState): AppScreen {
  if (roundState.holes.length === 0) {
    return 'roundSetup'
  }

  const currentHoleIndex = Math.min(
    Math.max(roundState.currentHoleIndex, 0),
    roundState.holes.length - 1,
  )

  if (!hasAnyHoleStarted(roundState)) {
    return 'roundSetup'
  }

  if (isHoleComplete(roundState, currentHoleIndex)) {
    const isLastHole = currentHoleIndex === roundState.holes.length - 1
    return isLastHole ? 'endRound' : 'leaderboard'
  }

  const isHoleStarted =
    hasAnyDealtCardsForHole(roundState, currentHoleIndex) ||
    hasAnyAssignedPowerUpsForHole(roundState, currentHoleIndex)

  if (isHoleStarted) {
    return hasAnyHoleResultsProgress(roundState, currentHoleIndex)
      ? 'holeResults'
      : 'holePlay'
  }

  return 'holePlay'
}
