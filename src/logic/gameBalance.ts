import type { PersonalCard } from '../types/cards.ts'

export type SkillBand = 'advanced' | 'intermediate' | 'developing'
export type MomentumTier = 'none' | 'heater' | 'fire' | 'inferno'

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

export const SKILL_BAND_RULES: SkillBandRule[] = [
  { id: 'advanced', minExpectedScore18: 0, maxExpectedScore18: 85 },
  { id: 'intermediate', minExpectedScore18: 86, maxExpectedScore18: 100 },
  { id: 'developing', minExpectedScore18: 101, maxExpectedScore18: null },
]

export const DYNAMIC_OFFER_TUNING: Record<SkillBand, SkillBandOfferTuning> = {
  advanced: {
    safe: {
      preferredPoints: [1],
      difficultyWeights: { easy: 5, medium: 2, hard: 1 },
    },
    hard: {
      preferredPoints: [2, 3],
      difficultyWeights: { easy: 1, medium: 3, hard: 6 },
    },
    single: {
      preferredPoints: [2],
      difficultyWeights: { easy: 1, medium: 4, hard: 4 },
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
      preferredPoints: [4],
      difficultyWeights: { easy: 1, medium: 4, hard: 3 },
    },
    single: {
      preferredPoints: [2, 3],
      difficultyWeights: { easy: 4, medium: 4, hard: 2 },
    },
    hardHighUpsideChance: 0.22,
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

export function getSkillBandForExpectedScore(expectedScore18: number): SkillBand {
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
