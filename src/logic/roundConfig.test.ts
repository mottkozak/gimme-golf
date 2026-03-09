/// <reference types="node" />

import assert from 'node:assert/strict'
import test from 'node:test'
import type { RoundConfig } from '../types/game.ts'
import { normalizeRoundConfig } from './roundConfig.ts'

test('normalizeRoundConfig keeps Power Ups as lightweight standalone mode', () => {
  const config: RoundConfig = {
    holeCount: 9,
    courseStyle: 'standard',
    gameMode: 'powerUps',
    selectedPresetId: 'powerUps',
    customModeName: '',
    enabledPackIds: ['classic', 'chaos', 'props'],
    featuredHoles: {
      enabled: true,
      frequency: 'high',
      assignmentMode: 'manual',
    },
    toggles: {
      dynamicDifficulty: true,
      momentumBonuses: true,
      drawTwoPickOne: true,
      autoAssignOne: false,
      enableChaosCards: true,
      enablePropCards: true,
    },
  }

  const normalized = normalizeRoundConfig(config)

  assert.equal(normalized.gameMode, 'powerUps')
  assert.deepEqual(normalized.enabledPackIds, [])
  assert.equal(normalized.featuredHoles.enabled, false)
  assert.equal(normalized.toggles.drawTwoPickOne, false)
  assert.equal(normalized.toggles.autoAssignOne, true)
  assert.equal(normalized.toggles.enableChaosCards, false)
  assert.equal(normalized.toggles.enablePropCards, false)
})

