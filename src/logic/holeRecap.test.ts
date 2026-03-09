/// <reference types="node" />

import assert from 'node:assert/strict'
import test from 'node:test'
import { createNewRoundState } from './roundLifecycle.ts'
import { buildHoleRecapData, clearHoleRecapDataCache } from './holeRecap.ts'
import { recalculateRoundTotals } from './scoring.ts'

test('buildHoleRecapData reuses cache for identical round references', () => {
  clearHoleRecapDataCache()

  const roundState = recalculateRoundTotals(createNewRoundState())
  const first = buildHoleRecapData(roundState)
  const second = buildHoleRecapData(roundState)

  assert.strictEqual(first, second)
})

test('buildHoleRecapData invalidates cache when current hole changes', () => {
  clearHoleRecapDataCache()

  const roundState = recalculateRoundTotals(createNewRoundState())
  const first = buildHoleRecapData(roundState)
  const movedHoleState = {
    ...roundState,
    currentHoleIndex: 1,
  }
  const second = buildHoleRecapData(movedHoleState)

  assert.notStrictEqual(first, second)
  assert.notEqual(first.holeNumber, second.holeNumber)
})

