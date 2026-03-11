import {
  DEFAULT_CUSTOM_MODE_NAME,
  GAME_MODE_PRESETS_BY_ID,
  isGameModePresetId,
  type GameModePresetSettings,
} from '../data/gameModePresets.ts'
import type { GameModePresetId, RoundConfig } from '../types/game.ts'

const MAX_CUSTOM_MODE_NAME_LENGTH = 36

function clonePresetSettings(settings: GameModePresetSettings): GameModePresetSettings {
  return {
    gameMode: settings.gameMode,
    enabledPackIds: [...settings.enabledPackIds],
    toggles: {
      dynamicDifficulty: settings.toggles.dynamicDifficulty,
      momentumBonuses: settings.toggles.momentumBonuses,
      drawTwoPickOne: settings.toggles.drawTwoPickOne,
      autoAssignOne: settings.toggles.autoAssignOne,
    },
    featuredHoles: {
      enabled: settings.featuredHoles.enabled,
      frequency: settings.featuredHoles.frequency,
      assignmentMode: settings.featuredHoles.assignmentMode,
      randomSeed: settings.featuredHoles.randomSeed,
    },
  }
}

function getCorePresetSettings(): GameModePresetSettings {
  const core = GAME_MODE_PRESETS_BY_ID.casual.settings
  if (!core) {
    throw new Error('Core preset settings are required for custom fallback.')
  }

  return clonePresetSettings(core)
}

function applyPresetSettings(
  config: RoundConfig,
  presetId: GameModePresetId,
  settings: GameModePresetSettings,
): RoundConfig {
  const clonedSettings = clonePresetSettings(settings)
  const hasChaosPack = clonedSettings.enabledPackIds.includes('chaos')
  const hasPropsPack = clonedSettings.enabledPackIds.includes('props')

  return {
    ...config,
    gameMode: clonedSettings.gameMode,
    selectedPresetId: presetId,
    enabledPackIds: clonedSettings.enabledPackIds,
    featuredHoles: clonedSettings.featuredHoles,
    toggles: {
      ...config.toggles,
      dynamicDifficulty: clonedSettings.toggles.dynamicDifficulty,
      momentumBonuses: clonedSettings.toggles.momentumBonuses,
      drawTwoPickOne: clonedSettings.toggles.drawTwoPickOne,
      autoAssignOne: clonedSettings.toggles.autoAssignOne,
      enableChaosCards: hasChaosPack,
      enablePropCards: hasPropsPack,
    },
  }
}

export function normalizeCustomModeName(value: string | undefined): string {
  if (!value) {
    return DEFAULT_CUSTOM_MODE_NAME
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return DEFAULT_CUSTOM_MODE_NAME
  }

  return trimmed.slice(0, MAX_CUSTOM_MODE_NAME_LENGTH)
}

export function applyGameModePreset(
  config: RoundConfig,
  presetId: GameModePresetId,
): RoundConfig {
  if (presetId === 'custom') {
    const customModeName = normalizeCustomModeName(config.customModeName)

    if (config.gameMode === 'powerUps') {
      return {
        ...applyPresetSettings(config, 'custom', getCorePresetSettings()),
        selectedPresetId: 'custom',
        customModeName,
      }
    }

    return {
      ...config,
      gameMode: 'cards',
      selectedPresetId: 'custom',
      customModeName,
    }
  }

  const preset = GAME_MODE_PRESETS_BY_ID[presetId]
  if (!preset?.settings) {
    return config
  }

  return {
    ...applyPresetSettings(config, presetId, preset.settings),
    customModeName: normalizeCustomModeName(config.customModeName),
  }
}

export function normalizePresetConfig(config: RoundConfig): RoundConfig {
  const selectedPresetId: GameModePresetId = isGameModePresetId(config.selectedPresetId)
    ? config.selectedPresetId
    : config.gameMode === 'powerUps'
      ? 'powerUps'
      : 'custom'

  return applyGameModePreset(
    {
      ...config,
      selectedPresetId,
      customModeName: normalizeCustomModeName(config.customModeName),
    },
    selectedPresetId,
  )
}
