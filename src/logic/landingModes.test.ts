/// <reference types="node" />

import assert from 'node:assert/strict'
import test from 'node:test'
import { createNewRoundState } from './roundLifecycle.ts'
import { applyLandingModeToRound, resolveLandingModeIdFromConfig } from './landingModes.ts'

test('applyLandingModeToRound configures requested landing mode presets', () => {
  const initialRound = createNewRoundState()

  const classicRound = applyLandingModeToRound(initialRound, 'classic')
  assert.equal(classicRound.config.gameMode, 'cards')
  assert.deepEqual(classicRound.config.enabledPackIds, ['classic'])

  const noveltyRound = applyLandingModeToRound(initialRound, 'novelty')
  assert.equal(noveltyRound.config.gameMode, 'cards')
  assert.deepEqual(noveltyRound.config.enabledPackIds, ['classic', 'novelty'])

  const chaosRound = applyLandingModeToRound(initialRound, 'chaos')
  assert.equal(chaosRound.config.gameMode, 'cards')
  assert.deepEqual(chaosRound.config.enabledPackIds, ['classic', 'chaos'])
  assert.equal(chaosRound.config.toggles.enableChaosCards, true)
  assert.equal(chaosRound.config.toggles.enablePropCards, false)

  const propsRound = applyLandingModeToRound(initialRound, 'props')
  assert.equal(propsRound.config.gameMode, 'cards')
  assert.deepEqual(propsRound.config.enabledPackIds, ['classic', 'props'])
  assert.equal(propsRound.config.toggles.enableChaosCards, false)
  assert.equal(propsRound.config.toggles.enablePropCards, true)

  const powerUpsRound = applyLandingModeToRound(initialRound, 'powerUps')
  assert.equal(powerUpsRound.config.gameMode, 'powerUps')
  assert.deepEqual(powerUpsRound.config.enabledPackIds, [])
})

test('resolveLandingModeIdFromConfig maps current config to landing mode id', () => {
  const baseRound = createNewRoundState()

  assert.equal(resolveLandingModeIdFromConfig(baseRound.config), 'classic')
  assert.equal(
    resolveLandingModeIdFromConfig({
      ...baseRound.config,
      enabledPackIds: ['classic', 'novelty'],
    }),
    'novelty',
  )
  assert.equal(
    resolveLandingModeIdFromConfig({
      ...baseRound.config,
      enabledPackIds: ['classic', 'chaos'],
    }),
    'chaos',
  )
  assert.equal(
    resolveLandingModeIdFromConfig({
      ...baseRound.config,
      enabledPackIds: ['classic', 'props'],
    }),
    'props',
  )
  assert.equal(
    resolveLandingModeIdFromConfig({
      ...baseRound.config,
      gameMode: 'powerUps',
      enabledPackIds: [],
    }),
    'powerUps',
  )
})
