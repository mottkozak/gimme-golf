import type { RoundState } from '../types/game.ts'
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
    'casual',
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
