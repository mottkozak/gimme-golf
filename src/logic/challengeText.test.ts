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
    doubleBogeyOrBetter: 'double bogey or better',
    tripleBogeyOrBetter: 'triple bogey or better',
  })

  assert.deepEqual(getScoreTargetPhraseMapForExpectedScore(92), {
    parOrBetter: 'par or better',
    bogeyOrBetter: 'bogey or better',
    doubleBogeyOrBetter: 'double bogey or better',
    tripleBogeyOrBetter: 'triple bogey or better',
  })

  assert.deepEqual(getScoreTargetPhraseMapForExpectedScore(110), {
    parOrBetter: 'par or better',
    bogeyOrBetter: 'bogey or better',
    doubleBogeyOrBetter: 'double bogey or better',
    tripleBogeyOrBetter: 'triple bogey or better',
  })
})

test('challenge text stays canonical with personal par guidance', () => {
  const input = 'Hit one shot one-handed during this hole, then finish double bogey or better.'

  assert.equal(
    adaptChallengeTextToSkillLevel(input, 74),
    'Hit one shot one-handed during this hole, then finish double bogey or better.',
  )
  assert.equal(
    adaptChallengeTextToSkillLevel(input, 92),
    'Hit one shot one-handed during this hole, then finish double bogey or better.',
  )
  assert.equal(
    adaptChallengeTextToSkillLevel(input, 112),
    'Hit one shot one-handed during this hole, then finish double bogey or better.',
  )
})

test('canonical phrases are preserved verbatim', () => {
  const input =
    'Make bogey or better. If things go sideways, still finish double bogey or better.'

  assert.equal(
    adaptChallengeTextToSkillLevel(input, 92),
    'Make bogey or better. If things go sideways, still finish double bogey or better.',
  )
})
