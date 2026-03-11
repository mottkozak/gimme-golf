import type { CardPackId, CardType } from '../types/cards.ts'

export type CardPackDisplayGroupId = 'personal' | 'public' | 'expansion'
export type CardPackReleaseStage = 'active' | 'planned'
export type CardPackVisibility = 'visible' | 'hidden'

export interface CardPackDisplayGroupDefinition {
  id: CardPackDisplayGroupId
  label: string
  helperText: string
  sortOrder: number
}

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
  displayGroupId: CardPackDisplayGroupId
  displayGroup: string
  sortOrder: number
  iconKey: string | null
  badgeLabel: string | null
  includedCardTypes: CardType[]
  gameplayNotes: string[]
  releaseStage: CardPackReleaseStage
  setupVisibility: CardPackVisibility
  featureVisibility: CardPackVisibility
  availabilityLabel: string
}

export interface CardPackSetupSection {
  id: CardPackDisplayGroupId
  label: string
  helperText: string
  packs: CardPackDefinition[]
}

export const CARD_PACK_DISPLAY_GROUPS: CardPackDisplayGroupDefinition[] = [
  {
    id: 'personal',
    label: 'Personal Packs',
    helperText: 'One mission lane per golfer each hole.',
    sortOrder: 1,
  },
  {
    id: 'public',
    label: 'Public Packs',
    helperText: 'One group-wide public card lane per hole.',
    sortOrder: 2,
  },
  {
    id: 'expansion',
    label: 'Expansion Packs',
    helperText: 'Optional variants for returning groups.',
    sortOrder: 3,
  },
]

export const CARD_PACK_DISPLAY_GROUPS_BY_ID: Record<CardPackDisplayGroupId, CardPackDisplayGroupDefinition> =
  Object.fromEntries(CARD_PACK_DISPLAY_GROUPS.map((group) => [group.id, group])) as Record<
    CardPackDisplayGroupId,
    CardPackDisplayGroupDefinition
  >

export const CARD_PACK_CATALOG: CardPackDefinition[] = [
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
    displayGroupId: 'personal',
    displayGroup: 'Personal Packs',
    sortOrder: 1,
    iconKey: 'golf',
    badgeLabel: null,
    includedCardTypes: ['common', 'skill', 'risk'],
    gameplayNotes: [
      'Each golfer receives personal challenge cards.',
      'Common cards are easiest, Skill and Risk cards raise reward and difficulty.',
    ],
    releaseStage: 'active',
    setupVisibility: 'visible',
    featureVisibility: 'visible',
    availabilityLabel: 'Available now',
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
    displayGroupId: 'public',
    displayGroup: 'Public Packs',
    sortOrder: 2,
    iconKey: 'chaos',
    badgeLabel: null,
    includedCardTypes: ['chaos'],
    gameplayNotes: [
      'At most one Chaos card appears per hole when enabled.',
      'Chaos effects only impact game points, never real strokes.',
    ],
    releaseStage: 'active',
    setupVisibility: 'visible',
    featureVisibility: 'visible',
    availabilityLabel: 'Available now',
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
    displayGroupId: 'public',
    displayGroup: 'Public Packs',
    sortOrder: 3,
    iconKey: 'prop',
    badgeLabel: null,
    includedCardTypes: ['prop'],
    gameplayNotes: [
      'At most one Prop card appears per hole when enabled.',
      'Prop outcomes are manually resolved on Hole Results.',
    ],
    releaseStage: 'active',
    setupVisibility: 'visible',
    featureVisibility: 'visible',
    availabilityLabel: 'Available now',
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
    displayGroupId: 'expansion',
    displayGroup: 'Expansion Packs',
    sortOrder: 6,
    iconKey: 'novelty',
    badgeLabel: 'Premium-ready',
    includedCardTypes: ['novelty'],
    gameplayNotes: [
      'Novelty cards combine odd actions with score thresholds.',
      'Designed for humor and high-variance moments.',
    ],
    releaseStage: 'active',
    setupVisibility: 'visible',
    featureVisibility: 'visible',
    availabilityLabel: 'Available now',
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
    displayGroupId: 'expansion',
    displayGroup: 'Expansion Packs',
    sortOrder: 7,
    iconKey: 'hybrid',
    badgeLabel: 'Premium-ready',
    includedCardTypes: ['hybrid'],
    gameplayNotes: [
      'Hybrid cards increase direct rivalry between players.',
      'Most effective in groups of three or more.',
    ],
    releaseStage: 'active',
    setupVisibility: 'visible',
    featureVisibility: 'visible',
    availabilityLabel: 'Available now',
  },
  {
    id: 'curse',
    name: 'Curses',
    shortDescription: 'Reserved for future expansion release.',
    longDescription:
      'Curses remain cataloged for compatibility and future release planning. This pack is intentionally hidden from setup.',
    includesLabel: 'Curse personal challenge cards',
    bestForLabel: 'Reserved for future releases',
    isEnabledByDefault: false,
    isPremium: true,
    premiumTier: 'future-expansion',
    category: 'expansion',
    displayGroupId: 'expansion',
    displayGroup: 'Expansion Packs',
    sortOrder: 90,
    iconKey: null,
    badgeLabel: null,
    includedCardTypes: ['curse'],
    gameplayNotes: [],
    releaseStage: 'planned',
    setupVisibility: 'hidden',
    featureVisibility: 'hidden',
    availabilityLabel: 'Not released',
  },
  {
    id: 'style',
    name: 'Style',
    shortDescription: 'Reserved for future expansion release.',
    longDescription:
      'Style cards remain cataloged for compatibility and future release planning. This pack is intentionally hidden from setup.',
    includesLabel: 'Style personal challenge cards',
    bestForLabel: 'Reserved for future releases',
    isEnabledByDefault: false,
    isPremium: true,
    premiumTier: 'future-expansion',
    category: 'expansion',
    displayGroupId: 'expansion',
    displayGroup: 'Expansion Packs',
    sortOrder: 91,
    iconKey: null,
    badgeLabel: null,
    includedCardTypes: ['style'],
    gameplayNotes: [],
    releaseStage: 'planned',
    setupVisibility: 'hidden',
    featureVisibility: 'hidden',
    availabilityLabel: 'Not released',
  },
]

function isReleasedPack(pack: CardPackDefinition): boolean {
  return pack.releaseStage === 'active'
}

function isSetupVisiblePack(pack: CardPackDefinition): boolean {
  return isReleasedPack(pack) && pack.setupVisibility === 'visible'
}

function isFeatureVisiblePack(pack: CardPackDefinition): boolean {
  return isReleasedPack(pack) && pack.featureVisibility === 'visible'
}

export const ACTIVE_CARD_PACKS: CardPackDefinition[] = CARD_PACK_CATALOG.filter(isReleasedPack)

export const CARD_PACKS: CardPackDefinition[] = ACTIVE_CARD_PACKS.filter(isSetupVisiblePack)

export const CARD_PACKS_FOR_MODE_FEATURES: CardPackDefinition[] =
  ACTIVE_CARD_PACKS.filter(isFeatureVisiblePack)

export const CARD_PACKS_BY_ID: Record<CardPackId, CardPackDefinition> = Object.fromEntries(
  CARD_PACK_CATALOG.map((pack) => [pack.id, pack]),
) as Record<CardPackId, CardPackDefinition>

export function getSetupCardPackSections(): CardPackSetupSection[] {
  const setupVisiblePacks = [...CARD_PACKS].sort((packA, packB) => packA.sortOrder - packB.sortOrder)

  return [...CARD_PACK_DISPLAY_GROUPS]
    .sort((groupA, groupB) => groupA.sortOrder - groupB.sortOrder)
    .map((group) => ({
      id: group.id,
      label: group.label,
      helperText: group.helperText,
      packs: setupVisiblePacks.filter((pack) => pack.displayGroupId === group.id),
    }))
    .filter((section) => section.packs.length > 0)
}

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

  return nextPackIds.sort((packA, packB) => {
    const sortOrderA = CARD_PACKS_BY_ID[packA]?.sortOrder ?? Number.MAX_SAFE_INTEGER
    const sortOrderB = CARD_PACKS_BY_ID[packB]?.sortOrder ?? Number.MAX_SAFE_INTEGER
    return sortOrderA - sortOrderB
  })
}
