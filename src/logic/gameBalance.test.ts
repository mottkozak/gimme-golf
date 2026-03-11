/// <reference types="node" />

import assert from 'node:assert/strict'
import test from 'node:test'
import { getOfferPointRange, getSkillBandForExpectedScore } from './gameBalance.ts'

test('skill-band boundaries match expected score ranges', () => {
  assert.equal(getSkillBandForExpectedScore(72), 'advanced')
  assert.equal(getSkillBandForExpectedScore(85), 'advanced')
  assert.equal(getSkillBandForExpectedScore(86), 'intermediate')
  assert.equal(getSkillBandForExpectedScore(100), 'intermediate')
  assert.equal(getSkillBandForExpectedScore(101), 'developing')
})

test('dynamic offer point ranges expose mixed-skill fairness ceilings', () => {
  assert.deepEqual(getOfferPointRange(80, true, 'safe'), { minPoints: 1, maxPoints: 1 })
  assert.deepEqual(getOfferPointRange(80, true, 'hard'), { minPoints: 2, maxPoints: 2 })

  assert.deepEqual(getOfferPointRange(92, true, 'safe'), { minPoints: 1, maxPoints: 2 })
  assert.deepEqual(getOfferPointRange(92, true, 'hard'), { minPoints: 3, maxPoints: 3 })

  assert.deepEqual(getOfferPointRange(112, true, 'safe'), { minPoints: 2, maxPoints: 2 })
  assert.deepEqual(getOfferPointRange(112, true, 'hard'), { minPoints: 4, maxPoints: 5 })
})
