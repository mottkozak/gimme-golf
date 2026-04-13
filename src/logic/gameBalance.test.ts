/// <reference types="node" />

import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getAdjustedScoreDeficitFromLeader,
  getOfferPointRange,
  getSkillBandForExpectedScore,
} from './gameBalance.ts'

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

test('catch-up mode only boosts point ranges for players behind leader threshold', () => {
  const totalsByPlayerId = {
    leader: { realScore: 25, gamePoints: 4, adjustedScore: 21 },
    trailer: { realScore: 28, gamePoints: 3, adjustedScore: 25 },
  }

  assert.deepEqual(
    getOfferPointRange(80, true, 'hard', {
      enabled: true,
      playerId: 'leader',
      totalsByPlayerId,
    }),
    { minPoints: 2, maxPoints: 2 },
  )
  assert.deepEqual(
    getOfferPointRange(80, true, 'hard', {
      enabled: true,
      playerId: 'trailer',
      totalsByPlayerId,
    }),
    { minPoints: 3, maxPoints: 3 },
  )
})

test('adjusted-score deficit helper computes distance from current leader', () => {
  const totalsByPlayerId = {
    p1: { realScore: 19, gamePoints: 2, adjustedScore: 17 },
    p2: { realScore: 20, gamePoints: 1, adjustedScore: 19 },
    p3: { realScore: 18, gamePoints: 0, adjustedScore: 18 },
  }

  assert.equal(getAdjustedScoreDeficitFromLeader('p1', totalsByPlayerId), 0)
  assert.equal(getAdjustedScoreDeficitFromLeader('p2', totalsByPlayerId), 2)
  assert.equal(getAdjustedScoreDeficitFromLeader('p3', totalsByPlayerId), 1)
})
