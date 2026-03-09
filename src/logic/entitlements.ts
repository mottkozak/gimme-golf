import type { CardPackId } from '../types/cards.ts'

const ENTITLEMENT_STORAGE_KEY = 'gimme-golf-entitlements-v1'

export interface EntitlementState {
  premiumPacksActive: boolean
  unlockedPremiumTiers: string[]
}

export interface PackEntitlement {
  packId: CardPackId
  isUnlocked: boolean
  premiumTier: string | null
}

const DEFAULT_ENTITLEMENT_STATE: EntitlementState = {
  premiumPacksActive: false,
  unlockedPremiumTiers: [],
}

function getStorage(): Storage | null {
  if (typeof globalThis.localStorage === 'undefined') {
    return null
  }

  return globalThis.localStorage
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeEntitlementState(candidateState: unknown): EntitlementState {
  if (!isRecord(candidateState)) {
    return DEFAULT_ENTITLEMENT_STATE
  }

  const unlockedPremiumTiers = Array.isArray(candidateState.unlockedPremiumTiers)
    ? candidateState.unlockedPremiumTiers.filter((tier): tier is string => typeof tier === 'string')
    : []

  return {
    premiumPacksActive: candidateState.premiumPacksActive === true,
    unlockedPremiumTiers: Array.from(new Set(unlockedPremiumTiers)),
  }
}

export function loadEntitlementState(): EntitlementState {
  const storage = getStorage()
  if (!storage) {
    return DEFAULT_ENTITLEMENT_STATE
  }

  const rawValue = storage.getItem(ENTITLEMENT_STORAGE_KEY)
  if (!rawValue) {
    return DEFAULT_ENTITLEMENT_STATE
  }

  try {
    return normalizeEntitlementState(JSON.parse(rawValue))
  } catch {
    return DEFAULT_ENTITLEMENT_STATE
  }
}

export function saveEntitlementState(nextState: EntitlementState): void {
  const storage = getStorage()
  if (!storage) {
    return
  }

  storage.setItem(
    ENTITLEMENT_STORAGE_KEY,
    JSON.stringify(normalizeEntitlementState(nextState)),
  )
}

export function setPremiumPacksActive(isActive: boolean): void {
  const currentState = loadEntitlementState()
  saveEntitlementState({
    ...currentState,
    premiumPacksActive: isActive,
  })
}

export function grantPremiumTier(premiumTier: string): void {
  if (!premiumTier) {
    return
  }

  const currentState = loadEntitlementState()
  saveEntitlementState({
    ...currentState,
    unlockedPremiumTiers: Array.from(new Set([...currentState.unlockedPremiumTiers, premiumTier])),
  })
}

export function clearEntitlementState(): void {
  const storage = getStorage()
  if (!storage) {
    return
  }

  storage.removeItem(ENTITLEMENT_STORAGE_KEY)
}

export function getPackEntitlement(packId: CardPackId, premiumTier: string | null): PackEntitlement {
  const entitlementState = loadEntitlementState()
  const hasPremiumAccess =
    !premiumTier ||
    !entitlementState.premiumPacksActive ||
    entitlementState.unlockedPremiumTiers.includes(premiumTier)

  return {
    packId,
    premiumTier,
    isUnlocked: hasPremiumAccess,
  }
}

export function isPackUnlocked(packId: CardPackId, premiumTier: string | null): boolean {
  return getPackEntitlement(packId, premiumTier).isUnlocked
}
