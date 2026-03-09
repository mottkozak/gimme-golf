/// <reference types="node" />

import assert from 'node:assert/strict'
import test from 'node:test'
import type { PublicCard } from '../types/cards.ts'
import type { Player, PublicCardResolutionState } from '../types/game.ts'
import {
  getDefaultPublicResolutionMode,
  getPublicResolutionInputRequirements,
  isPublicCardResolutionComplete,
  normalizePublicCardResolutions,
  resolvePublicCardPointDeltas,
} from './publicCardResolution.ts'

function createPublicCard(input: {
  id: string
  code: string
  name: string
  points: number
  cardType?: PublicCard['cardType']
  description?: string
  rulesText?: string
  mode?: NonNullable<PublicCard['interaction']>['mode']
  effectOptions?: NonNullable<PublicCard['interaction']>['effectOptions']
}): PublicCard {
  return {
    id: input.id,
    code: input.code,
    name: input.name,
    description: input.description ?? input.name,
    cardType: input.cardType ?? 'chaos',
    packId: input.cardType === 'prop' ? 'props' : 'chaos',
    points: input.points,
    eligiblePars: [3, 4, 5],
    requiredTags: [],
    excludedTags: [],
    difficulty: 'neutral',
    isPublic: true,
    rulesText: input.rulesText ?? input.name,
    interaction: input.mode
      ? {
          mode: input.mode,
          effectOptions: input.effectOptions,
        }
      : undefined,
  }
}

test('getDefaultPublicResolutionMode uses explicit metadata fallback map for player-pick cards', () => {
  const card = createPublicCard({
    id: 'prop-pick',
    code: 'PRP-013',
    name: 'Birdie Player Pick',
    cardType: 'prop',
    points: 3,
  })

  assert.equal(getDefaultPublicResolutionMode(card), 'vote_target_player')
})

test('getDefaultPublicResolutionMode defaults zero-point chaos cards to trigger-only', () => {
  const card = createPublicCard({
    id: 'chaos-rules-only',
    code: 'CHA-RULE',
    name: 'Lone Wolf',
    cardType: 'chaos',
    points: 0,
  })

  assert.equal(getDefaultPublicResolutionMode(card), 'yes_no_triggered')
})

test('getPublicResolutionInputRequirements only asks for required fields', () => {
  const chooseCard = createPublicCard({
    id: 'choose-card',
    code: 'CHOOSE',
    name: 'Choose Card',
    points: 0,
    cardType: 'chaos',
    mode: 'choose_one_of_two_effects',
    effectOptions: [
      {
        id: 'all-plus',
        label: '+1 all',
        pointsDelta: 1,
        targetScope: 'all',
      },
      {
        id: 'target-minus',
        label: '-2 target',
        pointsDelta: -2,
        targetScope: 'target',
      },
    ],
  })
  const resolution: PublicCardResolutionState = {
    cardId: chooseCard.id,
    mode: 'choose_one_of_two_effects',
    triggered: true,
    winningPlayerId: null,
    affectedPlayerIds: [],
    targetPlayerIdByVoterId: {},
    selectedEffectOptionId: 'target-minus',
  }

  const requirements = getPublicResolutionInputRequirements(chooseCard, resolution)

  assert.deepEqual(requirements, {
    requiresVoteTarget: false,
    requiresEffectChoice: true,
    requiresTargetSelection: true,
    requiresAffectedSelection: false,
  })
})

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

test('isPublicCardResolutionComplete validates completeness for every canonical mode', () => {
  const playerIds = ['p1', 'p2']

  const yesNoCard = createPublicCard({ id: 'm1', code: 'M1', name: 'YesNo', points: 1, mode: 'yes_no_triggered' })
  const yesNoResolution: PublicCardResolutionState = {
    cardId: yesNoCard.id,
    mode: 'yes_no_triggered',
    triggered: true,
    winningPlayerId: null,
    affectedPlayerIds: [],
    targetPlayerIdByVoterId: {},
    selectedEffectOptionId: null,
  }
  assert.equal(isPublicCardResolutionComplete(yesNoCard, yesNoResolution, playerIds), true)

  const voteCard = createPublicCard({ id: 'm2', code: 'M2', name: 'Vote', points: 1, mode: 'vote_target_player' })
  const voteIncomplete: PublicCardResolutionState = {
    cardId: voteCard.id,
    mode: 'vote_target_player',
    triggered: true,
    winningPlayerId: null,
    affectedPlayerIds: [],
    targetPlayerIdByVoterId: { p1: 'p2' },
    selectedEffectOptionId: null,
  }
  const voteComplete: PublicCardResolutionState = {
    ...voteIncomplete,
    targetPlayerIdByVoterId: { p1: 'p2', p2: 'p2' },
  }
  assert.equal(isPublicCardResolutionComplete(voteCard, voteIncomplete, playerIds), false)
  assert.equal(isPublicCardResolutionComplete(voteCard, voteComplete, playerIds), true)

  const leaderCard = createPublicCard({ id: 'm3', code: 'M3', name: 'Leader', points: 1, mode: 'leader_selects_target' })
  const leaderIncomplete: PublicCardResolutionState = {
    cardId: leaderCard.id,
    mode: 'leader_selects_target',
    triggered: true,
    winningPlayerId: null,
    affectedPlayerIds: [],
    targetPlayerIdByVoterId: {},
    selectedEffectOptionId: null,
  }
  const leaderComplete: PublicCardResolutionState = {
    ...leaderIncomplete,
    winningPlayerId: 'p1',
  }
  assert.equal(isPublicCardResolutionComplete(leaderCard, leaderIncomplete, playerIds), false)
  assert.equal(isPublicCardResolutionComplete(leaderCard, leaderComplete, playerIds), true)

  const affectedCard = createPublicCard({ id: 'm4', code: 'M4', name: 'Affected', points: 1, mode: 'pick_affected_players' })
  const affectedIncomplete: PublicCardResolutionState = {
    cardId: affectedCard.id,
    mode: 'pick_affected_players',
    triggered: true,
    winningPlayerId: null,
    affectedPlayerIds: [],
    targetPlayerIdByVoterId: {},
    selectedEffectOptionId: null,
  }
  const affectedComplete: PublicCardResolutionState = {
    ...affectedIncomplete,
    affectedPlayerIds: ['p2'],
  }
  assert.equal(isPublicCardResolutionComplete(affectedCard, affectedIncomplete, playerIds), false)
  assert.equal(isPublicCardResolutionComplete(affectedCard, affectedComplete, playerIds), true)

  const chooseTargetCard = createPublicCard({
    id: 'm5',
    code: 'M5',
    name: 'Choose',
    points: 0,
    mode: 'choose_one_of_two_effects',
    effectOptions: [
      {
        id: 'target-plus',
        label: '+2 target',
        pointsDelta: 2,
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
  const chooseTargetIncomplete: PublicCardResolutionState = {
    cardId: chooseTargetCard.id,
    mode: 'choose_one_of_two_effects',
    triggered: true,
    winningPlayerId: null,
    affectedPlayerIds: [],
    targetPlayerIdByVoterId: {},
    selectedEffectOptionId: 'target-plus',
  }
  const chooseTargetComplete: PublicCardResolutionState = {
    ...chooseTargetIncomplete,
    winningPlayerId: 'p1',
  }
  assert.equal(isPublicCardResolutionComplete(chooseTargetCard, chooseTargetIncomplete, playerIds), false)
  assert.equal(isPublicCardResolutionComplete(chooseTargetCard, chooseTargetComplete, playerIds), true)

  const chooseAllCard = createPublicCard({
    id: 'm6',
    code: 'M6',
    name: 'ChooseAll',
    points: 0,
    mode: 'choose_one_of_two_effects',
    effectOptions: [
      {
        id: 'all-plus',
        label: '+1 all',
        pointsDelta: 1,
        targetScope: 'all',
      },
      {
        id: 'affected-minus',
        label: '-1 affected',
        pointsDelta: -1,
        targetScope: 'affected',
      },
    ],
  })
  const chooseAllResolution: PublicCardResolutionState = {
    cardId: chooseAllCard.id,
    mode: 'choose_one_of_two_effects',
    triggered: true,
    winningPlayerId: null,
    affectedPlayerIds: [],
    targetPlayerIdByVoterId: {},
    selectedEffectOptionId: 'all-plus',
  }
  assert.equal(isPublicCardResolutionComplete(chooseAllCard, chooseAllResolution, playerIds), true)
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

test('resolvePublicCardPointDeltas enforces per-player public cap', () => {
  const players: Player[] = [
    { id: 'p1', name: 'Alex', expectedScore18: 90 },
    { id: 'p2', name: 'Blair', expectedScore18: 90 },
  ]
  const cardA = createPublicCard({
    id: 'pub-a',
    code: 'PUB-A',
    name: 'A',
    points: 3,
    mode: 'pick_affected_players',
  })
  const cardB = createPublicCard({
    id: 'pub-b',
    code: 'PUB-B',
    name: 'B',
    points: 3,
    mode: 'pick_affected_players',
  })

  const resolutions: Record<string, PublicCardResolutionState> = {
    [cardA.id]: {
      cardId: cardA.id,
      mode: 'pick_affected_players',
      triggered: true,
      winningPlayerId: null,
      affectedPlayerIds: ['p1'],
      targetPlayerIdByVoterId: {},
      selectedEffectOptionId: null,
    },
    [cardB.id]: {
      cardId: cardB.id,
      mode: 'pick_affected_players',
      triggered: true,
      winningPlayerId: null,
      affectedPlayerIds: ['p1'],
      targetPlayerIdByVoterId: {},
      selectedEffectOptionId: null,
    },
  }

  const deltas = resolvePublicCardPointDeltas(players, [cardA, cardB], resolutions)

  assert.equal(deltas.p1, 3)
  assert.equal(deltas.p2, 0)
})
