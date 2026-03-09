/// <reference types="node" />

import assert from 'node:assert/strict'
import test from 'node:test'
import type { PersonalCard } from '../types/cards.ts'
import type { HoleCardsState, HoleDefinition, HoleResultState, Player } from '../types/game.ts'
import { buildHolePointBreakdownsByPlayerId, clearHolePointBreakdownCache } from './streaks.ts'

function createPersonalCard(input: {
  id: string
  code: string
  name: string
  points: number
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
    difficulty: 'medium',
    isPublic: false,
    rulesText: input.name,
  }
}

test('buildHolePointBreakdownsByPlayerId reuses cache for identical input references', () => {
  clearHolePointBreakdownCache()

  const players: Player[] = [{ id: 'p1', name: 'Alex', expectedScore18: 90 }]
  const holes: HoleDefinition[] = [
    {
      holeNumber: 1,
      par: 4,
      tags: [],
      featuredHoleType: null,
    },
  ]
  const card = createPersonalCard({ id: 'card-1', code: 'C1', name: 'Card 1', points: 2 })
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

  const first = buildHolePointBreakdownsByPlayerId(players, holes, holeCards, holeResults, true)
  const second = buildHolePointBreakdownsByPlayerId(players, holes, holeCards, holeResults, true)

  assert.strictEqual(first, second)

  const changedHoleResults: HoleResultState[] = [
    {
      ...holeResults[0],
      publicPointDeltaByPlayerId: { p1: 1 },
    },
  ]
  const third = buildHolePointBreakdownsByPlayerId(
    players,
    holes,
    holeCards,
    changedHoleResults,
    true,
  )

  assert.notStrictEqual(second, third)
})

test('buildHolePointBreakdownsByPlayerId applies momentum streaks and resets on failure', () => {
  clearHolePointBreakdownCache()

  const players: Player[] = [
    { id: 'p1', name: 'Alex', expectedScore18: 90 },
    { id: 'p2', name: 'Blair', expectedScore18: 90 },
  ]
  const holes: HoleDefinition[] = [
    {
      holeNumber: 1,
      par: 4,
      tags: [],
      featuredHoleType: null,
    },
    {
      holeNumber: 2,
      par: 4,
      tags: [],
      featuredHoleType: null,
    },
  ]
  const holeOneCard = createPersonalCard({ id: 'card-1', code: 'C1', name: 'Card 1', points: 2 })
  const holeTwoCard = createPersonalCard({ id: 'card-2', code: 'C2', name: 'Card 2', points: 2 })
  const holeCards: HoleCardsState[] = [
    {
      holeNumber: 1,
      dealtPersonalCardsByPlayerId: { p1: [holeOneCard], p2: [] },
      selectedCardIdByPlayerId: { p1: holeOneCard.id, p2: null },
      personalCardOfferByPlayerId: {
        p1: { safeCardId: holeOneCard.id, hardCardId: null },
        p2: { safeCardId: null, hardCardId: null },
      },
      publicCards: [],
    },
    {
      holeNumber: 2,
      dealtPersonalCardsByPlayerId: { p1: [holeTwoCard], p2: [] },
      selectedCardIdByPlayerId: { p1: holeTwoCard.id, p2: null },
      personalCardOfferByPlayerId: {
        p1: { safeCardId: holeTwoCard.id, hardCardId: null },
        p2: { safeCardId: null, hardCardId: null },
      },
      publicCards: [],
    },
  ]
  const holeResults: HoleResultState[] = [
    {
      holeNumber: 1,
      strokesByPlayerId: { p1: 4, p2: 5 },
      missionStatusByPlayerId: { p1: 'success', p2: 'pending' },
      publicPointDeltaByPlayerId: { p1: 0, p2: 0 },
      publicCardResolutionsByCardId: {},
      publicCardResolutionNotes: '',
    },
    {
      holeNumber: 2,
      strokesByPlayerId: { p1: 5, p2: 5 },
      missionStatusByPlayerId: { p1: 'failed', p2: 'pending' },
      publicPointDeltaByPlayerId: { p1: 0, p2: 0 },
      publicCardResolutionsByCardId: {},
      publicCardResolutionNotes: '',
    },
  ]

  const breakdowns = buildHolePointBreakdownsByPlayerId(
    players,
    holes,
    holeCards,
    holeResults,
    true,
  )
  const holeOne = breakdowns.p1[0]
  const holeTwo = breakdowns.p1[1]

  assert.equal(holeOne.streakBefore, 0)
  assert.equal(holeOne.streakAfter, 2)
  assert.equal(holeOne.shieldApplied, true)
  assert.equal(holeTwo.streakBefore, 2)
  assert.equal(holeTwo.streakAfter, 0)
})

test('buildHolePointBreakdownsByPlayerId enforces stacked bonus caps and preserves arithmetic invariants', () => {
  clearHolePointBreakdownCache()

  const players: Player[] = [{ id: 'p1', name: 'Alex', expectedScore18: 90 }]
  const holes: HoleDefinition[] = [
    {
      holeNumber: 1,
      par: 4,
      tags: [],
      featuredHoleType: 'double_points',
    },
  ]
  const highValueCard = createPersonalCard({ id: 'cap-card', code: 'CAP', name: 'Cap Card', points: 5 })
  const holeCards: HoleCardsState[] = [
    {
      holeNumber: 1,
      dealtPersonalCardsByPlayerId: { p1: [highValueCard] },
      selectedCardIdByPlayerId: { p1: highValueCard.id },
      personalCardOfferByPlayerId: { p1: { safeCardId: highValueCard.id, hardCardId: null } },
      publicCards: [],
    },
  ]
  const holeResults: HoleResultState[] = [
    {
      holeNumber: 1,
      strokesByPlayerId: { p1: 4 },
      missionStatusByPlayerId: { p1: 'success' },
      publicPointDeltaByPlayerId: { p1: 10 },
      publicCardResolutionsByCardId: {},
      publicCardResolutionNotes: '',
    },
  ]

  const breakdowns = buildHolePointBreakdownsByPlayerId(
    players,
    holes,
    holeCards,
    holeResults,
    true,
  )
  const holeOne = breakdowns.p1[0]
  const recomposedTotal =
    holeOne.baseMissionPoints +
    holeOne.featuredBonusPoints +
    holeOne.momentumBonus +
    holeOne.publicDelta +
    holeOne.rivalryBonus +
    holeOne.balanceCapAdjustment

  assert.equal(holeOne.total, recomposedTotal)
  assert.equal(holeOne.total, 10)
  assert.equal(holeOne.balanceCapAdjustment < 0, true)
})
