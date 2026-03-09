import type { Player, RoundConfig, RoundState } from '../types/game.ts'
import {
  DEFAULT_CUSTOM_MODE_NAME,
  DEFAULT_GAME_MODE_PRESET_ID,
  GAME_MODE_PRESETS_BY_ID,
} from '../data/gameModePresets.ts'
import { buildEmptyHolePowerUpStates } from './powerUps.ts'
import { applyRoundSetupDraft, DEFAULT_EXPECTED_SCORE } from './roundSetup.ts'
import { createPlayerTotals } from './scoring.ts'

const DEFAULT_PRESET_SETTINGS = GAME_MODE_PRESETS_BY_ID[DEFAULT_GAME_MODE_PRESET_ID].settings

if (!DEFAULT_PRESET_SETTINGS) {
  throw new Error('Default game mode preset must include settings.')
}

const DEFAULT_ROUND_CONFIG: RoundConfig = {
  holeCount: 9,
  courseStyle: 'standard',
  gameMode: DEFAULT_PRESET_SETTINGS.gameMode,
  selectedPresetId: DEFAULT_GAME_MODE_PRESET_ID,
  customModeName: DEFAULT_CUSTOM_MODE_NAME,
  enabledPackIds: [...DEFAULT_PRESET_SETTINGS.enabledPackIds],
  featuredHoles: {
    ...DEFAULT_PRESET_SETTINGS.featuredHoles,
  },
  toggles: {
    dynamicDifficulty: DEFAULT_PRESET_SETTINGS.toggles.dynamicDifficulty,
    momentumBonuses: DEFAULT_PRESET_SETTINGS.toggles.momentumBonuses,
    drawTwoPickOne: DEFAULT_PRESET_SETTINGS.toggles.drawTwoPickOne,
    autoAssignOne: DEFAULT_PRESET_SETTINGS.toggles.autoAssignOne,
    enableChaosCards: DEFAULT_PRESET_SETTINGS.enabledPackIds.includes('chaos'),
    enablePropCards: DEFAULT_PRESET_SETTINGS.enabledPackIds.includes('props'),
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
