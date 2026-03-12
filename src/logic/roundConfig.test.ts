/// <reference types="node" />

import assert from 'node:assert/strict'
import test from 'node:test'
import type { RoundConfig } from '../types/game.ts'
import { clearEntitlementState, setPremiumPacksActive } from './entitlements.ts'
import { normalizeRoundConfig } from './roundConfig.ts'

interface LocalStorageLike {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
  clear: () => void
}

function installLocalStorageMock(): void {
  const store = new Map<string, string>()

  const mockStorage: LocalStorageLike = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value)
    },
    removeItem: (key) => {
      store.delete(key)
    },
    clear: () => {
      store.clear()
    },
  }

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: mockStorage,
  })
}

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

test('normalizeRoundConfig filters locked premium packs when premium mode is active', () => {
  installLocalStorageMock()
  clearEntitlementState()
  setPremiumPacksActive(true)

  const config: RoundConfig = {
    holeCount: 9,
    courseStyle: 'standard',
    gameMode: 'cards',
    selectedPresetId: 'custom',
    customModeName: 'Entitlement Test',
    enabledPackIds: ['classic', 'curse'],
    featuredHoles: {
      enabled: true,
      frequency: 'normal',
      assignmentMode: 'auto',
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

  assert.deepEqual(normalized.enabledPackIds.includes('curse'), false)
  assert.deepEqual(normalized.enabledPackIds.includes('classic'), true)
})

test('normalizeRoundConfig enforces two-card choice for card mode rounds', () => {
  const config: RoundConfig = {
    holeCount: 9,
    courseStyle: 'standard',
    gameMode: 'cards',
    selectedPresetId: 'custom',
    customModeName: 'Two Card Enforced',
    enabledPackIds: ['classic'],
    featuredHoles: {
      enabled: true,
      frequency: 'normal',
      assignmentMode: 'auto',
    },
    toggles: {
      dynamicDifficulty: true,
      momentumBonuses: true,
      drawTwoPickOne: false,
      autoAssignOne: true,
      enableChaosCards: false,
      enablePropCards: false,
    },
  }

  const normalized = normalizeRoundConfig(config)

  assert.equal(normalized.gameMode, 'cards')
  assert.equal(normalized.toggles.drawTwoPickOne, true)
  assert.equal(normalized.toggles.autoAssignOne, false)
})
