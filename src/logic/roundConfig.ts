import { normalizeEnabledPackIds } from '../data/cardPacks.ts'
import { normalizeFeaturedHolesConfig } from './featuredHoles.ts'
import { normalizePresetConfig } from './gameModePresets.ts'
import type { CardPackId } from '../types/cards.ts'
import type { RoundConfig } from '../types/game.ts'

export function toggleEnabledPack(
  enabledPackIds: CardPackId[],
  packId: CardPackId,
  shouldEnable: boolean,
): CardPackId[] {
  const nextSet = new Set(enabledPackIds)

  if (shouldEnable) {
    nextSet.add(packId)
  } else {
    nextSet.delete(packId)
  }

  return normalizeEnabledPackIds(Array.from(nextSet))
}

export function normalizeRoundConfig(config: RoundConfig): RoundConfig {
  const presetConfig = normalizePresetConfig(config)
  const gameMode = presetConfig.gameMode === 'powerUps' ? 'powerUps' : 'cards'
  const enabledPackIds =
    gameMode === 'powerUps' ? [] : normalizeEnabledPackIds(presetConfig.enabledPackIds)
  const autoAssignOne = Boolean(presetConfig.toggles.autoAssignOne)
  const momentumBonuses =
    typeof presetConfig.toggles.momentumBonuses === 'boolean'
      ? presetConfig.toggles.momentumBonuses
      : true
  const hasChaosPack = enabledPackIds.includes('chaos')
  const hasPropsPack = enabledPackIds.includes('props')
  const featuredHoles = normalizeFeaturedHolesConfig(
    presetConfig.featuredHoles,
    gameMode === 'cards',
  )
  const featuredHolesForMode =
    gameMode === 'powerUps'
      ? {
          ...featuredHoles,
          enabled: false,
        }
      : featuredHoles

  return {
    ...presetConfig,
    gameMode,
    enabledPackIds,
    featuredHoles: featuredHolesForMode,
    toggles: {
      ...presetConfig.toggles,
      momentumBonuses,
      drawTwoPickOne: !autoAssignOne,
      autoAssignOne,
      enableChaosCards: gameMode === 'cards' ? hasChaosPack : false,
      enablePropCards: gameMode === 'cards' ? hasPropsPack : false,
    },
  }
}
