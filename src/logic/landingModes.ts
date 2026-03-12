import type { AppIconName } from '../app/icons.ts'
import { applyGameModePreset } from './gameModePresets.ts'
import { createFeaturedHolesRandomSeed } from './featuredHoles.ts'
import { applyRoundSetupDraft } from './roundSetup.ts'
import type { CardPackId } from '../types/cards.ts'
import type { RoundConfig, RoundState } from '../types/game.ts'

export type LandingModeId = 'classic' | 'novelty' | 'chaos' | 'props' | 'powerUps'

export interface LandingModeDefinition {
  id: LandingModeId
  name: string
  tagline: string
  description: string
  icon: AppIconName
  toneClassName: string
  ctaLabel: string
}

export const LANDING_MODES: readonly LandingModeDefinition[] = [
  {
    id: 'classic',
    name: 'Classic',
    tagline: 'Balanced missions with clean pacing.',
    description: 'A clear, easy-to-teach mode with low randomness and steady scoring.',
    icon: 'sports_golf',
    toneClassName: 'classic',
    ctaLabel: 'Play Classic',
  },
  {
    id: 'novelty',
    name: 'Novelty',
    tagline: 'Playful missions with more variety.',
    description: 'Quirky card outcomes that keep rounds light, social, and less predictable.',
    icon: 'auto_awesome',
    toneClassName: 'novelty',
    ctaLabel: 'Play Novelty',
  },
  {
    id: 'chaos',
    name: 'Chaos',
    tagline: 'Big swings from public cards.',
    description: 'High-volatility public effects that can flip momentum on any hole.',
    icon: 'bolt',
    toneClassName: 'chaos',
    ctaLabel: 'Play Chaos',
  },
  {
    id: 'props',
    name: 'Props',
    tagline: 'Prediction-based side bets.',
    description: 'Pre-hole prop picks that reward reads, strategy, and table talk.',
    icon: 'flag',
    toneClassName: 'props',
    ctaLabel: 'Play Props',
  },
  {
    id: 'powerUps',
    name: 'Power Up',
    tagline: 'Arcade-style boosts and curses.',
    description: 'No mission cards. Use power-ups aggressively while leaders handle curses.',
    icon: 'auto_fix_high',
    toneClassName: 'power-ups',
    ctaLabel: 'Play Power Up',
  },
] as const

const LANDING_MODE_BY_ID: Record<LandingModeId, LandingModeDefinition> = Object.fromEntries(
  LANDING_MODES.map((mode) => [mode.id, mode]),
) as Record<LandingModeId, LandingModeDefinition>

export function getLandingModeById(modeId: LandingModeId): LandingModeDefinition {
  return LANDING_MODE_BY_ID[modeId]
}

function applyLandingModeToConfig(config: RoundConfig, modeId: LandingModeId): RoundConfig {
  const seededConfig: RoundConfig = {
    ...config,
    featuredHoles: {
      ...config.featuredHoles,
      randomSeed: createFeaturedHolesRandomSeed(),
    },
  }

  if (modeId === 'powerUps') {
    return applyGameModePreset(seededConfig, 'powerUps')
  }

  if (modeId === 'classic') {
    const classicConfig = applyGameModePreset(seededConfig, 'casual')
    return {
      ...classicConfig,
      selectedPresetId: 'custom',
      enabledPackIds: ['classic'],
      toggles: {
        ...classicConfig.toggles,
        enableChaosCards: false,
        enablePropCards: false,
      },
    }
  }

  if (modeId === 'novelty') {
    const noveltyConfig = applyGameModePreset(seededConfig, 'competitive')
    return {
      ...noveltyConfig,
      selectedPresetId: 'custom',
      enabledPackIds: ['classic', 'novelty'],
      toggles: {
        ...noveltyConfig.toggles,
        enableChaosCards: false,
        enablePropCards: false,
      },
    }
  }

  const partyConfig = applyGameModePreset(seededConfig, 'party')
  const enabledPackIds: CardPackId[] =
    modeId === 'props' ? ['classic', 'props'] : ['classic', 'chaos']
  return {
    ...partyConfig,
    selectedPresetId: 'custom',
    enabledPackIds,
    toggles: {
      ...partyConfig.toggles,
      enableChaosCards: enabledPackIds.includes('chaos'),
      enablePropCards: enabledPackIds.includes('props'),
    },
  }
}

export function applyLandingModeToRound(roundState: RoundState, modeId: LandingModeId): RoundState {
  const configuredState = applyRoundSetupDraft(roundState, {
    config: applyLandingModeToConfig(roundState.config, modeId),
    players: roundState.players,
    holes: roundState.holes,
  })

  return {
    ...configuredState,
    currentHoleIndex: 0,
  }
}

export function resolveLandingModeIdFromConfig(config: RoundConfig): LandingModeId {
  if (config.gameMode === 'powerUps') {
    return 'powerUps'
  }

  if (config.enabledPackIds.includes('novelty')) {
    return 'novelty'
  }

  const hasChaos = config.enabledPackIds.includes('chaos')
  const hasProps = config.enabledPackIds.includes('props')

  if (hasChaos && !hasProps) {
    return 'chaos'
  }

  if (hasProps) {
    return 'props'
  }

  return 'classic'
}

export function resolveLandingModeFromConfig(config: RoundConfig): LandingModeDefinition {
  return getLandingModeById(resolveLandingModeIdFromConfig(config))
}
