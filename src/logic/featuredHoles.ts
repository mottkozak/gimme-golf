import { FEATURED_HOLE_TYPE_SEQUENCE } from '../data/featuredHoles.ts'
import type {
  FeaturedHoleAssignmentMode,
  FeaturedHoleFrequency,
  FeaturedHoleType,
  FeaturedHolesConfig,
  HoleCount,
  HoleDefinition,
  Player,
} from '../types/game.ts'

export const DEFAULT_FEATURED_HOLES_CONFIG: FeaturedHolesConfig = {
  enabled: true,
  frequency: 'normal',
  assignmentMode: 'auto',
}

export const FEATURED_HOLE_BALANCE = {
  countByRoundLength: {
    9: {
      low: 1,
      normal: 2,
      high: 3,
    },
    18: {
      low: 2,
      normal: 3,
      high: 5,
    },
  } as Record<HoleCount, Record<FeaturedHoleFrequency, number>>,
  preferredGapByRoundLength: {
    9: {
      low: 4,
      normal: 3,
      high: 2,
    },
    18: {
      low: 6,
      normal: 4,
      high: 3,
    },
  } as Record<HoleCount, Record<FeaturedHoleFrequency, number>>,
  rivalryBonusPoints: 1,
} as const

const VALID_FEATURED_FREQUENCIES: FeaturedHoleFrequency[] = ['low', 'normal', 'high']
const VALID_FEATURED_ASSIGNMENT_MODES: FeaturedHoleAssignmentMode[] = ['auto', 'manual']
const VALID_FEATURED_HOLE_TYPES = new Set<FeaturedHoleType>(FEATURED_HOLE_TYPE_SEQUENCE)

function isFeaturedHoleFrequency(value: unknown): value is FeaturedHoleFrequency {
  return VALID_FEATURED_FREQUENCIES.includes(value as FeaturedHoleFrequency)
}

function isFeaturedHoleAssignmentMode(value: unknown): value is FeaturedHoleAssignmentMode {
  return VALID_FEATURED_ASSIGNMENT_MODES.includes(value as FeaturedHoleAssignmentMode)
}

export function normalizeFeaturedHoleType(value: unknown): FeaturedHoleType | null {
  if (typeof value !== 'string') {
    return null
  }

  return VALID_FEATURED_HOLE_TYPES.has(value as FeaturedHoleType)
    ? (value as FeaturedHoleType)
    : null
}

export function getFeaturedHoleTargetCount(
  holeCount: HoleCount,
  frequency: FeaturedHoleFrequency,
): number {
  return FEATURED_HOLE_BALANCE.countByRoundLength[holeCount][frequency]
}

function clearFeaturedHoles(holes: HoleDefinition[]): HoleDefinition[] {
  return holes.map((hole) => ({
    ...hole,
    featuredHoleType: null,
  }))
}

function hasRequiredGap(
  candidateIndex: number,
  selectedIndexes: number[],
  minGap: number,
): boolean {
  return selectedIndexes.every((selectedIndex) => {
    return Math.abs(selectedIndex - candidateIndex) >= minGap
  })
}

function findClosestAvailableIndex(
  targetIndex: number,
  holeCount: number,
  minHoleIndex: number,
  maxHoleIndex: number,
  selectedIndexes: number[],
  minGap: number,
): number | null {
  const searchWindowSize = maxHoleIndex - minHoleIndex + 1
  for (let offset = 0; offset < searchWindowSize; offset += 1) {
    const candidates = offset === 0
      ? [targetIndex]
      : [targetIndex - offset, targetIndex + offset]

    for (const candidate of candidates) {
      if (candidate < minHoleIndex || candidate > maxHoleIndex || candidate >= holeCount) {
        continue
      }

      if (selectedIndexes.includes(candidate)) {
        continue
      }

      if (hasRequiredGap(candidate, selectedIndexes, minGap)) {
        return candidate
      }
    }
  }

  return null
}

function createSpacedFeaturedHoleIndexes(
  holeCount: number,
  targetCount: number,
  preferredGap: number,
): number[] {
  if (targetCount <= 0 || holeCount <= 0) {
    return []
  }

  const boundedCount = Math.min(targetCount, holeCount)
  const minHoleIndex = holeCount >= 6 ? 1 : 0
  const maxHoleIndex = holeCount >= 6 ? holeCount - 2 : holeCount - 1
  const spacingCandidates = [preferredGap, preferredGap - 1, preferredGap - 2, 1].filter(
    (gap, index, allGaps) => gap >= 1 && allGaps.indexOf(gap) === index,
  )
  const selectedIndexes: number[] = []
  const availableHoleCount = Math.max(1, maxHoleIndex - minHoleIndex + 1)
  const step = (availableHoleCount + 1) / (boundedCount + 1)

  for (let index = 0; index < boundedCount; index += 1) {
    const target = minHoleIndex + Math.round((index + 1) * step) - 1
    let chosen: number | null = null

    for (const spacingGap of spacingCandidates) {
      chosen = findClosestAvailableIndex(
        target,
        holeCount,
        minHoleIndex,
        maxHoleIndex,
        selectedIndexes,
        spacingGap,
      )
      if (chosen !== null) {
        break
      }
    }

    if (chosen === null) {
      chosen = findClosestAvailableIndex(
        target,
        holeCount,
        minHoleIndex,
        maxHoleIndex,
        selectedIndexes,
        0,
      )
    }

    if (chosen === null) {
      continue
    }

    selectedIndexes.push(chosen)
  }

  return selectedIndexes.sort((indexA, indexB) => indexA - indexB)
}

function autoAssignFeaturedHoles(
  holes: HoleDefinition[],
  frequency: FeaturedHoleFrequency,
): HoleDefinition[] {
  const normalizedHoleCount: HoleCount = holes.length === 18 ? 18 : 9
  const targetCount = getFeaturedHoleTargetCount(normalizedHoleCount, frequency)
  const preferredGap =
    FEATURED_HOLE_BALANCE.preferredGapByRoundLength[normalizedHoleCount][frequency]
  const selectedIndexes = createSpacedFeaturedHoleIndexes(
    holes.length,
    targetCount,
    preferredGap,
  )

  return holes.map((hole, holeIndex) => {
    const selectedPosition = selectedIndexes.indexOf(holeIndex)
    const featuredHoleType =
      selectedPosition >= 0
        ? FEATURED_HOLE_TYPE_SEQUENCE[selectedPosition % FEATURED_HOLE_TYPE_SEQUENCE.length]
        : null

    return {
      ...hole,
      featuredHoleType,
    }
  })
}

function preserveManualAssignments(holes: HoleDefinition[]): HoleDefinition[] {
  return holes.map((hole) => ({
    ...hole,
    featuredHoleType: normalizeFeaturedHoleType(hole.featuredHoleType),
  }))
}

export function assignFeaturedHolesForRound(
  holes: HoleDefinition[],
  config: FeaturedHolesConfig,
): HoleDefinition[] {
  if (!config.enabled) {
    return clearFeaturedHoles(holes)
  }

  if (config.assignmentMode === 'manual') {
    const manual = preserveManualAssignments(holes)
    const hasAnyManualAssignment = manual.some((hole) => hole.featuredHoleType !== null)
    if (hasAnyManualAssignment) {
      return manual
    }
  }

  return autoAssignFeaturedHoles(holes, config.frequency)
}

export interface FeaturedMissionPointsResult {
  missionPoints: number
  featuredBonusPoints: number
}

export function applyFeaturedMissionPoints(
  baseMissionPoints: number,
  featuredHoleType: FeaturedHoleType | null,
): FeaturedMissionPointsResult {
  if (baseMissionPoints <= 0) {
    return {
      missionPoints: 0,
      featuredBonusPoints: 0,
    }
  }

  if (featuredHoleType === 'jackpot') {
    return {
      missionPoints: baseMissionPoints + 1,
      featuredBonusPoints: 1,
    }
  }

  if (featuredHoleType === 'double_points') {
    return {
      missionPoints: baseMissionPoints * 2,
      featuredBonusPoints: baseMissionPoints,
    }
  }

  return {
    missionPoints: baseMissionPoints,
    featuredBonusPoints: 0,
  }
}

function getSortedPlayersByGamePoints(
  players: Player[],
  gamePointsByPlayerId: Record<string, number>,
): Player[] {
  return [...players].sort((playerA, playerB) => {
    const pointsA = gamePointsByPlayerId[playerA.id] ?? 0
    const pointsB = gamePointsByPlayerId[playerB.id] ?? 0
    if (pointsA !== pointsB) {
      return pointsB - pointsA
    }

    return playerA.name.localeCompare(playerB.name)
  })
}

export interface RivalryPair {
  playerAId: string
  playerBId: string
}

export function getRivalryPair(
  players: Player[],
  gamePointsByPlayerId: Record<string, number>,
): RivalryPair | null {
  if (players.length < 2) {
    return null
  }

  const ranked = getSortedPlayersByGamePoints(players, gamePointsByPlayerId)
  let bestPair: RivalryPair | null = null
  let smallestGap = Number.POSITIVE_INFINITY

  for (let index = 0; index < ranked.length - 1; index += 1) {
    const playerA = ranked[index]
    const playerB = ranked[index + 1]
    const pointsA = gamePointsByPlayerId[playerA.id] ?? 0
    const pointsB = gamePointsByPlayerId[playerB.id] ?? 0
    const gap = Math.abs(pointsA - pointsB)

    if (gap < smallestGap) {
      smallestGap = gap
      bestPair = {
        playerAId: playerA.id,
        playerBId: playerB.id,
      }
    }
  }

  return bestPair
}

export function resolveRivalryWinner(
  rivalryPair: RivalryPair | null,
  pointsByPlayerId: Record<string, number>,
  strokesByPlayerId: Record<string, number | null>,
): string | null {
  if (!rivalryPair) {
    return null
  }

  const playerAPoints = pointsByPlayerId[rivalryPair.playerAId] ?? 0
  const playerBPoints = pointsByPlayerId[rivalryPair.playerBId] ?? 0

  if (playerAPoints > playerBPoints) {
    return rivalryPair.playerAId
  }

  if (playerBPoints > playerAPoints) {
    return rivalryPair.playerBId
  }

  const playerAStrokes = strokesByPlayerId[rivalryPair.playerAId]
  const playerBStrokes = strokesByPlayerId[rivalryPair.playerBId]

  if (typeof playerAStrokes === 'number' && typeof playerBStrokes === 'number') {
    if (playerAStrokes < playerBStrokes) {
      return rivalryPair.playerAId
    }
    if (playerBStrokes < playerAStrokes) {
      return rivalryPair.playerBId
    }
  }

  return null
}

export function isNoMercyFeaturedHole(featuredHoleType: FeaturedHoleType | null): boolean {
  return featuredHoleType === 'no_mercy'
}

export function normalizeFeaturedHolesConfig(
  inputConfig: Partial<FeaturedHolesConfig> | undefined,
  fallbackEnabled: boolean,
): FeaturedHolesConfig {
  return {
    enabled: typeof inputConfig?.enabled === 'boolean' ? inputConfig.enabled : fallbackEnabled,
    frequency: isFeaturedHoleFrequency(inputConfig?.frequency)
      ? inputConfig.frequency
      : DEFAULT_FEATURED_HOLES_CONFIG.frequency,
    assignmentMode: isFeaturedHoleAssignmentMode(inputConfig?.assignmentMode)
      ? inputConfig.assignmentMode
      : DEFAULT_FEATURED_HOLES_CONFIG.assignmentMode,
  }
}
