import { normalizeEnabledPackIds } from '../data/cardPacks.ts'
import { normalizeFeaturedHolesConfig } from './featuredHoles.ts'
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
  const gameMode = config.gameMode === 'powerUps' ? 'powerUps' : 'cards'
  const enabledPackIds = normalizeEnabledPackIds(config.enabledPackIds)
  const autoAssignOne = Boolean(config.toggles.autoAssignOne)
  const momentumBonuses =
    typeof config.toggles.momentumBonuses === 'boolean' ? config.toggles.momentumBonuses : true
  const hasChaosPack = enabledPackIds.includes('chaos')
  const hasPropsPack = enabledPackIds.includes('props')
  const featuredHoles = normalizeFeaturedHolesConfig(
    config.featuredHoles,
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
    ...config,
    gameMode,
    enabledPackIds,
    featuredHoles: featuredHolesForMode,
    toggles: {
      ...config.toggles,
      momentumBonuses,
      drawTwoPickOne: !autoAssignOne,
      autoAssignOne,
      enableChaosCards: gameMode === 'cards' ? hasChaosPack : false,
      enablePropCards: gameMode === 'cards' ? hasPropsPack : false,
    },
  }
}
