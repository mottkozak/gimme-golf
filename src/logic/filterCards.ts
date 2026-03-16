import type { CardBase, CardPackId, HoleTag, PersonalCard, PublicCard } from '../types/cards.ts'

const PERSONAL_CARD_TYPES = new Set<PersonalCard['cardType']>([
  'common',
  'skill',
  'risk',
  'curse',
  'style',
  'hybrid',
  'novelty',
])
const PUBLIC_CARD_TYPES = new Set<PublicCard['cardType']>(['chaos', 'prop'])

function hasRequiredTags(requiredTags: HoleTag[], activeTags: HoleTag[]): boolean {
  return requiredTags.every((requiredTag) => activeTags.includes(requiredTag))
}

function hasExcludedTags(excludedTags: HoleTag[], activeTags: HoleTag[]): boolean {
  return excludedTags.some((excludedTag) => activeTags.includes(excludedTag))
}

function matchesHole(cardPars: number[], holePar: number): boolean {
  return cardPars.includes(holePar)
}

export function filterCardsByEnabledPacks<T extends Pick<CardBase, 'packId'>>(
  cards: T[],
  enabledPackIds: CardPackId[],
): T[] {
  if (enabledPackIds.length === 0) {
    return []
  }

  const enabledPackSet = new Set(enabledPackIds)
  return cards.filter((card) => enabledPackSet.has(card.packId))
}

export function filterEligibleCardsByHoleContext<
  T extends Pick<CardBase, 'eligiblePars' | 'requiredTags' | 'excludedTags'>,
>(cards: T[], holePar: number, holeTags: HoleTag[]): T[] {
  return cards.filter(
    (card) =>
      matchesHole(card.eligiblePars, holePar) &&
      hasRequiredTags(card.requiredTags, holeTags) &&
      !hasExcludedTags(card.excludedTags, holeTags),
  )
}

export function filterPersonalCardsForHole(
  cards: PersonalCard[],
  holePar: number,
  holeTags: HoleTag[],
): PersonalCard[] {
  const personalCards = cards.filter(
    (card) => PERSONAL_CARD_TYPES.has(card.cardType) && card.isPublic === false,
  )
  const matches = filterEligibleCardsByHoleContext(personalCards, holePar, holeTags)

  return matches.length > 0 ? matches : personalCards
}

export function filterPublicCardsForHole(
  cards: PublicCard[],
  holePar: number,
  holeTags: HoleTag[],
): PublicCard[] {
  const publicCards = cards.filter(
    (card) => PUBLIC_CARD_TYPES.has(card.cardType) && card.isPublic === true,
  )
  const matches = filterEligibleCardsByHoleContext(publicCards, holePar, holeTags)

  return matches.length > 0 ? matches : publicCards
}
