/// <reference types="node" />

import assert from 'node:assert/strict'
import test from 'node:test'
import { prepareCurrentHoleForPlay } from './holeFlow.ts'
import { createNewRoundState } from './roundLifecycle.ts'
import { recalculateRoundTotals } from './scoring.ts'
import { incrementHoleTapCount, markHoleCompletedAt } from './uxMetrics.ts'

test('primary flow smoke: setup to one completed hole to recap and next hole', () => {
  let roundState = recalculateRoundTotals(createNewRoundState())

  roundState = recalculateRoundTotals(prepareCurrentHoleForPlay(roundState, 1_000))

  const holeIndex = roundState.currentHoleIndex
  const players = roundState.players

  const nextHoleResults = [...roundState.holeResults]
  nextHoleResults[holeIndex] = {
    ...nextHoleResults[holeIndex],
    strokesByPlayerId: Object.fromEntries(players.map((player) => [player.id, 4])),
    missionStatusByPlayerId: Object.fromEntries(
      players.map((player) => {
        const dealtCards = roundState.holeCards[holeIndex].dealtPersonalCardsByPlayerId[player.id] ?? []
        return [player.id, dealtCards.length > 0 ? 'success' : 'pending']
      }),
    ),
  }

  roundState = recalculateRoundTotals({
    ...roundState,
    holeResults: nextHoleResults,
    holeUxMetrics: incrementHoleTapCount(roundState.holeUxMetrics, holeIndex),
  })

  roundState = recalculateRoundTotals({
    ...roundState,
    holeUxMetrics: markHoleCompletedAt(roundState.holeUxMetrics, holeIndex, 2_500),
  })

  roundState = recalculateRoundTotals({
    ...roundState,
    currentHoleIndex: holeIndex + 1,
  })

  assert.equal(roundState.currentHoleIndex, 1)
  assert.equal(roundState.holeUxMetrics[0].startedAtMs, 1_000)
  assert.equal(roundState.holeUxMetrics[0].durationMs, 1_500)
  assert.ok(roundState.holeUxMetrics[0].tapsToComplete >= 1)
  assert.equal(roundState.holeUxMetrics[1].startedAtMs, null)
})
