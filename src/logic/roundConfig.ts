import { normalizeEnabledPackIds } from '../data/cardPacks.ts'
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
  const enabledPackIds = normalizeEnabledPackIds(config.enabledPackIds)
  const autoAssignOne = Boolean(config.toggles.autoAssignOne)
  const hasChaosPack = enabledPackIds.includes('chaos')
  const hasPropsPack = enabledPackIds.includes('props')

  return {
    ...config,
    enabledPackIds,
    toggles: {
      ...config.toggles,
      drawTwoPickOne: !autoAssignOne,
      autoAssignOne,
      enableChaosCards: hasChaosPack,
      enablePropCards: hasPropsPack,
    },
  }
}
