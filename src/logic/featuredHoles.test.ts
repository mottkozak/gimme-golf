/// <reference types="node" />

import assert from 'node:assert/strict'
import test from 'node:test'
import {
  applyFeaturedMissionPoints,
  assignFeaturedHolesForRound,
  getFeaturedHoleTargetCount,
  resolveRivalryWinner,
} from './featuredHoles.ts'
import type { HoleDefinition } from '../types/game.ts'

test('applyFeaturedMissionPoints applies jackpot and double-points bonuses', () => {
  assert.deepEqual(applyFeaturedMissionPoints(2, 'jackpot'), {
    missionPoints: 3,
    featuredBonusPoints: 1,
  })
  assert.deepEqual(applyFeaturedMissionPoints(3, 'double_points'), {
    missionPoints: 5,
    featuredBonusPoints: 2,
  })
})

test('resolveRivalryWinner breaks tied points using lower strokes', () => {
  const winner = resolveRivalryWinner(
    { playerAId: 'p1', playerBId: 'p2' },
    { p1: 2, p2: 2 },
    { p1: 5, p2: 4 },
  )

  assert.equal(winner, 'p2')
})

test('assignFeaturedHolesForRound keeps manual picks or falls back to auto when empty', () => {
  const holes: HoleDefinition[] = Array.from({ length: 9 }, (_, index) => ({
    holeNumber: index + 1,
    par: 4,
    tags: [],
    featuredHoleType: null,
  }))
  const manualWithOne: HoleDefinition[] = holes.map((hole, index) => ({
    ...hole,
    featuredHoleType: index === 0 ? ('chaos' as const) : null,
  }))
  const preserved = assignFeaturedHolesForRound(manualWithOne, {
    enabled: true,
    frequency: 'normal',
    assignmentMode: 'manual',
    randomSeed: 7,
  })
  const autoFallback = assignFeaturedHolesForRound(holes, {
    enabled: true,
    frequency: 'normal',
    assignmentMode: 'manual',
    randomSeed: 7,
  })

  assert.equal(preserved[0].featuredHoleType, 'chaos')
  assert.equal(preserved.filter((hole) => hole.featuredHoleType !== null).length, 1)
  assert.ok(autoFallback.some((hole) => hole.featuredHoleType !== null))
})

test('assignFeaturedHolesForRound clears assignments when featured holes are disabled', () => {
  const holes: HoleDefinition[] = Array.from({ length: 9 }, (_, index) => ({
    holeNumber: index + 1,
    par: 4,
    tags: [],
    featuredHoleType: index === 2 ? 'chaos' : null,
  }))

  const disabled = assignFeaturedHolesForRound(holes, {
    enabled: false,
    frequency: 'high',
    assignmentMode: 'auto',
    randomSeed: 7,
  })

  assert.equal(disabled.every((hole) => hole.featuredHoleType === null), true)
})

test('assignFeaturedHolesForRound auto mode assigns configured target count', () => {
  const holes: HoleDefinition[] = Array.from({ length: 9 }, (_, index) => ({
    holeNumber: index + 1,
    par: 4,
    tags: [],
    featuredHoleType: null,
  }))

  const assigned = assignFeaturedHolesForRound(holes, {
    enabled: true,
    frequency: 'high',
    assignmentMode: 'auto',
    randomSeed: 7,
  })
  const assignedCount = assigned.filter((hole) => hole.featuredHoleType !== null).length

  assert.equal(assignedCount, getFeaturedHoleTargetCount(9, 'high'))
})

test('assignFeaturedHolesForRound randomizes featured-hole types in a seed-controlled way', () => {
  const holes: HoleDefinition[] = Array.from({ length: 9 }, (_, index) => ({
    holeNumber: index + 1,
    par: 4,
    tags: [],
    featuredHoleType: null,
  }))

  const seedA = assignFeaturedHolesForRound(holes, {
    enabled: true,
    frequency: 'high',
    assignmentMode: 'auto',
    randomSeed: 101,
  })
  const seedARepeat = assignFeaturedHolesForRound(holes, {
    enabled: true,
    frequency: 'high',
    assignmentMode: 'auto',
    randomSeed: 101,
  })
  const seedB = assignFeaturedHolesForRound(holes, {
    enabled: true,
    frequency: 'high',
    assignmentMode: 'auto',
    randomSeed: 202,
  })

  assert.deepEqual(
    seedA.map((hole) => hole.featuredHoleType),
    seedARepeat.map((hole) => hole.featuredHoleType),
  )
  assert.notDeepEqual(
    seedA.map((hole) => hole.featuredHoleType),
    seedB.map((hole) => hole.featuredHoleType),
  )
})
