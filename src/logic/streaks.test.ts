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
