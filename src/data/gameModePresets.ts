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
  name: 'Power Up / Curse Pack',
  shortDescription: 'Standalone mode with per-hole power-ups plus winner curses.',
  longDescription:
    'Power Up / Curse Pack replaces mission cards with one random positive power-up per golfer each hole. Starting on hole 2, previous-hole winner(s) also receive one curse restriction for the next hole.',
  includesLabel: 'Per-hole power-ups plus winner curses',
  bestForLabel: 'Arcade-style rounds and novelty play',
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
    name: 'Core Pack',
    shortDescription: 'Quick-start mode using only the Core 54 mission set.',
    longDescription:
      'Core Pack is the quick-start baseline: Core 54 personal cards plus app-specific cards that map to those same core categories. Setup stays light with auto-assigned cards, no momentum bonuses, and no featured holes.',
    includesLabel: 'Core 54 mission cards (Common, Skill, Risk)',
    bestForLabel: 'Quick rounds, onboarding, and low-friction setup',
    includedFeatureIds: ['classic'],
    sortOrder: 1,
    badgeLabel: 'Quick Start Default',
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
    name: 'Fun Pack',
    shortDescription: 'Core Pack plus Match Play Plus 18 (Novelty) expansion cards.',
    longDescription:
      'Fun Pack layers Novelty expansion cards onto the Core Pack to create playful, high-variety holes while keeping the familiar mission foundation.',
    includesLabel: 'Core Pack + Match Play Plus 18 (Novelty)',
    bestForLabel: 'Friendly rounds and novelty-first groups',
    includedFeatureIds: ['classic', 'novelty'],
    sortOrder: 2,
    badgeLabel: null,
    isRecommended: false,
    settings: createCardPresetSettings(['classic', 'novelty'], 'normal'),
  },
  {
    id: 'party',
    name: 'Party Pack',
    shortDescription: 'Core Pack plus one party lane: Chaos mode or Props mode.',
    longDescription:
      'Party Pack starts from Core and adds one public-card lane for social energy. Choose Chaos mode for swingy hole effects or Props mode for prediction-style group interaction.',
    includesLabel: 'Core Pack + Chaos or Props (choose one)',
    bestForLabel: 'Social groups that want faster table-talk moments',
    includedFeatureIds: ['classic', 'chaos', 'props'],
    sortOrder: 3,
    badgeLabel: null,
    isRecommended: false,
    settings: createCardPresetSettings(['classic', 'chaos'], 'high'),
  },
  {
    id: 'powerUps',
    name: 'Power Up / Curse Pack',
    shortDescription: 'Standalone mode with per-hole power-ups and winner curses.',
    longDescription:
      'Power Up / Curse Pack is a separate game mode that disables mission cards and card-pack scoring. Hole 1 gives everyone a positive power-up. From hole 2 onward, everyone still gets a positive power-up and previous-hole winner(s) also receive one curse restriction.',
    includesLabel: 'Power-up cards plus curse restrictions only',
    bestForLabel: 'Fast arcade rounds and high novelty',
    includedFeatureIds: ['powerUps'],
    sortOrder: 4,
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
      'novelty',
      'hybrid',
    ],
    sortOrder: 5,
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
