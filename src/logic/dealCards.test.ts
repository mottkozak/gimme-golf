/// <reference types="node" />

import assert from 'node:assert/strict'
import test from 'node:test'
import type { PersonalCard, PublicCard } from '../types/cards.ts'
import type { HoleDefinition, Player, RoundConfig } from '../types/game.ts'
import { dealPersonalCardsForHole, dealPublicCardsForHole } from './dealCards.ts'

function createPersonalCard(input: {
  id: string
  code: string
  points: number
  difficulty?: PersonalCard['difficulty']
}): PersonalCard {
  return {
    id: input.id,
    code: input.code,
    name: input.code,
    description: input.code,
    cardType: 'common',
    packId: 'classic',
    points: input.points,
    eligiblePars: [3, 4, 5],
    requiredTags: [],
    excludedTags: [],
    difficulty: input.difficulty ?? 'medium',
    isPublic: false,
    rulesText: input.code,
  }
}

function createPublicCard(input: {
  id: string
  code: string
  cardType?: PublicCard['cardType']
  points?: number
}): PublicCard {
  return {
    id: input.id,
    code: input.code,
    name: input.code,
    description: input.code,
    cardType: input.cardType ?? 'chaos',
    packId: input.cardType === 'prop' ? 'props' : 'chaos',
    points: input.points ?? 1,
    eligiblePars: [3, 4, 5],
    requiredTags: [],
    excludedTags: [],
    difficulty: 'neutral',
    isPublic: true,
    rulesText: input.code,
  }
}

const BASE_ROUND_CONFIG: RoundConfig = {
  holeCount: 9,
  courseStyle: 'standard',
  gameMode: 'cards',
  selectedPresetId: 'custom',
  customModeName: '',
  enabledPackIds: ['classic', 'chaos'],
  featuredHoles: {
    enabled: true,
    frequency: 'normal',
    assignmentMode: 'auto',
  },
  toggles: {
    dynamicDifficulty: false,
    momentumBonuses: true,
    drawTwoPickOne: false,
    autoAssignOne: true,
    enableChaosCards: true,
    enablePropCards: false,
  },
}

test('dealPersonalCardsForHole favors fresh cards before reused cards', () => {
  const players: Player[] = [{ id: 'p1', name: 'Alex', expectedScore18: 90 }]
  const hole: HoleDefinition = {
    holeNumber: 1,
    par: 4,
    tags: [],
    featuredHoleType: null,
  }
  const usedCard = createPersonalCard({ id: 'used-personal', code: 'U1', points: 1 })
  const freshCard = createPersonalCard({ id: 'fresh-personal', code: 'F1', points: 2 })
  const deal = dealPersonalCardsForHole(
    players,
    hole,
    BASE_ROUND_CONFIG,
    [usedCard, freshCard],
    {
      usedPersonalCardIds: [usedCard.id],
      usedPublicCardIds: [],
    },
  )

  assert.equal(deal.dealtPersonalCardsByPlayerId.p1[0]?.id, freshCard.id)
  assert.equal(deal.personalCardOfferByPlayerId.p1.safeCardId, freshCard.id)
})

test('dealPublicCardsForHole avoids used public card ids when fresh options exist', () => {
  const hole: HoleDefinition = {
    holeNumber: 1,
    par: 4,
    tags: [],
    featuredHoleType: null,
  }
  const usedChaos = createPublicCard({ id: 'used-chaos', code: 'UC1' })
  const freshChaos = createPublicCard({ id: 'fresh-chaos', code: 'FC1' })
  const cards = dealPublicCardsForHole(
    hole,
    BASE_ROUND_CONFIG,
    [usedChaos, freshChaos],
    {
      usedPersonalCardIds: [],
      usedPublicCardIds: [usedChaos.id],
    },
  )

  assert.equal(cards.length, 1)
  assert.equal(cards[0]?.id, freshChaos.id)
})
