/// <reference types="node" />

import assert from 'node:assert/strict'
import test from 'node:test'
import { PUBLIC_CARDS } from '../data/cards.ts'
import type { PersonalCard, PublicCard } from '../types/cards.ts'
import type { HoleDefinition, Player, RoundConfig } from '../types/game.ts'
import {
  buildDeckMemoryFromHoleCards,
  createEmptyHoleCardsState,
  dealPersonalCardsForHole,
  dealPublicCardsForHole,
} from './dealCards.ts'

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
    catchUpMode: false,
    momentumBonuses: true,
    drawTwoPickOne: false,
    autoAssignOne: true,
    enableChaosCards: true,
    enablePropCards: false,
  },
}

const DYNAMIC_DRAW_TWO_CONFIG: RoundConfig = {
  ...BASE_ROUND_CONFIG,
  toggles: {
    ...BASE_ROUND_CONFIG.toggles,
    dynamicDifficulty: true,
    drawTwoPickOne: true,
    autoAssignOne: false,
  },
}

const CATCH_UP_DYNAMIC_DRAW_TWO_CONFIG: RoundConfig = {
  ...DYNAMIC_DRAW_TWO_CONFIG,
  toggles: {
    ...DYNAMIC_DRAW_TWO_CONFIG.toggles,
    catchUpMode: true,
  },
}

function getPointsForCardId(cards: PersonalCard[], cardId: string | null): number | null {
  if (!cardId) {
    return null
  }

  return cards.find((card) => card.id === cardId)?.points ?? null
}

function getDifficultyForCardId(
  cards: PersonalCard[],
  cardId: string | null,
): PersonalCard['difficulty'] | null {
  if (!cardId) {
    return null
  }

  return cards.find((card) => card.id === cardId)?.difficulty ?? null
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

test('dealPersonalCardsForHole honors round-level memory built from prior holes', () => {
  const players: Player[] = [{ id: 'p1', name: 'Alex', expectedScore18: 90 }]
  const hole: HoleDefinition = {
    holeNumber: 2,
    par: 4,
    tags: [],
    featuredHoleType: null,
  }
  const usedCard = createPersonalCard({ id: 'used-round-memory', code: 'RM1', points: 1 })
  const freshCard = createPersonalCard({ id: 'fresh-round-memory', code: 'RM2', points: 2 })
  const priorHoleCards = createEmptyHoleCardsState(players, 1)
  priorHoleCards.dealtPersonalCardsByPlayerId.p1 = [usedCard]

  const roundDeckMemory = buildDeckMemoryFromHoleCards([priorHoleCards])
  const deal = dealPersonalCardsForHole(
    players,
    hole,
    BASE_ROUND_CONFIG,
    [usedCard, freshCard],
    roundDeckMemory,
  )

  assert.equal(deal.dealtPersonalCardsByPlayerId.p1[0]?.id, freshCard.id)
})

test('dealPersonalCardsForHole uses weighted randomness across valid candidates', () => {
  const players: Player[] = [{ id: 'p1', name: 'Alex', expectedScore18: 90 }]
  const hole: HoleDefinition = {
    holeNumber: 3,
    par: 4,
    tags: [],
    featuredHoleType: null,
  }
  const candidateA = createPersonalCard({ id: 'weighted-a', code: 'WA', points: 1 })
  const candidateB = createPersonalCard({ id: 'weighted-b', code: 'WB', points: 1 })

  const originalRandom = Math.random

  try {
    Math.random = () => 0
    const lowRollDeal = dealPersonalCardsForHole(
      players,
      hole,
      BASE_ROUND_CONFIG,
      [candidateA, candidateB],
      {
        usedPersonalCardIds: [],
        usedPublicCardIds: [],
      },
    )

    Math.random = () => 0.999999
    const highRollDeal = dealPersonalCardsForHole(
      players,
      hole,
      BASE_ROUND_CONFIG,
      [candidateA, candidateB],
      {
        usedPersonalCardIds: [],
        usedPublicCardIds: [],
      },
    )

    assert.notEqual(
      lowRollDeal.dealtPersonalCardsByPlayerId.p1[0]?.id,
      highRollDeal.dealtPersonalCardsByPlayerId.p1[0]?.id,
    )
  } finally {
    Math.random = originalRandom
  }
})

test('PUBLIC_CARDS expose explicit interaction metadata for every public card', () => {
  assert.equal(PUBLIC_CARDS.length > 0, true)

  for (const card of PUBLIC_CARDS) {
    assert.equal(Boolean(card.interaction?.mode), true, `Missing interaction mode for ${card.code}`)
  }
})

test('dealPersonalCardsForHole applies per-player recent-window anti-repeat controls', () => {
  const players: Player[] = [{ id: 'p1', name: 'Alex', expectedScore18: 90 }]
  const hole: HoleDefinition = {
    holeNumber: 5,
    par: 4,
    tags: [],
    featuredHoleType: null,
  }
  const repeatedCard = createPersonalCard({ id: 'repeat-me', code: 'RP1', points: 1 })
  const alternateCard = createPersonalCard({ id: 'alt-card', code: 'RP2', points: 2 })
  const priorHoleCards = [
    createEmptyHoleCardsState(players, 1),
    createEmptyHoleCardsState(players, 2),
    createEmptyHoleCardsState(players, 3),
  ]

  for (const prior of priorHoleCards) {
    prior.dealtPersonalCardsByPlayerId.p1 = [repeatedCard]
  }

  const deal = dealPersonalCardsForHole(
    players,
    hole,
    BASE_ROUND_CONFIG,
    [repeatedCard, alternateCard],
    buildDeckMemoryFromHoleCards(priorHoleCards),
    priorHoleCards,
  )

  assert.equal(deal.dealtPersonalCardsByPlayerId.p1[0]?.id, alternateCard.id)
})

test('dealPublicCardsForHole prefers cards outside the recent window when deck memory is exhausted', () => {
  const hole: HoleDefinition = {
    holeNumber: 6,
    par: 4,
    tags: [],
    featuredHoleType: null,
  }
  const recentChaos = createPublicCard({ id: 'chaos-recent', code: 'CR1' })
  const olderChaos = createPublicCard({ id: 'chaos-old', code: 'CO1' })
  const priorHoleCards = [
    createEmptyHoleCardsState([{ id: 'p1', name: 'Alex', expectedScore18: 90 }], 1),
    createEmptyHoleCardsState([{ id: 'p1', name: 'Alex', expectedScore18: 90 }], 2),
    createEmptyHoleCardsState([{ id: 'p1', name: 'Alex', expectedScore18: 90 }], 3),
    createEmptyHoleCardsState([{ id: 'p1', name: 'Alex', expectedScore18: 90 }], 4),
  ]
  priorHoleCards[0].publicCards = [olderChaos]
  priorHoleCards[3].publicCards = [recentChaos]

  const originalRandom = Math.random

  try {
    Math.random = () => 0
    const dealt = dealPublicCardsForHole(
      hole,
      BASE_ROUND_CONFIG,
      [recentChaos, olderChaos],
      buildDeckMemoryFromHoleCards(priorHoleCards),
      priorHoleCards,
    )

    assert.equal(dealt[0]?.id, olderChaos.id)
  } finally {
    Math.random = originalRandom
  }
})

test('dynamic difficulty keeps advanced offer ceilings at safe +1 and hard +2', () => {
  const players: Player[] = [{ id: 'p1', name: 'Alex', expectedScore18: 80 }]
  const hole: HoleDefinition = {
    holeNumber: 1,
    par: 4,
    tags: [],
    featuredHoleType: null,
  }
  const offerDeck = [
    createPersonalCard({ id: 'a1', code: 'A1', points: 1, difficulty: 'easy' }),
    createPersonalCard({ id: 'a2', code: 'A2', points: 1, difficulty: 'medium' }),
    createPersonalCard({ id: 'a3', code: 'A3', points: 2, difficulty: 'hard' }),
    createPersonalCard({ id: 'a4', code: 'A4', points: 3, difficulty: 'hard' }),
    createPersonalCard({ id: 'a5', code: 'A5', points: 4, difficulty: 'hard' }),
  ]

  const deal = dealPersonalCardsForHole(
    players,
    hole,
    DYNAMIC_DRAW_TWO_CONFIG,
    offerDeck,
    {
      usedPersonalCardIds: [],
      usedPublicCardIds: [],
    },
  )

  const offer = deal.personalCardOfferByPlayerId.p1
  assert.equal(getPointsForCardId(offerDeck, offer.safeCardId), 1)
  assert.equal(getPointsForCardId(offerDeck, offer.hardCardId), 2)
})

test('dynamic difficulty keeps intermediate offer ceilings at safe +1 to +2 and hard +3', () => {
  const players: Player[] = [{ id: 'p1', name: 'Alex', expectedScore18: 92 }]
  const hole: HoleDefinition = {
    holeNumber: 1,
    par: 4,
    tags: [],
    featuredHoleType: null,
  }
  const offerDeck = [
    createPersonalCard({ id: 'i1', code: 'I1', points: 1, difficulty: 'easy' }),
    createPersonalCard({ id: 'i2', code: 'I2', points: 2, difficulty: 'medium' }),
    createPersonalCard({ id: 'i3', code: 'I3', points: 3, difficulty: 'hard' }),
    createPersonalCard({ id: 'i4', code: 'I4', points: 4, difficulty: 'hard' }),
    createPersonalCard({ id: 'i5', code: 'I5', points: 5, difficulty: 'hard' }),
  ]

  const deal = dealPersonalCardsForHole(
    players,
    hole,
    DYNAMIC_DRAW_TWO_CONFIG,
    offerDeck,
    {
      usedPersonalCardIds: [],
      usedPublicCardIds: [],
    },
  )

  const offer = deal.personalCardOfferByPlayerId.p1
  const safePoints = getPointsForCardId(offerDeck, offer.safeCardId)
  const hardPoints = getPointsForCardId(offerDeck, offer.hardCardId)

  assert.ok(safePoints === 1 || safePoints === 2)
  assert.equal(hardPoints, 3)
})

test('dynamic difficulty gives developing golfers higher-upside hard offers (+4 to +5)', () => {
  const players: Player[] = [{ id: 'p1', name: 'Alex', expectedScore18: 112 }]
  const hole: HoleDefinition = {
    holeNumber: 1,
    par: 4,
    tags: [],
    featuredHoleType: null,
  }
  const offerDeck = [
    createPersonalCard({ id: 'd1', code: 'D1', points: 1, difficulty: 'easy' }),
    createPersonalCard({ id: 'd2', code: 'D2', points: 2, difficulty: 'easy' }),
    createPersonalCard({ id: 'd3', code: 'D3', points: 3, difficulty: 'medium' }),
    createPersonalCard({ id: 'd4', code: 'D4', points: 4, difficulty: 'hard' }),
    createPersonalCard({ id: 'd5', code: 'D5', points: 5, difficulty: 'hard' }),
  ]

  const deal = dealPersonalCardsForHole(
    players,
    hole,
    DYNAMIC_DRAW_TWO_CONFIG,
    offerDeck,
    {
      usedPersonalCardIds: [],
      usedPublicCardIds: [],
    },
  )

  const offer = deal.personalCardOfferByPlayerId.p1
  const safePoints = getPointsForCardId(offerDeck, offer.safeCardId)
  const hardPoints = getPointsForCardId(offerDeck, offer.hardCardId)

  assert.equal(safePoints, 2)
  assert.ok(hardPoints === 4 || hardPoints === 5)
})

test('dynamic difficulty maps high-upside offers to easier cards for developing golfers', () => {
  const players: Player[] = [{ id: 'p1', name: 'Alex', expectedScore18: 115 }]
  const hole: HoleDefinition = {
    holeNumber: 1,
    par: 4,
    tags: [],
    featuredHoleType: null,
  }
  const offerDeck = [
    createPersonalCard({ id: 'dev-a', code: 'DA', points: 2, difficulty: 'easy' }),
    createPersonalCard({ id: 'dev-b', code: 'DB', points: 4, difficulty: 'easy' }),
    createPersonalCard({ id: 'dev-c', code: 'DC', points: 4, difficulty: 'hard' }),
    createPersonalCard({ id: 'dev-d', code: 'DD', points: 5, difficulty: 'easy' }),
    createPersonalCard({ id: 'dev-e', code: 'DE', points: 5, difficulty: 'hard' }),
  ]

  const originalRandom = Math.random
  try {
    Math.random = () => 0
    const deal = dealPersonalCardsForHole(
      players,
      hole,
      DYNAMIC_DRAW_TWO_CONFIG,
      offerDeck,
      {
        usedPersonalCardIds: [],
        usedPublicCardIds: [],
      },
    )
    const offer = deal.personalCardOfferByPlayerId.p1
    const hardPoints = getPointsForCardId(offerDeck, offer.hardCardId)
    assert.ok(hardPoints === 4 || hardPoints === 5)
    assert.equal(getDifficultyForCardId(offerDeck, offer.hardCardId), 'easy')
  } finally {
    Math.random = originalRandom
  }
})

test('dynamic difficulty keeps lower-point hard offers demanding for advanced golfers', () => {
  const players: Player[] = [{ id: 'p1', name: 'Alex', expectedScore18: 78 }]
  const hole: HoleDefinition = {
    holeNumber: 1,
    par: 4,
    tags: [],
    featuredHoleType: null,
  }
  const offerDeck = [
    createPersonalCard({ id: 'adv-a', code: 'AA', points: 1, difficulty: 'easy' }),
    createPersonalCard({ id: 'adv-b', code: 'AB', points: 2, difficulty: 'easy' }),
    createPersonalCard({ id: 'adv-c', code: 'AC', points: 2, difficulty: 'hard' }),
    createPersonalCard({ id: 'adv-d', code: 'AD', points: 3, difficulty: 'hard' }),
  ]

  const originalRandom = Math.random
  try {
    Math.random = () => 0
    const deal = dealPersonalCardsForHole(
      players,
      hole,
      DYNAMIC_DRAW_TWO_CONFIG,
      offerDeck,
      {
        usedPersonalCardIds: [],
        usedPublicCardIds: [],
      },
    )
    const offer = deal.personalCardOfferByPlayerId.p1
    assert.equal(getPointsForCardId(offerDeck, offer.hardCardId), 2)
    assert.equal(getDifficultyForCardId(offerDeck, offer.hardCardId), 'hard')
  } finally {
    Math.random = originalRandom
  }
})

test('catch-up mode boosts hard offer options for trailing players', () => {
  const players: Player[] = [{ id: 'p1', name: 'Alex', expectedScore18: 80 }]
  const hole: HoleDefinition = {
    holeNumber: 2,
    par: 4,
    tags: [],
    featuredHoleType: null,
  }
  const offerDeck = [
    createPersonalCard({ id: 'c1', code: 'C1', points: 1, difficulty: 'easy' }),
    createPersonalCard({ id: 'c2', code: 'C2', points: 2, difficulty: 'hard' }),
    createPersonalCard({ id: 'c3', code: 'C3', points: 3, difficulty: 'hard' }),
  ]

  const deal = dealPersonalCardsForHole(
    players,
    hole,
    CATCH_UP_DYNAMIC_DRAW_TWO_CONFIG,
    offerDeck,
    {
      usedPersonalCardIds: [],
      usedPublicCardIds: [],
    },
    [],
    {
      p1: { realScore: 26, gamePoints: 2, adjustedScore: 24 },
      p2: { realScore: 24, gamePoints: 3, adjustedScore: 21 },
    },
  )

  const offer = deal.personalCardOfferByPlayerId.p1
  assert.equal(getPointsForCardId(offerDeck, offer.hardCardId), 3)
})
