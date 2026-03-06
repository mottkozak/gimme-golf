import type { CardPackId } from '../types/cards.ts'

export interface PackEntitlement {
  packId: CardPackId
  isUnlocked: boolean
  premiumTier: string | null
}

// Placeholder entitlement layer for future premium gating.
// All packs are currently unlocked by design.
export function getPackEntitlement(packId: CardPackId, premiumTier: string | null): PackEntitlement {
  return {
    packId,
    isUnlocked: true,
    premiumTier,
  }
}

export function isPackUnlocked(packId: CardPackId, premiumTier: string | null): boolean {
  return getPackEntitlement(packId, premiumTier).isUnlocked
}
