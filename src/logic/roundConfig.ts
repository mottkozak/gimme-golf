import { CARD_PACKS, CARD_PACKS_BY_ID, normalizeEnabledPackIds } from '../data/cardPacks.ts'
import { isPackUnlocked } from './entitlements.ts'
import { normalizeFeaturedHolesConfig } from './featuredHoles.ts'
import { normalizePresetConfig } from './gameModePresets.ts'
import type { CardPackId } from '../types/cards.ts'
import type { RoundConfig } from '../types/game.ts'

function isPackIdUnlocked(packId: CardPackId): boolean {
  const pack = CARD_PACKS_BY_ID[packId]
  if (!pack) {
    return false
  }
  return isPackUnlocked(pack.id, pack.premiumTier)
}

function getDefaultUnlockedPackIds(): CardPackId[] {
  const defaultPackIds = CARD_PACKS
    .filter((pack) => pack.isEnabledByDefault)
    .map((pack) => pack.id)
    .filter(isPackIdUnlocked)

  if (defaultPackIds.length > 0) {
    return normalizeEnabledPackIds(defaultPackIds)
  }

  return ['classic']
}

function filterEnabledPackIdsForEntitlements(enabledPackIds: CardPackId[]): CardPackId[] {
  const unlockedPackIds = enabledPackIds.filter(isPackIdUnlocked)

  if (unlockedPackIds.length > 0) {
    return normalizeEnabledPackIds(unlockedPackIds)
  }

  return getDefaultUnlockedPackIds()
}

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

  return filterEnabledPackIdsForEntitlements(normalizeEnabledPackIds(Array.from(nextSet)))
}

export function normalizeRoundConfig(config: RoundConfig): RoundConfig {
  const presetConfig = normalizePresetConfig(config)
  const gameMode = presetConfig.gameMode === 'powerUps' ? 'powerUps' : 'cards'
  const enabledPackIds = gameMode === 'powerUps'
    ? []
    : filterEnabledPackIdsForEntitlements(normalizeEnabledPackIds(presetConfig.enabledPackIds))
  // Card mode is always pick-one-of-two. Auto-assign is only valid for Power Ups.
  const autoAssignOne = gameMode === 'powerUps'
    ? Boolean(presetConfig.toggles.autoAssignOne)
    : false
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
      drawTwoPickOne: gameMode === 'cards',
      autoAssignOne,
      enableChaosCards: gameMode === 'cards' ? hasChaosPack : false,
      enablePropCards: gameMode === 'cards' ? hasPropsPack : false,
    },
  }
}
