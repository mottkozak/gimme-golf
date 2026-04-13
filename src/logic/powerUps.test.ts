/// <reference types="node" />

import assert from 'node:assert/strict'
import test from 'node:test'
import { CURSE_CARDS, type PowerUp } from '../data/powerUps.ts'
import type { HoleResultState, Player } from '../types/game.ts'
import {
  assignPowerUpsForHoleWithCurses,
  createEmptyHolePowerUpState,
  getAssignedCurse,
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
  players: Player[] = PLAYERS,
): HoleResultState {
  return {
    holeNumber,
    strokesByPlayerId,
    missionStatusByPlayerId: Object.fromEntries(players.map((player) => [player.id, 'pending'])),
    publicPointDeltaByPlayerId: Object.fromEntries(players.map((player) => [player.id, 0])),
    publicCardResolutionsByCardId: {},
    publicCardResolutionNotes: 'Test data',
  }
}

function createTestPowerUp(id: string, title: string): PowerUp {
  return {
    id,
    code: `PWR-T-${id.toUpperCase()}`,
    title,
    description: 'test',
    cardKind: 'power_up',
    category: 'test',
    difficulty: 'medium',
    isActive: true,
    expansionPack: 'power-ups',
    legendary: false,
  }
}

function createTestCurse(id: string, title: string): PowerUp {
  return {
    id,
    code: `CUR-T-${id.toUpperCase()}`,
    title,
    description: 'test',
    cardKind: 'curse',
    category: 'curse',
    difficulty: 'medium',
    isActive: true,
    expansionPack: 'power-ups',
  }
}

test('power ups mode: hole 1 assigns only positive power-ups', () => {
  const holePowerUps = assignPowerUpsForHoleWithCurses(
    PLAYERS,
    1,
    [],
    0,
    [createTestPowerUp('good', 'Good')],
    [createTestCurse('curse', 'Curse')],
  )

  PLAYERS.forEach((player) => {
    assert.equal(holePowerUps.assignedPowerUpIdByPlayerId[player.id], 'good')
    assert.equal(holePowerUps.assignedCurseIdByPlayerId[player.id], null)
    assert.equal(holePowerUps.usedPowerUpByPlayerId[player.id], true)
  })
})

test('power ups mode: overall round leader gets a curse and no positive power-up', () => {
  const holeResults: HoleResultState[] = [
    createHoleResult(1, {
      p1: 3,
      p2: 4,
      p3: 5,
    }),
  ]

  const holePowerUps = assignPowerUpsForHoleWithCurses(
    PLAYERS,
    2,
    holeResults,
    1,
    [createTestPowerUp('good', 'Good')],
    [createTestCurse('curse', 'Curse')],
  )

  assert.equal(holePowerUps.assignedPowerUpIdByPlayerId.p1, null)
  assert.equal(holePowerUps.assignedPowerUpIdByPlayerId.p2, 'good')
  assert.equal(holePowerUps.assignedPowerUpIdByPlayerId.p3, 'good')

  assert.equal(holePowerUps.assignedCurseIdByPlayerId.p1, 'curse')
  assert.equal(holePowerUps.assignedCurseIdByPlayerId.p2, null)
  assert.equal(holePowerUps.assignedCurseIdByPlayerId.p3, null)
  assert.equal(holePowerUps.usedPowerUpByPlayerId.p1, false)
  assert.equal(holePowerUps.usedPowerUpByPlayerId.p2, true)
  assert.equal(holePowerUps.usedPowerUpByPlayerId.p3, true)
})

test('power ups mode: crowded tie for round lead keeps all players on positive power-ups', () => {
  const holeResults: HoleResultState[] = [
    createHoleResult(1, {
      p1: 4,
      p2: 4,
      p3: 5,
    }),
  ]

  const holePowerUps = assignPowerUpsForHoleWithCurses(
    PLAYERS,
    2,
    holeResults,
    1,
    [createTestPowerUp('good', 'Good')],
    [createTestCurse('curse', 'Curse')],
  )

  assert.equal(holePowerUps.assignedPowerUpIdByPlayerId.p1, 'good')
  assert.equal(holePowerUps.assignedPowerUpIdByPlayerId.p2, 'good')
  assert.equal(holePowerUps.assignedPowerUpIdByPlayerId.p3, 'good')

  assert.equal(holePowerUps.assignedCurseIdByPlayerId.p1, null)
  assert.equal(holePowerUps.assignedCurseIdByPlayerId.p2, null)
  assert.equal(holePowerUps.assignedCurseIdByPlayerId.p3, null)
})

test('power ups mode: in a 4-player lobby, two tied leaders are eligible for curses', () => {
  const fourPlayers: Player[] = [
    { id: 'p1', name: 'Player 1', expectedScore18: 90 },
    { id: 'p2', name: 'Player 2', expectedScore18: 90 },
    { id: 'p3', name: 'Player 3', expectedScore18: 90 },
    { id: 'p4', name: 'Player 4', expectedScore18: 90 },
  ]
  const holeResults: HoleResultState[] = [
    createHoleResult(
      1,
      {
        p1: 4,
        p2: 4,
        p3: 5,
        p4: 6,
      },
      fourPlayers,
    ),
  ]

  const holePowerUps = assignPowerUpsForHoleWithCurses(
    fourPlayers,
    2,
    holeResults,
    1,
    [createTestPowerUp('good', 'Good')],
    [createTestCurse('curse', 'Curse')],
  )

  assert.equal(holePowerUps.assignedPowerUpIdByPlayerId.p1, null)
  assert.equal(holePowerUps.assignedPowerUpIdByPlayerId.p2, null)
  assert.equal(holePowerUps.assignedPowerUpIdByPlayerId.p3, 'good')
  assert.equal(holePowerUps.assignedPowerUpIdByPlayerId.p4, 'good')

  assert.equal(holePowerUps.assignedCurseIdByPlayerId.p1, 'curse')
  assert.equal(holePowerUps.assignedCurseIdByPlayerId.p2, 'curse')
  assert.equal(holePowerUps.assignedCurseIdByPlayerId.p3, null)
  assert.equal(holePowerUps.assignedCurseIdByPlayerId.p4, null)
})

test('power ups mode: incomplete prior holes assign no curses', () => {
  const holeResults: HoleResultState[] = [
    createHoleResult(1, {
      p1: 3,
      p2: null,
      p3: 5,
    }),
  ]

  const holePowerUps = assignPowerUpsForHoleWithCurses(
    PLAYERS,
    2,
    holeResults,
    1,
    [createTestPowerUp('good', 'Good')],
    [createTestCurse('curse', 'Curse')],
  )

  PLAYERS.forEach((player) => {
    assert.equal(holePowerUps.assignedPowerUpIdByPlayerId[player.id], 'good')
    assert.equal(holePowerUps.assignedCurseIdByPlayerId[player.id], null)
  })
})

test('power ups mode: curse assignment uses cumulative leaders, not most recent hole winner', () => {
  const holeResults: HoleResultState[] = [
    createHoleResult(1, {
      p1: 3,
      p2: 6,
      p3: 7,
    }),
    createHoleResult(2, {
      p1: 6,
      p2: 4,
      p3: 5,
    }),
  ]

  const holePowerUps = assignPowerUpsForHoleWithCurses(
    PLAYERS,
    3,
    holeResults,
    2,
    [createTestPowerUp('good', 'Good')],
    [createTestCurse('curse', 'Curse')],
  )

  assert.equal(holePowerUps.assignedCurseIdByPlayerId.p1, 'curse')
  assert.equal(holePowerUps.assignedCurseIdByPlayerId.p2, null)
  assert.equal(holePowerUps.assignedCurseIdByPlayerId.p3, null)

  assert.equal(holePowerUps.assignedPowerUpIdByPlayerId.p1, null)
  assert.equal(holePowerUps.assignedPowerUpIdByPlayerId.p2, 'good')
  assert.equal(holePowerUps.assignedPowerUpIdByPlayerId.p3, 'good')
})

test('getAssignedPowerUp resolves assigned positive power-up ids', () => {
  const holePowerUpState = createEmptyHolePowerUpState(PLAYERS, 2)
  holePowerUpState.assignedPowerUpIdByPlayerId.p1 = 'pinball-wizard'

  const assignedPowerUp = getAssignedPowerUp(holePowerUpState, 'p1')

  assert.equal(assignedPowerUp?.id, 'pinball-wizard')
})

test('getAssignedCurse resolves assigned curse ids', () => {
  const holePowerUpState = createEmptyHolePowerUpState(PLAYERS, 2)
  const curseId = CURSE_CARDS[0]?.id

  assert.ok(curseId)

  holePowerUpState.assignedCurseIdByPlayerId.p1 = curseId
  const assignedCurse = getAssignedCurse(holePowerUpState, 'p1')

  assert.equal(assignedCurse?.id, curseId)
})
