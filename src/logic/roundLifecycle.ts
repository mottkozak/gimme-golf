import type { Player, RoundConfig, RoundState } from '../types/game.ts'
import { getDefaultEnabledPackIds } from '../data/cardPacks.ts'
import { buildEmptyHolePowerUpStates } from './powerUps.ts'
import { applyRoundSetupDraft, DEFAULT_EXPECTED_SCORE } from './roundSetup.ts'
import { createPlayerTotals } from './scoring.ts'
import { DEFAULT_FEATURED_HOLES_CONFIG } from './featuredHoles.ts'

const DEFAULT_ROUND_CONFIG: RoundConfig = {
  holeCount: 9,
  courseStyle: 'standard',
  gameMode: 'cards',
  enabledPackIds: getDefaultEnabledPackIds(),
  featuredHoles: DEFAULT_FEATURED_HOLES_CONFIG,
  toggles: {
    dynamicDifficulty: true,
    momentumBonuses: true,
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
    holePowerUps: [],
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
    holePowerUps: buildEmptyHolePowerUpStates(
      initializedRoundState.players,
      initializedRoundState.holes,
    ),
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
    holePowerUps: [],
    holeResults: [],
    totalsByPlayerId: createZeroTotalsByPlayerId(roundState.players),
  }

  const resetRoundState = applyRoundSetupDraft(resetBaseState, setupDraft)

  return {
    ...resetRoundState,
    currentHoleIndex: 0,
    holePowerUps: buildEmptyHolePowerUpStates(resetRoundState.players, resetRoundState.holes),
    totalsByPlayerId: createZeroTotalsByPlayerId(resetRoundState.players),
  }
}
