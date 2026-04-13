/// <reference types="node" />

import assert from 'node:assert/strict'
import test from 'node:test'
import type { PlayerRoundStats } from './awards.ts'
import { computeRecapArchetypes } from './recapArchetypes.ts'

function createStats(input: {
  playerId: string
  playerName: string
  totalAdjustedScore: number
  totalGamePoints?: number
  publicImpactMagnitude?: number
  positionImprovement?: number
}): PlayerRoundStats {
  return {
    playerId: input.playerId,
    playerName: input.playerName,
    missionsCompleted: 1,
    missionsFailed: 1,
    totalGamePoints: input.totalGamePoints ?? 0,
    totalRealScore: input.totalAdjustedScore + 4,
    totalAdjustedScore: input.totalAdjustedScore,
    hardCardsChosen: 0,
    hardCardsCompleted: 0,
    hardCardsFailed: 0,
    riskCardsChosen: 0,
    longestStreak: 1,
    momentumBonusesEarned: 0,
    momentumSuccesses: 0,
    publicCardPointsGained: 0,
    publicCardPointsLost: 0,
    publicImpactMagnitude: input.publicImpactMagnitude ?? 0,
    curseCardsFaced: 0,
    curseCardsSurvived: 0,
    totalPotentialPointsFromChosenCards: 0,
    totalActualCardPointsEarned: 0,
    totalActualPointsEarned: 0,
    potentialPointsLeftOnTable: 0,
    highValueCardsChosen: 0,
    highValueCardsFailed: 0,
    hardOfferSelections: 1,
    safeOfferSelections: 1,
    leaderboardPositionByHole: [2, 2, 2],
    pointDeficitByHole: [0, 1, 0],
    positionImprovement: input.positionImprovement ?? 0,
    pointDeficitRecovered: 0,
    lateRoundPoints: 1,
  }
}

test('computeRecapArchetypes diversifies labels across players', () => {
  const archetypes = computeRecapArchetypes({
    p1: createStats({ playerId: 'p1', playerName: 'Alex', totalAdjustedScore: 66, totalGamePoints: 3 }),
    p2: createStats({
      playerId: 'p2',
      playerName: 'Casey',
      totalAdjustedScore: 73,
      totalGamePoints: 2,
      positionImprovement: 2,
    }),
    p3: createStats({ playerId: 'p3', playerName: 'Jordan', totalAdjustedScore: 70, totalGamePoints: 1 }),
  })

  const uniqueTitles = new Set(archetypes.map((archetype) => archetype.title))
  assert.equal(archetypes.length, 3)
  assert.equal(uniqueTitles.size, 3)
})

test('computeRecapArchetypes assigns Chaos Agent to highest public-impact player', () => {
  const archetypes = computeRecapArchetypes({
    p1: createStats({
      playerId: 'p1',
      playerName: 'Alex',
      totalAdjustedScore: 68,
      publicImpactMagnitude: 2,
    }),
    p2: createStats({
      playerId: 'p2',
      playerName: 'Casey',
      totalAdjustedScore: 72,
      publicImpactMagnitude: 6,
    }),
  })

  const casey = archetypes.find((archetype) => archetype.playerId === 'p2')
  assert.equal(casey?.title, 'The Chaos Agent')
})
