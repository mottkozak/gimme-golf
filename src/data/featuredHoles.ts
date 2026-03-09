import type { FeaturedHoleType } from '../types/game.ts'

export interface FeaturedHoleDefinition {
  id: FeaturedHoleType
  name: string
  shortDescription: string
  longDescription: string
  quickRule: string
  pacingNote: string
  effectType:
    | 'personal_reward_modifier'
    | 'public_card_modifier'
    | 'head_to_head_bonus'
    | 'deal_mode_modifier'
  sortOrder: number
  iconKey: string | null
  badgeLabel: string | null
}

export const FEATURED_HOLES: FeaturedHoleDefinition[] = [
  {
    id: 'jackpot',
    name: 'Jackpot Hole',
    shortDescription: 'Mission success cards gain an extra +1 point.',
    longDescription:
      'Every successful personal mission gets +1 extra game point on this hole.',
    quickRule: 'Success rewards +1',
    pacingNote: 'Great for momentum and comeback swings.',
    effectType: 'personal_reward_modifier',
    sortOrder: 1,
    iconKey: 'jackpot',
    badgeLabel: 'Bonus',
  },
  {
    id: 'chaos',
    name: 'Chaos Hole',
    shortDescription: 'A Chaos public card is guaranteed for this hole.',
    longDescription:
      'Guarantees a Chaos card this hole. If Chaos is disabled in packs, a featured-hole fallback still injects one Chaos card.',
    quickRule: 'Guaranteed public chaos card',
    pacingNote: 'Adds whole-group volatility on a single hole.',
    effectType: 'public_card_modifier',
    sortOrder: 3,
    iconKey: 'chaos',
    badgeLabel: 'Public',
  },
  {
    id: 'double_points',
    name: 'Double Points Hole',
    shortDescription: 'Successful mission rewards are doubled.',
    longDescription:
      'Personal mission reward points are doubled on success. Real golf strokes are never changed.',
    quickRule: 'Success rewards x2',
    pacingNote: 'Creates one high-upside scoring spike.',
    effectType: 'personal_reward_modifier',
    sortOrder: 4,
    iconKey: 'double',
    badgeLabel: 'x2',
  },
  {
    id: 'rivalry',
    name: 'Rivalry Hole',
    shortDescription: 'Closest players in points go head-to-head for bonus points.',
    longDescription:
      'The closest players in game points before this hole are paired. Rivalry winner gets a small bonus.',
    quickRule: 'Closest pair plays for +1',
    pacingNote: 'Builds pressure between nearby players.',
    effectType: 'head_to_head_bonus',
    sortOrder: 2,
    iconKey: 'rivalry',
    badgeLabel: 'H2H',
  },
  {
    id: 'no_mercy',
    name: 'No Mercy Hole',
    shortDescription: 'Safe offer is removed; a harder personal card is forced.',
    longDescription:
      'Removes safer choice pressure by forcing a harder personal card assignment for this hole.',
    quickRule: 'Harder personal card is forced',
    pacingNote: 'Increases challenge without touching real strokes.',
    effectType: 'deal_mode_modifier',
    sortOrder: 5,
    iconKey: 'pressure',
    badgeLabel: 'Hard',
  },
]

export const FEATURED_HOLES_BY_ID: Record<FeaturedHoleType, FeaturedHoleDefinition> =
  Object.fromEntries(FEATURED_HOLES.map((featuredHole) => [featuredHole.id, featuredHole])) as Record<
    FeaturedHoleType,
    FeaturedHoleDefinition
  >

export const FEATURED_HOLE_TYPE_SEQUENCE: FeaturedHoleType[] = FEATURED_HOLES
  .slice()
  .sort((featuredHoleA, featuredHoleB) => featuredHoleA.sortOrder - featuredHoleB.sortOrder)
  .map((featuredHole) => featuredHole.id)
