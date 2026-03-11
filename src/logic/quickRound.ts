import type { RoundState } from '../types/game.ts'
import { DEFAULT_GAME_MODE_PRESET_ID } from '../data/gameModePresets.ts'
import { createFeaturedHolesRandomSeed } from './featuredHoles.ts'
import { applyGameModePreset } from './gameModePresets.ts'
import { applyRoundSetupDraft, resizeHoles } from './roundSetup.ts'

export function applyQuickRoundDefaults(roundState: RoundState): RoundState {
  const quickConfig = applyGameModePreset(
    {
      ...roundState.config,
      holeCount: 9,
      courseStyle: 'standard',
      featuredHoles: {
        ...roundState.config.featuredHoles,
        randomSeed: createFeaturedHolesRandomSeed(),
      },
    },
    DEFAULT_GAME_MODE_PRESET_ID,
  )

  const quickRoundState = applyRoundSetupDraft(roundState, {
    config: quickConfig,
    players: roundState.players,
    holes: resizeHoles(roundState.holes, 9, 'standard'),
  })

  return {
    ...quickRoundState,
    currentHoleIndex: 0,
  }
}
