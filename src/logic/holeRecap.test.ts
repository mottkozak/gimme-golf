/// <reference types="node" />

import assert from 'node:assert/strict'
import test from 'node:test'
import { createNewRoundState } from './roundLifecycle.ts'
import {
  buildHoleRecapData,
  clearHoleRecapDataCache,
  formatAdjustedHoleWinnersSupportingLine,
} from './holeRecap.ts'
import type { HoleRecapData } from './holeRecap.ts'
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

test('formatAdjustedHoleWinnersSupportingLine shows stroke and point math for the winner', () => {
  const recapStub = {
    gameMode: 'cards',
    adjustedHoleWinners: {
      score: 5,
      playerIds: ['p1'],
      playerNames: ['Matt'],
    },
    playerRows: [
      {
        playerId: 'p1',
        playerName: 'Matt',
        strokes: 8,
        holePoints: 3,
      },
    ],
  } as unknown as HoleRecapData

  assert.equal(
    formatAdjustedHoleWinnersSupportingLine(recapStub),
    'Hole Winner: Matt (8 real strokes - 3 hole points = 5 adjusted score).',
  )
})

test('formatAdjustedHoleWinnersSupportingLine uses plural label for ties', () => {
  const recapStub = {
    gameMode: 'cards',
    adjustedHoleWinners: {
      score: 4,
      playerIds: ['p1', 'p2'],
      playerNames: ['Matt', 'Casey'],
    },
    playerRows: [
      { playerId: 'p1', playerName: 'Matt', strokes: 7, holePoints: 3 },
      { playerId: 'p2', playerName: 'Casey', strokes: 6, holePoints: 2 },
    ],
  } as unknown as HoleRecapData

  assert.equal(
    formatAdjustedHoleWinnersSupportingLine(recapStub),
    'Hole Winners: Matt (7 real strokes - 3 hole points = 4 adjusted score), Casey (6 real strokes - 2 hole points = 4 adjusted score).',
  )
})

test('formatAdjustedHoleWinnersSupportingLine uses actual strokes for power ups mode', () => {
  const recapStub = {
    gameMode: 'powerUps',
    bestRealScoreHoleWinners: {
      score: 3,
      playerIds: ['p2'],
      playerNames: ['Casey'],
    },
    playerRows: [
      { playerId: 'p1', playerName: 'Matt', strokes: 4, holePoints: 8 },
      { playerId: 'p2', playerName: 'Casey', strokes: 3, holePoints: -2 },
    ],
  } as unknown as HoleRecapData

  assert.equal(
    formatAdjustedHoleWinnersSupportingLine(recapStub),
    'Hole Winner: Casey (3 actual strokes).',
  )
})

