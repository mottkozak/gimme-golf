/// <reference types="node" />

import assert from 'node:assert/strict'
import test from 'node:test'
import type { HoleDefinition } from '../types/game.ts'
import {
  findScoreTargetMatch,
  getPersonalParByHole,
  getProjectedRoundScore,
  getScoreTargetStrokes,
} from './personalPar.ts'

const SAMPLE_HOLES: HoleDefinition[] = [
  { holeNumber: 1, par: 4, tags: [], featuredHoleType: null },
  { holeNumber: 2, par: 4, tags: [], featuredHoleType: null },
  { holeNumber: 3, par: 3, tags: [], featuredHoleType: null },
  { holeNumber: 4, par: 5, tags: [], featuredHoleType: null },
  { holeNumber: 5, par: 4, tags: [], featuredHoleType: null },
  { holeNumber: 6, par: 4, tags: [], featuredHoleType: null },
  { holeNumber: 7, par: 3, tags: [], featuredHoleType: null },
  { holeNumber: 8, par: 5, tags: [], featuredHoleType: null },
  { holeNumber: 9, par: 4, tags: [], featuredHoleType: null },
]

test('projected score scales to selected hole count', () => {
  assert.equal(getProjectedRoundScore(92, 18), 92)
  assert.equal(getProjectedRoundScore(92, 9), 46)
})

test('personal par distributes positive delta across holes deterministically', () => {
  const personalPar = getPersonalParByHole(108, SAMPLE_HOLES, 9)
  assert.deepEqual(personalPar, [6, 6, 5, 7, 6, 6, 5, 7, 6])
})

test('personal par distributes negative delta across holes and clamps minimum', () => {
  const personalPar = getPersonalParByHole(18, SAMPLE_HOLES, 9)
  assert.deepEqual(personalPar, [1, 1, 1, 2, 1, 1, 1, 2, 1])
})

test('score-target parsing finds the most specific match', () => {
  assert.deepEqual(findScoreTargetMatch('Finish triple bogey or better to earn points.'), {
    phrase: 'triple bogey or better',
    offsetFromPar: 3,
  })
  assert.deepEqual(findScoreTargetMatch('Hit from bunker and make par or better.'), {
    phrase: 'par or better',
    offsetFromPar: 0,
  })
  assert.equal(findScoreTargetMatch('Win the hole with style points.'), null)
})

test('score target strokes are based on personal par', () => {
  assert.equal(getScoreTargetStrokes('Finish bogey or better.', 5), 6)
  assert.equal(getScoreTargetStrokes('Finish par or better.', 5), 5)
  assert.equal(getScoreTargetStrokes('No score term here.', 5), null)
})
