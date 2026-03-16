/// <reference types="node" />

import assert from 'node:assert/strict'
import test from 'node:test'
import { filterPersonalCardsForHole, filterPublicCardsForHole } from './filterCards.ts'
import type { PersonalCard, PublicCard } from '../types/cards.ts'

function createPersonalCard(input: {
  id: string
  requiredTags?: PersonalCard['requiredTags']
  excludedTags?: PersonalCard['excludedTags']
  eligiblePars?: number[]
}): PersonalCard {
  return {
    id: input.id,
    code: input.id,
    name: input.id,
    description: input.id,
    cardType: 'common',
    packId: 'classic',
    points: 1,
    eligiblePars: input.eligiblePars ?? [4],
    requiredTags: input.requiredTags ?? [],
    excludedTags: input.excludedTags ?? [],
    difficulty: 'easy',
    isPublic: false,
    rulesText: input.id,
  }
}

function createPublicCard(input: {
  id: string
  requiredTags?: PublicCard['requiredTags']
  excludedTags?: PublicCard['excludedTags']
  eligiblePars?: number[]
}): PublicCard {
  return {
    id: input.id,
    code: input.id,
    name: input.id,
    description: input.id,
    cardType: 'chaos',
    packId: 'chaos',
    points: 1,
    eligiblePars: input.eligiblePars ?? [4],
    requiredTags: input.requiredTags ?? [],
    excludedTags: input.excludedTags ?? [],
    difficulty: 'neutral',
    isPublic: true,
    rulesText: input.id,
  }
}

test('filterPersonalCardsForHole keeps both tagged and non-tagged eligible cards', () => {
  const cards = [
    createPersonalCard({ id: 'generic' }),
    createPersonalCard({ id: 'water', requiredTags: ['water'] }),
  ]

  const filtered = filterPersonalCardsForHole(cards, 4, ['water'])
  assert.equal(filtered.length, 2)
  assert.deepEqual(
    filtered.map((card) => card.id).sort(),
    ['generic', 'water'],
  )
})

test('filterPublicCardsForHole keeps both tagged and non-tagged eligible cards', () => {
  const cards = [
    createPublicCard({ id: 'generic' }),
    createPublicCard({ id: 'bunkers', requiredTags: ['bunkers'] }),
  ]

  const filtered = filterPublicCardsForHole(cards, 4, ['bunkers'])
  assert.equal(filtered.length, 2)
  assert.deepEqual(
    filtered.map((card) => card.id).sort(),
    ['bunkers', 'generic'],
  )
})

test('tag filters still enforce required and excluded rules', () => {
  const cards = [
    createPersonalCard({ id: 'water-only', requiredTags: ['water'] }),
    createPersonalCard({ id: 'exclude-water', excludedTags: ['water'] }),
    createPersonalCard({ id: 'generic' }),
  ]

  const filtered = filterPersonalCardsForHole(cards, 4, ['water'])
  assert.deepEqual(
    filtered.map((card) => card.id).sort(),
    ['generic', 'water-only'],
  )
})
