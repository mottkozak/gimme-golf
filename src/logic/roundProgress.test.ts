/// <reference types="node" />

import assert from 'node:assert/strict'
import test from 'node:test'
import { prepareCurrentHoleForPlay } from './holeFlow.ts'
import { hasRoundProgress } from './roundProgress.ts'
import { createNewRoundState, resetRoundProgress } from './roundLifecycle.ts'

test('hasRoundProgress returns false for a fresh round', () => {
  const roundState = createNewRoundState()

  assert.equal(hasRoundProgress(roundState), false)
})

test('hasRoundProgress returns true once a hole is prepared', () => {
  const preparedRoundState = prepareCurrentHoleForPlay(createNewRoundState(), 1_000)

  assert.equal(hasRoundProgress(preparedRoundState), true)
})

test('hasRoundProgress returns false again after resetting round progress', () => {
  const preparedRoundState = prepareCurrentHoleForPlay(createNewRoundState(), 2_000)
  const resetState = resetRoundProgress(preparedRoundState)

  assert.equal(hasRoundProgress(resetState), false)
})
