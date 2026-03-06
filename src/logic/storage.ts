import type { RoundState } from '../types/game.ts'

const ACTIVE_ROUND_STORAGE_KEY = 'gimme-golf-active-round-v1'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
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
    Array.isArray(value.players) &&
    Array.isArray(value.holes) &&
    Array.isArray(value.holeCards) &&
    Array.isArray(value.holeResults) &&
    isRecord(value.totalsByPlayerId) &&
    typeof value.currentHoleIndex === 'number' &&
    typeof config.toggles.dynamicDifficulty === 'boolean' &&
    typeof config.toggles.drawTwoPickOne === 'boolean' &&
    typeof config.toggles.autoAssignOne === 'boolean' &&
    typeof config.toggles.enableChaosCards === 'boolean' &&
    typeof config.toggles.enablePropCards === 'boolean'
  )
}

export function saveRoundState(roundState: RoundState): void {
  localStorage.setItem(ACTIVE_ROUND_STORAGE_KEY, JSON.stringify(roundState))
}

export function loadRoundState(): RoundState | null {
  const rawValue = localStorage.getItem(ACTIVE_ROUND_STORAGE_KEY)

  if (!rawValue) {
    return null
  }

  try {
    const parsedValue = JSON.parse(rawValue)

    if (!isRoundStateLike(parsedValue)) {
      return null
    }

    return parsedValue
  } catch {
    return null
  }
}

export function clearRoundState(): void {
  localStorage.removeItem(ACTIVE_ROUND_STORAGE_KEY)
}
