/// <reference types="node" />

import assert from 'node:assert/strict'
import test from 'node:test'
import {
  adaptChallengeTextToSkillLevel,
  getScoreTargetPhraseMapForExpectedScore,
} from './challengeText.ts'

test('skill-level phrase maps adjust score targets by expected score', () => {
  assert.deepEqual(getScoreTargetPhraseMapForExpectedScore(74), {
    parOrBetter: 'par or better',
    bogeyOrBetter: 'bogey or better',
    doubleBogeyOrBetter: 'bogey or better',
    tripleBogeyOrBetter: 'double bogey or better',
  })

  assert.deepEqual(getScoreTargetPhraseMapForExpectedScore(92), {
    parOrBetter: 'bogey or better',
    bogeyOrBetter: 'double bogey or better',
    doubleBogeyOrBetter: 'double bogey or better',
    tripleBogeyOrBetter: 'triple bogey or better',
  })

  assert.deepEqual(getScoreTargetPhraseMapForExpectedScore(110), {
    parOrBetter: 'double bogey or better',
    bogeyOrBetter: 'triple bogey or better',
    doubleBogeyOrBetter: 'triple bogey or better',
    tripleBogeyOrBetter: 'triple bogey or better',
  })
})

test('one-handed swing challenge adapts by skill level', () => {
  const input = 'Hit one shot one-handed during this hole, then finish double bogey or better.'

  assert.equal(
    adaptChallengeTextToSkillLevel(input, 74),
    'Hit one shot one-handed during this hole, then finish bogey or better.',
  )
  assert.equal(
    adaptChallengeTextToSkillLevel(input, 92),
    'Hit one shot one-handed during this hole, then finish double bogey or better.',
  )
  assert.equal(
    adaptChallengeTextToSkillLevel(input, 112),
    'Hit one shot one-handed during this hole, then finish triple bogey or better.',
  )
})

test('phrase replacement avoids nested double replacements', () => {
  const input =
    'Make bogey or better. If things go sideways, still finish double bogey or better.'

  assert.equal(
    adaptChallengeTextToSkillLevel(input, 92),
    'Make double bogey or better. If things go sideways, still finish double bogey or better.',
  )
})
