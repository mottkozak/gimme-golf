/// <reference types="node" />

import assert from 'node:assert/strict'
import test from 'node:test'
import { buildLeaderboardEntries, getAdjustedScoreLeaders, getUnifiedLeaders } from './leaderboard.ts'
import type { Player, PlayerTotals } from '../types/game.ts'

test('buildLeaderboardEntries applies adjusted -> real -> game precedence', () => {
  const players: Player[] = [
    { id: 'p1', name: 'Alex', expectedScore18: 90 },
    { id: 'p2', name: 'Casey', expectedScore18: 92 },
    { id: 'p3', name: 'Jordan', expectedScore18: 94 },
  ]
  const totalsByPlayerId: Record<string, PlayerTotals> = {
    p1: { adjustedScore: 67, realScore: 72, gamePoints: 5 },
    p2: { adjustedScore: 67, realScore: 72, gamePoints: 9 },
    p3: { adjustedScore: 67, realScore: 70, gamePoints: 1 },
  }

  const rows = buildLeaderboardEntries(players, totalsByPlayerId, 'adjustedScore')
  assert.deepEqual(
    rows.map((row) => row.playerId),
    ['p3', 'p2', 'p1'],
  )
})

test('getAdjustedScoreLeaders includes every tie on lowest adjusted', () => {
  const players: Player[] = [
    { id: 'p1', name: 'Alex', expectedScore18: 90 },
    { id: 'p2', name: 'Casey', expectedScore18: 92 },
    { id: 'p3', name: 'Jordan', expectedScore18: 94 },
  ]
  const totalsByPlayerId: Record<string, PlayerTotals> = {
    p1: { adjustedScore: 66, realScore: 71, gamePoints: 7 },
    p2: { adjustedScore: 66, realScore: 71, gamePoints: 7 },
    p3: { adjustedScore: 66, realScore: 71, gamePoints: 6 },
  }

  const rows = buildLeaderboardEntries(players, totalsByPlayerId, 'adjustedScore')
  const leaders = getAdjustedScoreLeaders(rows)
  assert.deepEqual(
    leaders.map((leader) => leader.playerId).sort(),
    ['p1', 'p2', 'p3'].sort(),
  )
})

test('getUnifiedLeaders returns only exact top precedence ties', () => {
  const players: Player[] = [
    { id: 'p1', name: 'Alex', expectedScore18: 90 },
    { id: 'p2', name: 'Casey', expectedScore18: 92 },
    { id: 'p3', name: 'Jordan', expectedScore18: 94 },
  ]
  const totalsByPlayerId: Record<string, PlayerTotals> = {
    p1: { adjustedScore: 66, realScore: 71, gamePoints: 7 },
    p2: { adjustedScore: 66, realScore: 71, gamePoints: 7 },
    p3: { adjustedScore: 66, realScore: 71, gamePoints: 6 },
  }

  const rows = buildLeaderboardEntries(players, totalsByPlayerId, 'adjustedScore')
  const leaders = getUnifiedLeaders(rows)
  assert.deepEqual(
    leaders.map((leader) => leader.playerId),
    ['p1', 'p2'],
  )
})
