import type {
  PublicCard,
  PublicCardInteractionDefinition,
  PublicInteractionEffectOption,
  PublicInteractionMode,
} from '../types/cards.ts'

const VOTE_TARGET_CARD_CODES = new Set([
  'CHA-002',
  'CHA-003',
  'PRP-002',
  'PRP-003',
  'PRP-004',
  'PRP-005',
  'PRP-013',
  'PRP-017',
  'PRP-027',
  'PRP-036',
])

const LEADER_TARGET_CARD_CODES = new Set(['CHA-005', 'CHA-037'])

const CUSTOM_INTERACTIONS_BY_CODE: Record<string, PublicCardInteractionDefinition> = {
  'CHA-001': {
    mode: 'choose_one_of_two_effects',
    effectOptions: [
      {
        id: 'score-doubler-cancel',
        label: 'Cancel target bonus (0)',
        pointsDelta: 0,
        targetScope: 'target',
      },
      {
        id: 'score-doubler-negative-double',
        label: 'Double negative on target (-2)',
        pointsDelta: -2,
        targetScope: 'target',
      },
    ],
  },
}

function getDefaultEffectOptions(points: number): [PublicInteractionEffectOption, PublicInteractionEffectOption] {
  const absolutePoints = Math.max(1, Math.abs(points))

  return [
    {
      id: 'effect-positive',
      label: `+${absolutePoints} to selected players`,
      pointsDelta: absolutePoints,
      targetScope: 'affected',
    },
    {
      id: 'effect-negative',
      label: `-${absolutePoints} to selected players`,
      pointsDelta: -absolutePoints,
      targetScope: 'affected',
    },
  ]
}

function normalizeInteractionDefinition(
  definition: PublicCardInteractionDefinition,
  points: number,
): PublicCardInteractionDefinition {
  if (definition.mode !== 'choose_one_of_two_effects') {
    return {
      mode: definition.mode,
    }
  }

  return {
    mode: definition.mode,
    effectOptions: definition.effectOptions ?? getDefaultEffectOptions(points),
  }
}

function getFallbackMode(card: Pick<PublicCard, 'code' | 'cardType' | 'points'>): PublicInteractionMode {
  if (VOTE_TARGET_CARD_CODES.has(card.code)) {
    return 'vote_target_player'
  }

  if (LEADER_TARGET_CARD_CODES.has(card.code)) {
    return 'leader_selects_target'
  }

  if (card.points === 0) {
    return 'yes_no_triggered'
  }

  return 'pick_affected_players'
}

export function buildExplicitPublicInteraction(
  card: Pick<PublicCard, 'code' | 'cardType' | 'points' | 'interaction'>,
): PublicCardInteractionDefinition {
  const customInteraction = CUSTOM_INTERACTIONS_BY_CODE[card.code]
  if (customInteraction) {
    return normalizeInteractionDefinition(customInteraction, card.points)
  }

  if (card.interaction) {
    return normalizeInteractionDefinition(card.interaction, card.points)
  }

  return normalizeInteractionDefinition(
    {
      mode: getFallbackMode(card),
    },
    card.points,
  )
}
