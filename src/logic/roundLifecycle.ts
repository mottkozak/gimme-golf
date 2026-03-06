import type { Player, RoundConfig, RoundState } from '../types/game.ts'
import { applyRoundSetupDraft, DEFAULT_EXPECTED_SCORE } from './roundSetup.ts'
import { createPlayerTotals } from './scoring.ts'

const DEFAULT_ROUND_CONFIG: RoundConfig = {
  holeCount: 9,
  courseStyle: 'standard',
  toggles: {
    dynamicDifficulty: true,
    drawTwoPickOne: true,
    autoAssignOne: false,
    enableChaosCards: true,
    enablePropCards: true,
  },
}

const DEFAULT_PLAYERS: Player[] = [
  {
    id: 'player-1',
    name: 'Golfer 1',
    expectedScore18: DEFAULT_EXPECTED_SCORE,
  },
]

function createBaseRoundState(config: RoundConfig, players: Player[]): RoundState {
  return {
    config,
    players,
    holes: [],
    currentHoleIndex: 0,
    holeCards: [],
    holeResults: [],
    totalsByPlayerId: Object.fromEntries(
      players.map((player) => [player.id, createPlayerTotals(0, 0)]),
    ),
  }
}

function createZeroTotalsByPlayerId(players: Player[]): RoundState['totalsByPlayerId'] {
  return Object.fromEntries(players.map((player) => [player.id, createPlayerTotals(0, 0)]))
}

export function createNewRoundState(): RoundState {
  const baseState = createBaseRoundState(DEFAULT_ROUND_CONFIG, DEFAULT_PLAYERS)
  const initializedRoundState = applyRoundSetupDraft(baseState, {
    config: DEFAULT_ROUND_CONFIG,
    players: DEFAULT_PLAYERS,
    holes: [],
  })

  return {
    ...initializedRoundState,
    currentHoleIndex: 0,
    totalsByPlayerId: createZeroTotalsByPlayerId(initializedRoundState.players),
  }
}

export function resetRoundProgress(roundState: RoundState): RoundState {
  const setupDraft = {
    config: roundState.config,
    players: roundState.players,
    holes: roundState.holes,
  }

  const resetBaseState: RoundState = {
    ...roundState,
    currentHoleIndex: 0,
    holeCards: [],
    holeResults: [],
    totalsByPlayerId: createZeroTotalsByPlayerId(roundState.players),
  }

  const resetRoundState = applyRoundSetupDraft(resetBaseState, setupDraft)

  return {
    ...resetRoundState,
    currentHoleIndex: 0,
    totalsByPlayerId: createZeroTotalsByPlayerId(resetRoundState.players),
  }
}
