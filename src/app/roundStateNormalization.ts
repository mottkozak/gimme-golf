import { loadAccountProfile } from '../logic/account.ts'
import { createNewRoundState } from '../logic/roundLifecycle.ts'
import { normalizeExpectedScore } from '../logic/roundSetup.ts'
import { recalculateRoundTotals } from '../logic/scoring.ts'
import type { RoundState } from '../types/game.ts'

function applyAccountProfileToFirstPlayer(roundState: RoundState): RoundState {
  const profile = loadAccountProfile()
  if (!profile || roundState.players.length === 0) {
    return roundState
  }

  const [first, ...rest] = roundState.players
  return {
    ...roundState,
    players: [
      {
        ...first,
        name: profile.displayName.trim() || first.name,
        expectedScore18: normalizeExpectedScore(profile.expectedScore18),
      },
      ...rest,
    ],
  }
}

function getClampedHoleIndex(roundState: RoundState): number {
  if (roundState.holes.length === 0) {
    return 0
  }

  return Math.min(Math.max(roundState.currentHoleIndex, 0), roundState.holes.length - 1)
}

function clampRoundHoleIndex(roundState: RoundState): RoundState {
  const clampedHoleIndex = getClampedHoleIndex(roundState)

  if (roundState.currentHoleIndex === clampedHoleIndex) {
    return roundState
  }

  return {
    ...roundState,
    currentHoleIndex: clampedHoleIndex,
  }
}

export function normalizeRoundState(roundState: RoundState): RoundState {
  return clampRoundHoleIndex(recalculateRoundTotals(roundState))
}

export function buildInitialRoundState(savedRoundState: RoundState | null): RoundState {
  const baseRoundState = savedRoundState ?? createNewRoundState()
  const roundStateWithProfile =
    savedRoundState == null ? applyAccountProfileToFirstPlayer(baseRoundState) : baseRoundState

  return normalizeRoundState(roundStateWithProfile)
}

export function buildNewRoundStateWithProfile(): RoundState {
  return normalizeRoundState(applyAccountProfileToFirstPlayer(createNewRoundState()))
}
