/// <reference types="node" />

import assert from 'node:assert/strict'
import test from 'node:test'
import { BAD_POWER_UPS } from '../data/powerUps.ts'
import type { HoleResultState, Player } from '../types/game.ts'
import {
  assignPowerUpsForHoleWithLeaderHandicap,
  createEmptyHolePowerUpState,
  getAssignedPowerUp,
} from './powerUps.ts'

const PLAYERS: Player[] = [
  { id: 'p1', name: 'Player 1', expectedScore18: 90 },
  { id: 'p2', name: 'Player 2', expectedScore18: 90 },
  { id: 'p3', name: 'Player 3', expectedScore18: 90 },
]

function createHoleResult(
  holeNumber: number,
  strokesByPlayerId: Record<string, number | null>,
): HoleResultState {
  return {
    holeNumber,
    strokesByPlayerId,
    missionStatusByPlayerId: Object.fromEntries(PLAYERS.map((player) => [player.id, 'pending'])),
    publicPointDeltaByPlayerId: Object.fromEntries(PLAYERS.map((player) => [player.id, 0])),
    publicCardResolutionsByCardId: {},
    publicCardResolutionNotes: 'Test data',
  }
}

test('power ups handicap: hole 1 assigns only positive power-ups', () => {
  const holePowerUps = assignPowerUpsForHoleWithLeaderHandicap(
    PLAYERS,
    1,
    [],
    0,
    [{ id: 'good', title: 'Good', description: 'positive' }],
    [{ id: 'bad', title: 'Bad', description: 'negative' }],
  )

  PLAYERS.forEach((player) => {
    assert.equal(holePowerUps.assignedPowerUpIdByPlayerId[player.id], 'good')
  })
})

test('power ups handicap: current leader gets a bad power-up on later holes', () => {
  const holeResults: HoleResultState[] = [
    createHoleResult(1, {
      p1: 3,
      p2: 4,
      p3: 5,
    }),
  ]

  const holePowerUps = assignPowerUpsForHoleWithLeaderHandicap(
    PLAYERS,
    2,
    holeResults,
    1,
    [{ id: 'good', title: 'Good', description: 'positive' }],
    [{ id: 'bad', title: 'Bad', description: 'negative' }],
  )

  assert.equal(holePowerUps.assignedPowerUpIdByPlayerId.p1, 'bad')
  assert.equal(holePowerUps.assignedPowerUpIdByPlayerId.p2, 'good')
  assert.equal(holePowerUps.assignedPowerUpIdByPlayerId.p3, 'good')
})

test('power ups handicap: tied leaders all receive bad power-ups', () => {
  const holeResults: HoleResultState[] = [
    createHoleResult(1, {
      p1: 4,
      p2: 4,
      p3: 5,
    }),
  ]

  const holePowerUps = assignPowerUpsForHoleWithLeaderHandicap(
    PLAYERS,
    2,
    holeResults,
    1,
    [{ id: 'good', title: 'Good', description: 'positive' }],
    [{ id: 'bad', title: 'Bad', description: 'negative' }],
  )

  assert.equal(holePowerUps.assignedPowerUpIdByPlayerId.p1, 'bad')
  assert.equal(holePowerUps.assignedPowerUpIdByPlayerId.p2, 'bad')
  assert.equal(holePowerUps.assignedPowerUpIdByPlayerId.p3, 'good')
})

test('power ups handicap: incomplete prior hole keeps assignments positive', () => {
  const holeResults: HoleResultState[] = [
    createHoleResult(1, {
      p1: 3,
      p2: null,
      p3: 5,
    }),
  ]

  const holePowerUps = assignPowerUpsForHoleWithLeaderHandicap(
    PLAYERS,
    2,
    holeResults,
    1,
    [{ id: 'good', title: 'Good', description: 'positive' }],
    [{ id: 'bad', title: 'Bad', description: 'negative' }],
  )

  PLAYERS.forEach((player) => {
    assert.equal(holePowerUps.assignedPowerUpIdByPlayerId[player.id], 'good')
  })
})

test('getAssignedPowerUp resolves bad power-up ids', () => {
  const holePowerUpState = createEmptyHolePowerUpState(PLAYERS, 2)
  const badPowerUpId = BAD_POWER_UPS[0]?.id

  assert.ok(badPowerUpId)

  holePowerUpState.assignedPowerUpIdByPlayerId.p1 = badPowerUpId
  const assignedPowerUp = getAssignedPowerUp(holePowerUpState, 'p1')

  assert.equal(assignedPowerUp?.id, badPowerUpId)
})
