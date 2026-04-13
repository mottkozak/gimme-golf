import type { PersonalCard } from '../types/cards.ts'
import type { PlayerTotals } from '../types/game.ts'

export type SkillBand = 'advanced' | 'intermediate' | 'developing'
export type MomentumTier = 'none' | 'heater' | 'fire' | 'inferno'
export type OfferPointRangeKey = 'safe' | 'hard' | 'single'

export interface SkillBandRule {
  id: SkillBand
  minExpectedScore18: number
  maxExpectedScore18: number | null
}

export interface OfferTuning {
  preferredPoints: number[]
  difficultyWeights: Record<PersonalCard['difficulty'], number>
}

export interface SkillBandOfferTuning {
  safe: OfferTuning
  hard: OfferTuning
  single: OfferTuning
  hardHighUpsideChance: number
}

export interface OfferPointRange {
  minPoints: number
  maxPoints: number
}

export interface SkillBandOfferPointPolicy {
  safe: OfferPointRange
  hard: OfferPointRange
  single: OfferPointRange
}

export interface CatchUpPointRangeContext {
  enabled: boolean
  playerId: string
  totalsByPlayerId: Record<string, PlayerTotals>
  deficitThreshold?: number
}

export const SKILL_BAND_RULES: SkillBandRule[] = [
  { id: 'advanced', minExpectedScore18: 72, maxExpectedScore18: 85 },
  { id: 'intermediate', minExpectedScore18: 86, maxExpectedScore18: 100 },
  { id: 'developing', minExpectedScore18: 101, maxExpectedScore18: null },
]

export const DYNAMIC_OFFER_POINT_POLICY: Record<SkillBand, SkillBandOfferPointPolicy> = {
  advanced: {
    safe: { minPoints: 1, maxPoints: 1 },
    hard: { minPoints: 2, maxPoints: 2 },
    single: { minPoints: 1, maxPoints: 2 },
  },
  intermediate: {
    safe: { minPoints: 1, maxPoints: 2 },
    hard: { minPoints: 3, maxPoints: 3 },
    single: { minPoints: 2, maxPoints: 3 },
  },
  developing: {
    safe: { minPoints: 2, maxPoints: 2 },
    hard: { minPoints: 4, maxPoints: 5 },
    single: { minPoints: 3, maxPoints: 5 },
  },
}

export const STATIC_OFFER_POINT_POLICY: SkillBandOfferPointPolicy = {
  safe: { minPoints: 1, maxPoints: 2 },
  hard: { minPoints: 2, maxPoints: 4 },
  single: { minPoints: 1, maxPoints: 4 },
}

export const DYNAMIC_OFFER_TUNING: Record<SkillBand, SkillBandOfferTuning> = {
  advanced: {
    safe: {
      preferredPoints: [1],
      difficultyWeights: { easy: 5, medium: 2, hard: 1 },
    },
    hard: {
      preferredPoints: [2],
      difficultyWeights: { easy: 1, medium: 4, hard: 6 },
    },
    single: {
      preferredPoints: [1, 2],
      difficultyWeights: { easy: 3, medium: 4, hard: 2 },
    },
    hardHighUpsideChance: 0,
  },
  intermediate: {
    safe: {
      preferredPoints: [1, 2],
      difficultyWeights: { easy: 4, medium: 4, hard: 1 },
    },
    hard: {
      preferredPoints: [3],
      difficultyWeights: { easy: 1, medium: 3, hard: 5 },
    },
    single: {
      preferredPoints: [2, 3],
      difficultyWeights: { easy: 2, medium: 4, hard: 3 },
    },
    hardHighUpsideChance: 0,
  },
  developing: {
    safe: {
      preferredPoints: [2],
      difficultyWeights: { easy: 6, medium: 3, hard: 1 },
    },
    hard: {
      preferredPoints: [4, 5],
      difficultyWeights: { easy: 6, medium: 3, hard: 1 },
    },
    single: {
      preferredPoints: [3, 4, 5],
      difficultyWeights: { easy: 3, medium: 4, hard: 3 },
    },
    hardHighUpsideChance: 0,
  },
}

export const STATIC_OFFER_TUNING: SkillBandOfferTuning = {
  safe: {
    preferredPoints: [1, 2],
    difficultyWeights: { easy: 5, medium: 3, hard: 1 },
  },
  hard: {
    preferredPoints: [3, 4],
    difficultyWeights: { easy: 1, medium: 3, hard: 5 },
  },
  single: {
    preferredPoints: [2, 3],
    difficultyWeights: { easy: 2, medium: 4, hard: 3 },
  },
  hardHighUpsideChance: 0,
}

export const MOMENTUM_RULES = {
  enabledByDefault: true,
  bonusByTier: {
    none: 0,
    heater: 1,
    fire: 2,
    inferno: 2,
  } as Record<MomentumTier, number>,
  infernoPostPayoutStreak: 2,
  comebackShield: {
    enabled: true,
    extraSuccessCount: 1,
  },
} as const

export const POINT_BALANCE_RULES = {
  featuredBonusCap: 2,
  publicPointDeltaCap: {
    min: -3,
    max: 3,
  },
  stackedBonusCap: {
    min: -4,
    max: 5,
  },
} as const

const CATCH_UP_DEFICIT_THRESHOLD = 2
const CATCH_UP_POINT_BONUS_BY_OFFER: Record<OfferPointRangeKey, OfferPointRange> = {
  safe: { minPoints: 0, maxPoints: 1 },
  hard: { minPoints: 1, maxPoints: 1 },
  single: { minPoints: 1, maxPoints: 1 },
}
const OFFER_POINT_FLOOR = 1
const OFFER_POINT_CEILING = 5

export function getSkillBandForExpectedScore(expectedScore18: number): SkillBand {
  if (expectedScore18 < 72) {
    return 'advanced'
  }

  for (const bandRule of SKILL_BAND_RULES) {
    const meetsMinimum = expectedScore18 >= bandRule.minExpectedScore18
    const meetsMaximum =
      bandRule.maxExpectedScore18 === null || expectedScore18 <= bandRule.maxExpectedScore18

    if (meetsMinimum && meetsMaximum) {
      return bandRule.id
    }
  }

  return 'developing'
}

export function getSkillBandLabel(skillBand: SkillBand): string {
  switch (skillBand) {
    case 'advanced':
      return 'Advanced'
    case 'intermediate':
      return 'Intermediate'
    case 'developing':
      return 'Developing'
    default:
      return 'Developing'
  }
}

export function formatOfferPointRangeLabel(pointRange: OfferPointRange): string {
  if (pointRange.minPoints === pointRange.maxPoints) {
    return `+${pointRange.minPoints}`
  }

  return `+${pointRange.minPoints} to +${pointRange.maxPoints}`
}

export function getOfferPointRange(
  expectedScore18: number,
  dynamicDifficultyEnabled: boolean,
  offerKind: OfferPointRangeKey,
  catchUpContext?: CatchUpPointRangeContext,
): OfferPointRange {
  const basePolicy = dynamicDifficultyEnabled
    ? DYNAMIC_OFFER_POINT_POLICY[getSkillBandForExpectedScore(expectedScore18)]
    : STATIC_OFFER_POINT_POLICY
  const baseRange = basePolicy[offerKind]

  if (!shouldApplyCatchUpBoost(catchUpContext)) {
    return baseRange
  }

  const pointBonus = CATCH_UP_POINT_BONUS_BY_OFFER[offerKind]
  return {
    minPoints: clamp(baseRange.minPoints + pointBonus.minPoints, OFFER_POINT_FLOOR, OFFER_POINT_CEILING),
    maxPoints: clamp(baseRange.maxPoints + pointBonus.maxPoints, OFFER_POINT_FLOOR, OFFER_POINT_CEILING),
  }
}

export function getAdjustedScoreDeficitFromLeader(
  playerId: string,
  totalsByPlayerId: Record<string, PlayerTotals>,
): number {
  const leaderboardTotals = Object.values(totalsByPlayerId)
  if (leaderboardTotals.length === 0) {
    return 0
  }

  const playerAdjustedScore = totalsByPlayerId[playerId]?.adjustedScore
  if (typeof playerAdjustedScore !== 'number') {
    return 0
  }

  const leaderAdjustedScore = leaderboardTotals.reduce(
    (lowestScore, totals) => Math.min(lowestScore, totals.adjustedScore),
    Number.POSITIVE_INFINITY,
  )
  if (!Number.isFinite(leaderAdjustedScore)) {
    return 0
  }

  return playerAdjustedScore - leaderAdjustedScore
}

function shouldApplyCatchUpBoost(catchUpContext: CatchUpPointRangeContext | undefined): boolean {
  if (!catchUpContext?.enabled) {
    return false
  }

  const deficitThreshold = catchUpContext.deficitThreshold ?? CATCH_UP_DEFICIT_THRESHOLD
  return (
    getAdjustedScoreDeficitFromLeader(catchUpContext.playerId, catchUpContext.totalsByPlayerId) >=
    deficitThreshold
  )
}

function clamp(value: number, minValue: number, maxValue: number): number {
  return Math.min(maxValue, Math.max(minValue, value))
}

export function getSkillBandSummaryLine(
  skillBand: SkillBand,
): string {
  const policy = DYNAMIC_OFFER_POINT_POLICY[skillBand]
  return `Safe ${formatOfferPointRangeLabel(policy.safe)} • Upside ${formatOfferPointRangeLabel(
    policy.hard,
  )}`
}

export function getMomentumTierForStreak(streak: number): MomentumTier {
  if (streak >= 4) {
    return 'inferno'
  }

  if (streak >= 3) {
    return 'fire'
  }

  if (streak >= 2) {
    return 'heater'
  }

  return 'none'
}

export function getMomentumTierLabel(tier: MomentumTier): string {
  switch (tier) {
    case 'heater':
      return 'Heater'
    case 'fire':
      return 'Fire'
    case 'inferno':
      return 'Inferno'
    default:
      return 'Cold'
  }
}
