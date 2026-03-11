/// <reference types="node" />

import assert from 'node:assert/strict'
import test from 'node:test'
import {
  GAME_MODE_PRESETS,
  GAME_MODE_PRESETS_BY_ID,
  getSetupPresetCollection,
  isGameModePresetId,
  isSetupVisibleGameModePresetId,
} from './gameModePresets.ts'

test('setup preset collection exposes visible presets with one recommended default', () => {
  const setupPresetCollection = getSetupPresetCollection()
  const visiblePresetIds = setupPresetCollection.visiblePresets.map((preset) => preset.id)

  assert.deepEqual(visiblePresetIds, GAME_MODE_PRESETS.map((preset) => preset.id))
  assert.equal(setupPresetCollection.recommendedPreset.id, 'casual')
  assert.equal(visiblePresetIds.includes('custom'), false)
  assert.equal(isSetupVisibleGameModePresetId('custom'), false)
  assert.equal(setupPresetCollection.customPreset.id, 'custom')
})

test('legacy hidden presets remain valid for saved-round compatibility only', () => {
  assert.equal(isGameModePresetId('balanced'), true)
  assert.equal(isSetupVisibleGameModePresetId('balanced'), false)
  assert.equal(GAME_MODE_PRESETS.some((preset) => preset.id === 'balanced'), false)
  assert.equal(GAME_MODE_PRESETS_BY_ID.balanced.releaseStage, 'legacy')
  assert.equal(GAME_MODE_PRESETS_BY_ID.balanced.setupVisibility, 'hidden')
  assert.equal(GAME_MODE_PRESETS_BY_ID.custom.releaseStage, 'legacy')
  assert.equal(GAME_MODE_PRESETS_BY_ID.custom.setupVisibility, 'hidden')
})
