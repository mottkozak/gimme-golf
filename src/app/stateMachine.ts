import {
  isPublicCardResolutionComplete,
  normalizePublicCardResolutions,
} from '../logic/publicCardResolution.ts'
import { createNewRoundState, resetRoundProgress } from '../logic/roundLifecycle.ts'
import { recalculateRoundTotals } from '../logic/scoring.ts'
import type { RoundState } from '../types/game.ts'
import type { AppScreen } from './router.tsx'

export interface AppState {
  activeScreen: AppScreen
  roundState: RoundState
  hasSavedRound: boolean
  shouldPersistRoundState: boolean
}

export type AppAction =
  | { type: 'navigate'; screen: AppScreen }
  | { type: 'update_round_state'; updater: (currentState: RoundState) => RoundState }
  | { type: 'resume_saved_round'; savedRoundState: RoundState | null }
  | { type: 'reset_round' }
  | { type: 'abandon_round' }
  | { type: 'mark_persisted' }

const SCREEN_TRANSITIONS: Record<AppScreen, ReadonlySet<AppScreen>> = {
  home: new Set(['home', 'roundSetup', 'holePlay']),
  roundSetup: new Set(['home', 'roundSetup', 'holePlay']),
  holePlay: new Set(['home', 'holePlay', 'holeResults']),
  holeResults: new Set(['home', 'holeResults', 'leaderboard']),
  leaderboard: new Set(['home', 'holePlay', 'leaderboard', 'endRound']),
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
    Boolean(holePowerUpState?.assignedPowerUpIdByPlayerId[player.id]),
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

export function createInitialAppState(savedRoundState: RoundState | null): AppState {
  const hydratedRoundState = recalculateRoundTotals(savedRoundState ?? createNewRoundState())

  return {
    activeScreen: 'home',
    roundState: hydratedRoundState,
    hasSavedRound: Boolean(savedRoundState),
    shouldPersistRoundState: false,
  }
}

export function reduceAppState(state: AppState, action: AppAction): AppState {
  if (action.type === 'navigate') {
    if (!canTransitionScreen(state.activeScreen, action.screen)) {
      return state
    }

    return {
      ...state,
      activeScreen: action.screen,
    }
  }

  if (action.type === 'update_round_state') {
    return {
      ...state,
      hasSavedRound: true,
      shouldPersistRoundState: true,
      roundState: recalculateRoundTotals(action.updater(state.roundState)),
    }
  }

  if (action.type === 'resume_saved_round') {
    if (!action.savedRoundState) {
      return {
        ...state,
        hasSavedRound: false,
      }
    }

    const resumedRoundState = recalculateRoundTotals(action.savedRoundState)
    return {
      ...state,
      activeScreen: getResumeScreen(resumedRoundState),
      roundState: resumedRoundState,
      hasSavedRound: true,
      shouldPersistRoundState: false,
    }
  }

  if (action.type === 'reset_round') {
    return {
      ...state,
      activeScreen: 'home',
      hasSavedRound: true,
      shouldPersistRoundState: true,
      roundState: recalculateRoundTotals(resetRoundProgress(state.roundState)),
    }
  }

  if (action.type === 'abandon_round') {
    return {
      ...state,
      activeScreen: 'home',
      hasSavedRound: false,
      shouldPersistRoundState: false,
      roundState: recalculateRoundTotals(createNewRoundState()),
    }
  }

  if (action.type === 'mark_persisted') {
    if (!state.shouldPersistRoundState) {
      return state
    }

    return {
      ...state,
      shouldPersistRoundState: false,
    }
  }

  return state
}
