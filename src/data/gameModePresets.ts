import { CARD_PACKS_FOR_MODE_FEATURES } from './cardPacks.ts'
import type { CardPackId } from '../types/cards.ts'
import type {
  FeaturedHoleAssignmentMode,
  FeaturedHoleFrequency,
  GameMode,
  GameModePresetId,
} from '../types/game.ts'

export type GameModeFeatureId = CardPackId | 'powerUps'
export type GameModePresetReleaseStage = 'active' | 'legacy'
export type GameModePresetVisibility = 'visible' | 'hidden'

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
  releaseStage: GameModePresetReleaseStage
  setupVisibility: GameModePresetVisibility
  settings: GameModePresetSettings | null
}

export interface SetupPresetCollection {
  visiblePresets: GameModePresetDefinition[]
  recommendedPreset: GameModePresetDefinition
  browsePresets: GameModePresetDefinition[]
  customPreset: GameModePresetDefinition
}

const CARD_PACK_FEATURES: GameModeFeatureDefinition[] = CARD_PACKS_FOR_MODE_FEATURES.map((pack) => ({
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
  shortDescription: 'Standalone mode with per-hole power-ups plus leader curses.',
  longDescription:
    'Power Up / Curse Pack replaces mission cards with one random positive power-up per golfer each hole. Starting on hole 2, current round leader(s) receive one curse restriction instead of a positive power-up for the next hole.',
  includesLabel: 'Per-hole power-ups plus leader curses',
  bestForLabel: 'Arcade-style rounds and novelty play',
  type: 'standalone',
  sortOrder: 99,
}

export const GAME_MODE_FEATURES: GameModeFeatureDefinition[] = [
  ...CARD_PACK_FEATURES,
  POWER_UPS_FEATURE,
]

export const GAME_MODE_FEATURES_BY_ID: Partial<Record<GameModeFeatureId, GameModeFeatureDefinition>> =
  Object.fromEntries(
    GAME_MODE_FEATURES.map((feature) => [feature.id, feature]),
  ) as Partial<Record<GameModeFeatureId, GameModeFeatureDefinition>>

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

export const GAME_MODE_PRESET_CATALOG: GameModePresetDefinition[] = [
  {
    id: 'casual',
    name: 'Quick Start',
    shortDescription: 'Best first round for mixed-skill groups. Fast setup and low friction.',
    longDescription:
      'Quick Start is the easiest way to tee off. It runs the Core mission set, uses two-card mission picks, and turns off extra systems that add overhead in a first round.',
    includesLabel: 'Core missions only, choose 1 of 2 cards',
    bestForLabel: 'First rounds, mixed-skill groups, and pace-of-play focus',
    includedFeatureIds: ['classic'],
    sortOrder: 1,
    badgeLabel: 'Best First Round',
    isRecommended: true,
    releaseStage: 'active',
    setupVisibility: 'visible',
    settings: createCardPresetSettings(['classic'], 'low', {
      momentumBonuses: false,
      featuredEnabled: false,
      dynamicDifficulty: true,
      personalCardMode: 'drawTwoPickOne',
    }),
  },
  {
    id: 'competitive',
    name: 'Balanced Challenge',
    shortDescription: 'More strategy and variety while staying readable for most groups.',
    longDescription:
      'Balanced Challenge adds novelty cards and progression systems for groups that want more decisions without full custom setup.',
    includesLabel: 'Core + Novelty, dynamic difficulty, featured holes',
    bestForLabel: 'Returning groups who want more depth',
    includedFeatureIds: ['classic', 'novelty'],
    sortOrder: 2,
    badgeLabel: null,
    isRecommended: false,
    releaseStage: 'active',
    setupVisibility: 'visible',
    settings: createCardPresetSettings(['classic', 'novelty'], 'normal'),
  },
  {
    id: 'party',
    name: 'Social Party',
    shortDescription: 'Table-talk heavy mode with public-card swings and lively moments.',
    longDescription:
      'Social Party starts from Core and adds one public-card lane. Choose Chaos for big swings or Props for prediction-style callouts.',
    includesLabel: 'Core + one public-card lane (Chaos or Props)',
    bestForLabel: 'Social groups that want more banter and surprise',
    includedFeatureIds: ['classic', 'chaos', 'props'],
    sortOrder: 3,
    badgeLabel: null,
    isRecommended: false,
    releaseStage: 'active',
    setupVisibility: 'visible',
    settings: createCardPresetSettings(['classic', 'chaos'], 'high'),
  },
  {
    id: 'balanced',
    name: 'Balanced (Legacy)',
    shortDescription: 'Legacy preset kept for saved-round compatibility.',
    longDescription:
      'This hidden preset is retained so older local round saves can still normalize safely.',
    includesLabel: 'Legacy compatibility preset',
    bestForLabel: 'Internal compatibility',
    includedFeatureIds: ['classic', 'novelty'],
    sortOrder: 4,
    badgeLabel: 'Legacy',
    isRecommended: false,
    releaseStage: 'legacy',
    setupVisibility: 'hidden',
    settings: createCardPresetSettings(['classic', 'novelty'], 'normal'),
  },
  {
    id: 'powerUps',
    name: 'Power Ups (Arcade)',
    shortDescription: 'Standalone arcade-style round with power-ups and leader curses.',
    longDescription:
      'Power Ups is a separate mode that skips mission cards and runs one power-up per golfer each hole, with current round leader(s) receiving curse cards instead from hole 2 onward.',
    includesLabel: 'Power-ups + curses (no mission/public card flow)',
    bestForLabel: 'Novelty-first rounds and fast arcade energy',
    includedFeatureIds: ['powerUps'],
    sortOrder: 5,
    badgeLabel: null,
    isRecommended: false,
    releaseStage: 'active',
    setupVisibility: 'visible',
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
    name: 'Custom (Legacy)',
    shortDescription: 'Legacy preset retained for compatibility with older local saves.',
    longDescription:
      'Custom mode is no longer exposed in setup, but remains in the catalog so legacy local rounds can still load safely.',
    includesLabel: 'Legacy compatibility preset',
    bestForLabel: 'Internal compatibility',
    includedFeatureIds: ['classic', 'chaos', 'props', 'novelty', 'hybrid'],
    sortOrder: 6,
    badgeLabel: 'Legacy',
    isRecommended: false,
    releaseStage: 'legacy',
    setupVisibility: 'hidden',
    settings: null,
  },
]

function isSetupVisiblePreset(preset: GameModePresetDefinition): boolean {
  return preset.releaseStage === 'active' && preset.setupVisibility === 'visible'
}

export const GAME_MODE_PRESETS: GameModePresetDefinition[] = GAME_MODE_PRESET_CATALOG
  .filter(isSetupVisiblePreset)
  .sort((presetA, presetB) => presetA.sortOrder - presetB.sortOrder)

export const GAME_MODE_PRESETS_BY_ID: Record<GameModePresetId, GameModePresetDefinition> =
  Object.fromEntries(GAME_MODE_PRESET_CATALOG.map((preset) => [preset.id, preset])) as Record<
    GameModePresetId,
    GameModePresetDefinition
  >

export const DEFAULT_GAME_MODE_PRESET_ID: GameModePresetId = 'casual'
export const DEFAULT_CUSTOM_MODE_NAME = 'My Custom Mode'

const VALID_PRESET_IDS = new Set<GameModePresetId>(GAME_MODE_PRESET_CATALOG.map((preset) => preset.id))
const VISIBLE_PRESET_IDS = new Set<GameModePresetId>(GAME_MODE_PRESETS.map((preset) => preset.id))

export function isGameModePresetId(value: unknown): value is GameModePresetId {
  return typeof value === 'string' && VALID_PRESET_IDS.has(value as GameModePresetId)
}

export function isSetupVisibleGameModePresetId(value: unknown): value is GameModePresetId {
  return typeof value === 'string' && VISIBLE_PRESET_IDS.has(value as GameModePresetId)
}

export function getSetupPresetCollection(): SetupPresetCollection {
  const visiblePresets = [...GAME_MODE_PRESETS]
  const recommendedPreset =
    visiblePresets.find((preset) => preset.isRecommended) ??
    visiblePresets[0] ??
    GAME_MODE_PRESETS_BY_ID.casual
  const customPreset = visiblePresets.find((preset) => preset.id === 'custom') ?? GAME_MODE_PRESETS_BY_ID.custom
  const browsePresets = visiblePresets.filter(
    (preset) => preset.id !== recommendedPreset.id && preset.id !== customPreset.id,
  )

  return {
    visiblePresets,
    recommendedPreset,
    browsePresets,
    customPreset,
  }
}
