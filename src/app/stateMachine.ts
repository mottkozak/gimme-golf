import { resetRoundProgress } from '../logic/roundLifecycle.ts'
import type { RoundState } from '../types/game.ts'
import type { AppScreen } from './router.tsx'
import { buildInitialRoundState, buildNewRoundStateWithProfile, normalizeRoundState } from './roundStateNormalization.ts'
import { canTransitionWithRoundState, getResumeScreen } from './screenTransitionPolicy.ts'

export interface AppState {
  activeScreen: AppScreen
  roundState: RoundState
  hasSavedRound: boolean
  savedRoundUpdatedAtMs: number | null
  roundSaveWarning: string | null
  shouldPersistRoundState: boolean
}

export type AppAction =
  | { type: 'navigate'; screen: AppScreen }
  | { type: 'update_round_state'; updater: (currentState: RoundState) => RoundState }
  | { type: 'resume_saved_round'; savedRoundState: RoundState | null; savedAtMs: number | null }
  | { type: 'reset_round' }
  | { type: 'abandon_round' }
  | { type: 'clear_saved_round_flag' }
  | { type: 'mark_persisted'; savedAtMs: number | null }

const ROUND_SAVE_WARNING =
  'Local save is unavailable. Keep this app open to avoid losing round progress.'
const SAVED_ROUND_UNAVAILABLE_WARNING =
  'Saved round was unavailable. Start a new round to continue.'

export { getResumeScreen }

export function createInitialAppState(
  savedRoundState: RoundState | null,
  savedRoundUpdatedAtMs: number | null = null,
): AppState {
  return {
    activeScreen: 'home',
    roundState: buildInitialRoundState(savedRoundState),
    hasSavedRound: Boolean(savedRoundState),
    savedRoundUpdatedAtMs,
    roundSaveWarning: null,
    shouldPersistRoundState: false,
  }
}

export function reduceAppState(state: AppState, action: AppAction): AppState {
  if (action.type === 'navigate') {
    if (!canTransitionWithRoundState(state.activeScreen, action.screen, state.roundState)) {
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
      roundState: normalizeRoundState(action.updater(state.roundState)),
    }
  }

  if (action.type === 'resume_saved_round') {
    if (!action.savedRoundState) {
      return {
        ...state,
        hasSavedRound: false,
        savedRoundUpdatedAtMs: null,
        roundSaveWarning: SAVED_ROUND_UNAVAILABLE_WARNING,
      }
    }

    const resumedRoundState = normalizeRoundState(action.savedRoundState)
    return {
      ...state,
      activeScreen: getResumeScreen(resumedRoundState),
      roundState: resumedRoundState,
      hasSavedRound: true,
      savedRoundUpdatedAtMs: action.savedAtMs,
      roundSaveWarning: null,
      shouldPersistRoundState: false,
    }
  }

  if (action.type === 'reset_round') {
    return {
      ...state,
      activeScreen: 'home',
      hasSavedRound: true,
      roundSaveWarning: null,
      shouldPersistRoundState: true,
      roundState: normalizeRoundState(resetRoundProgress(state.roundState)),
    }
  }

  if (action.type === 'abandon_round') {
    return {
      ...state,
      activeScreen: 'home',
      hasSavedRound: false,
      savedRoundUpdatedAtMs: null,
      roundSaveWarning: null,
      shouldPersistRoundState: false,
      roundState: buildNewRoundStateWithProfile(),
    }
  }

  if (action.type === 'clear_saved_round_flag') {
    return {
      ...state,
      hasSavedRound: false,
      savedRoundUpdatedAtMs: null,
      roundSaveWarning: null,
      shouldPersistRoundState: false,
    }
  }

  if (action.type === 'mark_persisted') {
    if (!state.shouldPersistRoundState) {
      return state
    }

    return {
      ...state,
      savedRoundUpdatedAtMs:
        typeof action.savedAtMs === 'number' ? action.savedAtMs : state.savedRoundUpdatedAtMs,
      roundSaveWarning: action.savedAtMs === null ? ROUND_SAVE_WARNING : null,
      shouldPersistRoundState: false,
    }
  }

  return state
}
