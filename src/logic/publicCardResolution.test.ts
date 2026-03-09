/// <reference types="node" />

import assert from 'node:assert/strict'
import test from 'node:test'
import type { PublicCard } from '../types/cards.ts'
import type { Player, PublicCardResolutionState } from '../types/game.ts'
import { normalizePublicCardResolutions, resolvePublicCardPointDeltas } from './publicCardResolution.ts'

function createPublicCard(input: {
  id: string
  code: string
  name: string
  points: number
  mode?: NonNullable<PublicCard['interaction']>['mode']
  effectOptions?: NonNullable<PublicCard['interaction']>['effectOptions']
}): PublicCard {
  return {
    id: input.id,
    code: input.code,
    name: input.name,
    description: input.name,
    cardType: 'chaos',
    packId: 'chaos',
    points: input.points,
    eligiblePars: [3, 4, 5],
    requiredTags: [],
    excludedTags: [],
    difficulty: 'neutral',
    isPublic: true,
    rulesText: input.name,
    interaction: input.mode
      ? {
          mode: input.mode,
          effectOptions: input.effectOptions,
        }
      : undefined,
  }
}

test('normalizePublicCardResolutions prefers interaction mode over stale saved mode', () => {
  const card = createPublicCard({
    id: 'pub-1',
    code: 'PUB-1',
    name: 'Vote Card',
    points: 2,
    mode: 'vote_target_player',
  })
  const staleResolution: PublicCardResolutionState = {
    cardId: card.id,
    mode: 'yes_no_triggered',
    triggered: true,
    winningPlayerId: null,
    affectedPlayerIds: [],
    targetPlayerIdByVoterId: {},
    selectedEffectOptionId: null,
  }

  const normalized = normalizePublicCardResolutions([card], { [card.id]: staleResolution })

  assert.equal(normalized[card.id].mode, 'vote_target_player')
})

test('resolvePublicCardPointDeltas handles vote and selected effect targeting', () => {
  const players: Player[] = [
    { id: 'p1', name: 'Alex', expectedScore18: 90 },
    { id: 'p2', name: 'Blair', expectedScore18: 90 },
    { id: 'p3', name: 'Casey', expectedScore18: 90 },
  ]
  const voteCard = createPublicCard({
    id: 'pub-vote',
    code: 'PUB-V',
    name: 'Vote Card',
    points: 2,
    mode: 'vote_target_player',
  })
  const chooseCard = createPublicCard({
    id: 'pub-choose',
    code: 'PUB-C',
    name: 'Choose Card',
    points: 0,
    mode: 'choose_one_of_two_effects',
    effectOptions: [
      {
        id: 'target-plus',
        label: '+3 target',
        pointsDelta: 3,
        targetScope: 'target',
      },
      {
        id: 'all-minus',
        label: '-1 all',
        pointsDelta: -1,
        targetScope: 'all',
      },
    ],
  })
  const resolutions: Record<string, PublicCardResolutionState> = {
    [voteCard.id]: {
      cardId: voteCard.id,
      mode: 'vote_target_player',
      triggered: true,
      winningPlayerId: null,
      affectedPlayerIds: [],
      targetPlayerIdByVoterId: {
        p1: 'p2',
        p2: 'p2',
        p3: 'p1',
      },
      selectedEffectOptionId: null,
    },
    [chooseCard.id]: {
      cardId: chooseCard.id,
      mode: 'choose_one_of_two_effects',
      triggered: true,
      winningPlayerId: 'p3',
      affectedPlayerIds: [],
      targetPlayerIdByVoterId: {},
      selectedEffectOptionId: 'target-plus',
    },
  }

  const deltas = resolvePublicCardPointDeltas(players, [voteCard, chooseCard], resolutions)

  assert.deepEqual(deltas, {
    p1: 0,
    p2: 2,
    p3: 3,
  })
})
