/// <reference types="node" />

import assert from 'node:assert/strict'
import test from 'node:test'
import type { PersonalCard } from '../types/cards.ts'
import type { HoleCardsState, HoleDefinition, HoleResultState, Player } from '../types/game.ts'
import {
  calculatePlayerHolePointBreakdown,
  calculateRoundTotalsByPlayerId,
  clearRoundTotalsCache,
} from './scoring.ts'

function createPersonalCard(input: {
  id: string
  code: string
  name: string
  points: number
  difficulty?: PersonalCard['difficulty']
}): PersonalCard {
  return {
    id: input.id,
    code: input.code,
    name: input.name,
    description: input.name,
    cardType: 'common',
    packId: 'classic',
    points: input.points,
    eligiblePars: [3, 4, 5],
    requiredTags: [],
    excludedTags: [],
    difficulty: input.difficulty ?? 'medium',
    isPublic: false,
    rulesText: input.name,
  }
}

test('calculateRoundTotalsByPlayerId applies featured, momentum, and public deltas', () => {
  const players: Player[] = [
    { id: 'p1', name: 'Alex', expectedScore18: 90 },
    { id: 'p2', name: 'Blair', expectedScore18: 90 },
  ]
  const holes: HoleDefinition[] = [
    {
      holeNumber: 1,
      par: 4,
      tags: [],
      featuredHoleType: 'jackpot',
    },
    {
      holeNumber: 2,
      par: 4,
      tags: [],
      featuredHoleType: null,
    },
  ]
  const cardA1 = createPersonalCard({ id: 'card-a1', code: 'A1', name: 'A1', points: 2 })
  const cardA2 = createPersonalCard({ id: 'card-a2', code: 'A2', name: 'A2', points: 2 })
  const holeCards: HoleCardsState[] = [
    {
      holeNumber: 1,
      dealtPersonalCardsByPlayerId: { p1: [cardA1], p2: [] },
      selectedCardIdByPlayerId: { p1: cardA1.id, p2: null },
      personalCardOfferByPlayerId: {
        p1: { safeCardId: cardA1.id, hardCardId: null },
        p2: { safeCardId: null, hardCardId: null },
      },
      publicCards: [],
    },
    {
      holeNumber: 2,
      dealtPersonalCardsByPlayerId: { p1: [cardA2], p2: [] },
      selectedCardIdByPlayerId: { p1: cardA2.id, p2: null },
      personalCardOfferByPlayerId: {
        p1: { safeCardId: cardA2.id, hardCardId: null },
        p2: { safeCardId: null, hardCardId: null },
      },
      publicCards: [],
    },
  ]
  const holeResults: HoleResultState[] = [
    {
      holeNumber: 1,
      strokesByPlayerId: { p1: 4, p2: 6 },
      missionStatusByPlayerId: { p1: 'success', p2: 'pending' },
      publicPointDeltaByPlayerId: { p1: 1, p2: -1 },
      publicCardResolutionsByCardId: {},
      publicCardResolutionNotes: '',
    },
    {
      holeNumber: 2,
      strokesByPlayerId: { p1: 5, p2: 5 },
      missionStatusByPlayerId: { p1: 'success', p2: 'pending' },
      publicPointDeltaByPlayerId: { p1: 0, p2: 0 },
      publicCardResolutionsByCardId: {},
      publicCardResolutionNotes: '',
    },
  ]

  const totals = calculateRoundTotalsByPlayerId(
    players,
    holes,
    holeCards,
    holeResults,
    true,
  )
  const holeTwoBreakdown = calculatePlayerHolePointBreakdown(
    'p1',
    1,
    players,
    holes,
    holeCards,
    holeResults,
    true,
  )

  assert.deepEqual(totals.p1, {
    realScore: 9,
    gamePoints: 7,
    adjustedScore: 2,
  })
  assert.deepEqual(totals.p2, {
    realScore: 11,
    gamePoints: -1,
    adjustedScore: 12,
  })
  assert.equal(holeTwoBreakdown.momentumBonus, 1)
  assert.equal(holeTwoBreakdown.streakBefore, 2)
  assert.equal(holeTwoBreakdown.featuredBonusPoints, 0)
})

test('calculateRoundTotalsByPlayerId reuses cached totals for identical references', () => {
  clearRoundTotalsCache()

  const players: Player[] = [{ id: 'p1', name: 'Alex', expectedScore18: 90 }]
  const holes: HoleDefinition[] = [
    {
      holeNumber: 1,
      par: 4,
      tags: [],
      featuredHoleType: null,
    },
  ]
  const card = createPersonalCard({ id: 'card-cache', code: 'CC', name: 'Cache Card', points: 1 })
  const holeCards: HoleCardsState[] = [
    {
      holeNumber: 1,
      dealtPersonalCardsByPlayerId: { p1: [card] },
      selectedCardIdByPlayerId: { p1: card.id },
      personalCardOfferByPlayerId: { p1: { safeCardId: card.id, hardCardId: null } },
      publicCards: [],
    },
  ]
  const holeResults: HoleResultState[] = [
    {
      holeNumber: 1,
      strokesByPlayerId: { p1: 4 },
      missionStatusByPlayerId: { p1: 'success' },
      publicPointDeltaByPlayerId: { p1: 0 },
      publicCardResolutionsByCardId: {},
      publicCardResolutionNotes: '',
    },
  ]

  const first = calculateRoundTotalsByPlayerId(players, holes, holeCards, holeResults, true)
  const second = calculateRoundTotalsByPlayerId(players, holes, holeCards, holeResults, true)

  assert.strictEqual(first, second)
})
