import type { CardPackId, CardType } from '../types/cards.ts'

export interface CardPackDefinition {
  id: CardPackId
  name: string
  shortDescription: string
  longDescription: string
  includesLabel: string
  bestForLabel: string
  isEnabledByDefault: boolean
  isPremium: boolean
  premiumTier: string | null
  category: 'core' | 'public' | 'expansion'
  displayGroup: string
  sortOrder: number
  iconKey: string | null
  badgeLabel: string | null
  includedCardTypes: CardType[]
  gameplayNotes: string[]
}

export const CARD_PACKS: CardPackDefinition[] = [
  {
    id: 'classic',
    name: 'Classic',
    shortDescription: 'Core personal missions for every round.',
    longDescription:
      'Standard challenge cards built around normal golf play. Includes Common, Skill, and Risk cards for reliable hole-by-hole missions.',
    includesLabel: 'Common, Skill, Risk personal cards',
    bestForLabel: 'Every round and all skill levels',
    isEnabledByDefault: true,
    isPremium: false,
    premiumTier: null,
    category: 'core',
    displayGroup: 'Personal Packs',
    sortOrder: 1,
    iconKey: 'golf',
    badgeLabel: null,
    includedCardTypes: ['common', 'skill', 'risk'],
    gameplayNotes: [
      'Each golfer receives personal challenge cards.',
      'Common cards are easiest, Skill and Risk cards raise reward and difficulty.',
    ],
  },
  {
    id: 'chaos',
    name: 'Chaos',
    shortDescription: 'Public modifiers that shake up the hole.',
    longDescription:
      'Hole-wide effect cards that can add bonuses, penalties, or special rules for everyone in the group.',
    includesLabel: 'Chaos public cards',
    bestForLabel: 'Groups that want more swingy holes',
    isEnabledByDefault: true,
    isPremium: false,
    premiumTier: null,
    category: 'public',
    displayGroup: 'Public Packs',
    sortOrder: 2,
    iconKey: 'chaos',
    badgeLabel: null,
    includedCardTypes: ['chaos'],
    gameplayNotes: [
      'At most one Chaos card appears per hole when enabled.',
      'Chaos effects only impact game points, never real strokes.',
    ],
  },
  {
    id: 'props',
    name: 'Props',
    shortDescription: 'Prediction cards before the hole begins.',
    longDescription:
      'Public pick-based cards where players predict what will happen on the hole, like birdies, longest drive, or trouble.',
    includesLabel: 'Prop public prediction cards',
    bestForLabel: 'Groups that enjoy quick pre-hole picks',
    isEnabledByDefault: true,
    isPremium: false,
    premiumTier: null,
    category: 'public',
    displayGroup: 'Public Packs',
    sortOrder: 3,
    iconKey: 'prop',
    badgeLabel: null,
    includedCardTypes: ['prop'],
    gameplayNotes: [
      'At most one Prop card appears per hole when enabled.',
      'Prop outcomes are manually resolved on Hole Results.',
    ],
  },
  {
    id: 'curse',
    name: 'Curse',
    shortDescription: 'Restrictions and handicaps for tougher missions.',
    longDescription:
      'Personal challenge cards that add a constraint or annoying condition, then reward you for surviving the hole anyway.',
    includesLabel: 'Curse personal challenge cards',
    bestForLabel: 'Competitive groups and difficulty spikes',
    isEnabledByDefault: true,
    isPremium: true,
    premiumTier: 'future-expansion',
    category: 'expansion',
    displayGroup: 'Expansion Packs',
    sortOrder: 4,
    iconKey: 'curse',
    badgeLabel: 'Premium-ready',
    includedCardTypes: ['curse'],
    gameplayNotes: [
      'Curse cards are personal restrictions, resolved manually.',
      'Great for increasing pressure on stronger players.',
    ],
  },
  {
    id: 'style',
    name: 'Style',
    shortDescription: 'Social and theatrical challenge cards.',
    longDescription:
      'Personal cards focused on swagger, commitment, and fun presentation during the round. Best for casual or party-style play.',
    includesLabel: 'Style personal challenge cards',
    bestForLabel: 'Casual rounds and social groups',
    isEnabledByDefault: true,
    isPremium: true,
    premiumTier: 'future-expansion',
    category: 'expansion',
    displayGroup: 'Expansion Packs',
    sortOrder: 5,
    iconKey: 'style',
    badgeLabel: 'Premium-ready',
    includedCardTypes: ['style'],
    gameplayNotes: [
      'Style cards are manual yes/no checks based on group agreement.',
      'Best for casual, social rounds.',
    ],
  },
  {
    id: 'novelty',
    name: 'Novelty',
    shortDescription: 'Unusual shot challenges and creative play.',
    longDescription:
      'Personal cards that ask you to attempt one oddball or unconventional golf action and still survive the hole.',
    includesLabel: 'Novelty personal challenge cards',
    bestForLabel: 'Creative players and casual groups',
    isEnabledByDefault: true,
    isPremium: true,
    premiumTier: 'future-expansion',
    category: 'expansion',
    displayGroup: 'Expansion Packs',
    sortOrder: 6,
    iconKey: 'novelty',
    badgeLabel: 'Premium-ready',
    includedCardTypes: ['novelty'],
    gameplayNotes: [
      'Novelty cards combine odd actions with score thresholds.',
      'Designed for humor and high-variance moments.',
    ],
  },
  {
    id: 'hybrid',
    name: 'Hybrid',
    shortDescription: 'Competitive cards tied to group performance.',
    longDescription:
      'Personal cards that depend on what other players do, like matching the leader, beating someone on the hole, or responding under pressure.',
    includesLabel: 'Hybrid personal challenge cards',
    bestForLabel: 'Competitive groups and pressure play',
    isEnabledByDefault: true,
    isPremium: true,
    premiumTier: 'future-expansion',
    category: 'expansion',
    displayGroup: 'Expansion Packs',
    sortOrder: 7,
    iconKey: 'hybrid',
    badgeLabel: 'Premium-ready',
    includedCardTypes: ['hybrid'],
    gameplayNotes: [
      'Hybrid cards increase direct rivalry between players.',
      'Most effective in groups of three or more.',
    ],
  },
]

export const CARD_PACKS_BY_ID: Record<CardPackId, CardPackDefinition> = Object.fromEntries(
  CARD_PACKS.map((pack) => [pack.id, pack]),
) as Record<CardPackId, CardPackDefinition>

export function getPackIdForCardType(cardType: CardType): CardPackId {
  switch (cardType) {
    case 'common':
    case 'skill':
    case 'risk':
      return 'classic'
    case 'chaos':
      return 'chaos'
    case 'prop':
      return 'props'
    case 'curse':
      return 'curse'
    case 'style':
      return 'style'
    case 'novelty':
      return 'novelty'
    case 'hybrid':
      return 'hybrid'
    default:
      return 'classic'
  }
}

export function getDefaultEnabledPackIds(): CardPackId[] {
  return CARD_PACKS
    .filter((pack) => pack.isEnabledByDefault)
    .sort((packA, packB) => packA.sortOrder - packB.sortOrder)
    .map((pack) => pack.id)
}

export function normalizeEnabledPackIds(candidatePackIds: readonly string[] | undefined): CardPackId[] {
  if (!candidatePackIds || candidatePackIds.length === 0) {
    return getDefaultEnabledPackIds()
  }

  const validPackIds = new Set(CARD_PACKS.map((pack) => pack.id))
  const nextPackIds = Array.from(new Set(candidatePackIds)).filter((packId): packId is CardPackId =>
    validPackIds.has(packId as CardPackId),
  )

  if (nextPackIds.length === 0) {
    return getDefaultEnabledPackIds()
  }

  return nextPackIds.sort(
    (packA, packB) => CARD_PACKS_BY_ID[packA].sortOrder - CARD_PACKS_BY_ID[packB].sortOrder,
  )
}
