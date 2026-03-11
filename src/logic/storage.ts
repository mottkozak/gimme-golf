import type { RoundState } from '../types/game.ts'

export const ACTIVE_ROUND_STORAGE_KEY = 'gimme-golf-active-round-v1'

interface PersistedRoundStateEnvelope {
  roundState: RoundState
  savedAtMs: number
}

export interface RoundStateSnapshot {
  roundState: RoundState | null
  savedAtMs: number | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string')
}

function isBooleanOrUndefined(value: unknown): boolean {
  return typeof value === 'boolean' || typeof value === 'undefined'
}

function isPresetIdOrUndefined(value: unknown): boolean {
  return (
    typeof value === 'undefined' ||
    value === 'casual' ||
    value === 'competitive' ||
    value === 'party' ||
    value === 'balanced' ||
    value === 'powerUps' ||
    value === 'custom'
  )
}

function isFeaturedHolesConfigLike(value: unknown): boolean {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.enabled === 'boolean' &&
    (value.frequency === 'low' || value.frequency === 'normal' || value.frequency === 'high') &&
    (value.assignmentMode === 'auto' || value.assignmentMode === 'manual') &&
    (typeof value.randomSeed === 'number' || typeof value.randomSeed === 'undefined')
  )
}

function isDeckMemoryLike(value: unknown): boolean {
  if (!isRecord(value)) {
    return false
  }

  return isStringArray(value.usedPersonalCardIds) && isStringArray(value.usedPublicCardIds)
}

function isRoundStateLike(value: unknown): value is RoundState {
  if (!isRecord(value)) {
    return false
  }

  const config = value.config

  if (!isRecord(config) || !isRecord(config.toggles)) {
    return false
  }

  return (
    (config.holeCount === 9 || config.holeCount === 18) &&
    (config.courseStyle === 'par3' ||
      config.courseStyle === 'standard' ||
      config.courseStyle === 'custom') &&
    (config.gameMode === undefined ||
      config.gameMode === 'cards' ||
      config.gameMode === 'powerUps') &&
    isPresetIdOrUndefined(config.selectedPresetId) &&
    (config.customModeName === undefined || typeof config.customModeName === 'string') &&
    Array.isArray(value.players) &&
    Array.isArray(value.holes) &&
    Array.isArray(value.holeCards) &&
    (value.holePowerUps === undefined || Array.isArray(value.holePowerUps)) &&
    Array.isArray(value.holeResults) &&
    (value.holeUxMetrics === undefined || Array.isArray(value.holeUxMetrics)) &&
    (value.deckMemory === undefined || isDeckMemoryLike(value.deckMemory)) &&
    isRecord(value.totalsByPlayerId) &&
    typeof value.currentHoleIndex === 'number' &&
    typeof config.toggles.dynamicDifficulty === 'boolean' &&
    isBooleanOrUndefined(config.toggles.momentumBonuses) &&
    typeof config.toggles.drawTwoPickOne === 'boolean' &&
    typeof config.toggles.autoAssignOne === 'boolean' &&
    typeof config.toggles.enableChaosCards === 'boolean' &&
    typeof config.toggles.enablePropCards === 'boolean' &&
    (config.featuredHoles === undefined || isFeaturedHolesConfigLike(config.featuredHoles)) &&
    (config.enabledPackIds === undefined || isStringArray(config.enabledPackIds))
  )
}

function isPersistedRoundStateEnvelope(value: unknown): value is PersistedRoundStateEnvelope {
  return (
    isRecord(value) &&
    isRoundStateLike(value.roundState) &&
    typeof value.savedAtMs === 'number' &&
    Number.isFinite(value.savedAtMs)
  )
}

function hasStructurallyValidRoundState(roundState: RoundState): boolean {
  const holesLength = roundState.holes.length
  const uniquePlayerIds = new Set(roundState.players.map((player) => player.id))
  const hasValidCurrentHoleIndex =
    Number.isInteger(roundState.currentHoleIndex) &&
    roundState.currentHoleIndex >= 0 &&
    roundState.currentHoleIndex < holesLength
  const hasRequiredArrayLengths =
    roundState.holeCards.length === holesLength && roundState.holeResults.length === holesLength
  const hasOptionalArrayLengths =
    roundState.holePowerUps.length === holesLength && roundState.holeUxMetrics.length === holesLength

  return (
    roundState.players.length > 0 &&
    uniquePlayerIds.size === roundState.players.length &&
    roundState.players.every(
      (player) =>
        typeof player.id === 'string' &&
        player.id.length > 0 &&
        typeof player.name === 'string' &&
        typeof player.expectedScore18 === 'number',
    ) &&
    holesLength > 0 &&
    holesLength === roundState.config.holeCount &&
    hasRequiredArrayLengths &&
    hasOptionalArrayLengths &&
    hasValidCurrentHoleIndex
  )
}

function clampCurrentHoleIndex(roundState: RoundState): RoundState {
  const clampedCurrentHoleIndex = Math.min(
    Math.max(roundState.currentHoleIndex, 0),
    Math.max(roundState.holes.length - 1, 0),
  )

  if (clampedCurrentHoleIndex === roundState.currentHoleIndex) {
    return roundState
  }

  return {
    ...roundState,
    currentHoleIndex: clampedCurrentHoleIndex,
  }
}

export function saveRoundState(roundState: RoundState): number | null {
  const savedAtMs = Date.now()

  try {
    const nextEnvelope: PersistedRoundStateEnvelope = {
      roundState,
      savedAtMs,
    }
    localStorage.setItem(ACTIVE_ROUND_STORAGE_KEY, JSON.stringify(nextEnvelope))
    return savedAtMs
  } catch {
    return null
  }
}

export function loadRoundStateSnapshot(): RoundStateSnapshot {
  const rawValue = localStorage.getItem(ACTIVE_ROUND_STORAGE_KEY)

  if (!rawValue) {
    return {
      roundState: null,
      savedAtMs: null,
    }
  }

  try {
    const parsedValue = JSON.parse(rawValue)
    const parsedEnvelope = isPersistedRoundStateEnvelope(parsedValue) ? parsedValue : null
    const roundStateCandidate =
      parsedEnvelope?.roundState ?? (isRoundStateLike(parsedValue) ? parsedValue : null)

    if (!roundStateCandidate || !hasStructurallyValidRoundState(roundStateCandidate)) {
      clearRoundState()
      return {
        roundState: null,
        savedAtMs: null,
      }
    }

    return {
      roundState: clampCurrentHoleIndex(roundStateCandidate),
      savedAtMs: parsedEnvelope ? Math.round(parsedEnvelope.savedAtMs) : null,
    }
  } catch {
    clearRoundState()
    return {
      roundState: null,
      savedAtMs: null,
    }
  }
}

export function loadRoundState(): RoundState | null {
  return loadRoundStateSnapshot().roundState
}

export function clearRoundState(): void {
  localStorage.removeItem(ACTIVE_ROUND_STORAGE_KEY)
}
