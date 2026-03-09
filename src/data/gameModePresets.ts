import { CARD_PACKS } from './cardPacks.ts'
import type { CardPackId } from '../types/cards.ts'
import type {
  FeaturedHoleAssignmentMode,
  FeaturedHoleFrequency,
  GameMode,
  GameModePresetId,
} from '../types/game.ts'

export type GameModeFeatureId = CardPackId | 'powerUps'

export interface GameModeFeatureDefinition {
  id: GameModeFeatureId
  name: string
  shortDescription: string
  longDescription: string
  includesLabel: string
  bestForLabel: string
  type: 'pack' | 'standalone'
  sortOrder: number
}

export interface GameModePresetSettings {
  gameMode: GameMode
  enabledPackIds: CardPackId[]
  toggles: {
    dynamicDifficulty: boolean
    momentumBonuses: boolean
    drawTwoPickOne: boolean
    autoAssignOne: boolean
  }
  featuredHoles: {
    enabled: boolean
    frequency: FeaturedHoleFrequency
    assignmentMode: FeaturedHoleAssignmentMode
    randomSeed: number
  }
}

export interface GameModePresetDefinition {
  id: GameModePresetId
  name: string
  shortDescription: string
  longDescription: string
  includesLabel: string
  bestForLabel: string
  includedFeatureIds: GameModeFeatureId[]
  sortOrder: number
  badgeLabel: string | null
  isRecommended: boolean
  settings: GameModePresetSettings | null
}

const CARD_PACK_FEATURES: GameModeFeatureDefinition[] = CARD_PACKS.map((pack) => ({
  id: pack.id,
  name: pack.name,
  shortDescription: pack.shortDescription,
  longDescription: pack.longDescription,
  includesLabel: pack.includesLabel,
  bestForLabel: pack.bestForLabel,
  type: 'pack',
  sortOrder: pack.sortOrder,
}))

const POWER_UPS_FEATURE: GameModeFeatureDefinition = {
  id: 'powerUps',
  name: 'Power Ups',
  shortDescription: 'Standalone mode with one random power-up per golfer per hole.',
  longDescription:
    'Power Ups Mode replaces mission cards with one random power-up per golfer each hole. Players can declare and use it once during that hole.',
  includesLabel: 'Random per-hole power-ups',
  bestForLabel: 'Fast rounds, variety, and casual groups',
  type: 'standalone',
  sortOrder: 99,
}

export const GAME_MODE_FEATURES: GameModeFeatureDefinition[] = [
  ...CARD_PACK_FEATURES,
  POWER_UPS_FEATURE,
]

export const GAME_MODE_FEATURES_BY_ID: Record<GameModeFeatureId, GameModeFeatureDefinition> =
  Object.fromEntries(
    GAME_MODE_FEATURES.map((feature) => [feature.id, feature]),
  ) as Record<GameModeFeatureId, GameModeFeatureDefinition>

function createCardPresetSettings(
  enabledPackIds: CardPackId[],
  frequency: FeaturedHoleFrequency,
  options?: {
    momentumBonuses?: boolean
    featuredEnabled?: boolean
    dynamicDifficulty?: boolean
    personalCardMode?: 'drawTwoPickOne' | 'autoAssignOne'
  },
): GameModePresetSettings {
  const featuredEnabled = options?.featuredEnabled ?? true
  const personalCardMode = options?.personalCardMode ?? 'drawTwoPickOne'

  return {
    gameMode: 'cards',
    enabledPackIds,
    toggles: {
      dynamicDifficulty: options?.dynamicDifficulty ?? true,
      momentumBonuses: options?.momentumBonuses ?? true,
      drawTwoPickOne: personalCardMode === 'drawTwoPickOne',
      autoAssignOne: personalCardMode === 'autoAssignOne',
    },
    featuredHoles: {
      enabled: featuredEnabled,
      frequency,
      assignmentMode: 'auto',
      randomSeed: 0,
    },
  }
}

export const GAME_MODE_PRESETS: GameModePresetDefinition[] = [
  {
    id: 'casual',
    name: 'Casual',
    shortDescription: 'Light onboarding mode with minimal decisions per hole.',
    longDescription:
      'A clean first-run mode focused on Classic missions with auto-assigned cards, no momentum, and no featured holes. Designed for easy onboarding and low tap count.',
    includesLabel: 'Classic cards only',
    bestForLabel: 'First-time groups and relaxed rounds',
    includedFeatureIds: ['classic'],
    sortOrder: 1,
    badgeLabel: 'Recommended',
    isRecommended: true,
    settings: createCardPresetSettings(['classic'], 'low', {
      momentumBonuses: false,
      featuredEnabled: false,
      dynamicDifficulty: false,
      personalCardMode: 'autoAssignOne',
    }),
  },
  {
    id: 'competitive',
    name: 'Competitive',
    shortDescription: 'Pressure-focused mode with strategic scoring.',
    longDescription:
      'Competitive keeps rounds tactical with Classic, Props, and Hybrid cards. Momentum stays on for streak pressure while featured holes stay light.',
    includesLabel: 'Classic, Props, Hybrid',
    bestForLabel: 'Skill-focused and competitive groups',
    includedFeatureIds: ['classic', 'props', 'hybrid'],
    sortOrder: 2,
    badgeLabel: null,
    isRecommended: false,
    settings: createCardPresetSettings(['classic', 'props', 'hybrid'], 'low'),
  },
  {
    id: 'party',
    name: 'Party',
    shortDescription: 'High-variance social mode with extra chaos.',
    longDescription:
      'Party mode increases fun swings with Chaos, Curse, Style, and Novelty content layered on top of Classic cards. Great for social rounds and banter.',
    includesLabel: 'Classic, Chaos, Curse, Style, Novelty',
    bestForLabel: 'Social rounds and friend groups',
    includedFeatureIds: ['classic', 'chaos', 'curse', 'style', 'novelty'],
    sortOrder: 3,
    badgeLabel: null,
    isRecommended: false,
    settings: createCardPresetSettings(
      ['classic', 'chaos', 'curse', 'style', 'novelty'],
      'high',
    ),
  },
  {
    id: 'balanced',
    name: 'Balanced',
    shortDescription: 'Strategy-forward mix with broader card variety.',
    longDescription:
      'Balanced mixes core personal missions with both public card types and Hybrid pressure cards. It keeps pace lively without overwhelming complexity.',
    includesLabel: 'Classic, Chaos, Props, Hybrid',
    bestForLabel: 'Most groups and most rounds',
    includedFeatureIds: ['classic', 'chaos', 'props', 'hybrid'],
    sortOrder: 4,
    badgeLabel: null,
    isRecommended: false,
    settings: createCardPresetSettings(['classic', 'chaos', 'props', 'hybrid'], 'normal'),
  },
  {
    id: 'powerUps',
    name: 'Power Ups',
    shortDescription: 'Standalone mode with random per-hole power-ups.',
    longDescription:
      'Power Ups is a separate mode that disables mission cards and card-pack scoring. Each golfer gets one random power-up each hole and may use it once.',
    includesLabel: 'Power Ups mode only',
    bestForLabel: 'Fast rounds and novelty-focused play',
    includedFeatureIds: ['powerUps'],
    sortOrder: 5,
    badgeLabel: null,
    isRecommended: false,
    settings: {
      gameMode: 'powerUps',
      enabledPackIds: [],
      toggles: {
        dynamicDifficulty: false,
        momentumBonuses: false,
        drawTwoPickOne: false,
        autoAssignOne: true,
      },
      featuredHoles: {
        enabled: false,
        frequency: 'low',
        assignmentMode: 'auto',
        randomSeed: 0,
      },
    },
  },
  {
    id: 'custom',
    name: 'Custom',
    shortDescription: 'Build your own mix of packs and options.',
    longDescription:
      'Custom mode unlocks full round tuning for card packs, momentum, dealing style, and featured-hole settings. You can also name the mode for this round.',
    includesLabel: 'Any enabled card packs',
    bestForLabel: 'Advanced setup and house rules',
    includedFeatureIds: [
      'classic',
      'chaos',
      'props',
      'curse',
      'style',
      'novelty',
      'hybrid',
    ],
    sortOrder: 6,
    badgeLabel: null,
    isRecommended: false,
    settings: null,
  },
]

export const GAME_MODE_PRESETS_BY_ID: Record<GameModePresetId, GameModePresetDefinition> =
  Object.fromEntries(GAME_MODE_PRESETS.map((preset) => [preset.id, preset])) as Record<
    GameModePresetId,
    GameModePresetDefinition
  >

export const DEFAULT_GAME_MODE_PRESET_ID: GameModePresetId = 'casual'
export const DEFAULT_CUSTOM_MODE_NAME = 'My Custom Mode'

const VALID_PRESET_IDS = new Set<GameModePresetId>(GAME_MODE_PRESETS.map((preset) => preset.id))

export function isGameModePresetId(value: unknown): value is GameModePresetId {
  return typeof value === 'string' && VALID_PRESET_IDS.has(value as GameModePresetId)
}
