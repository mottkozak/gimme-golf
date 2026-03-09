import type { PersonalCard, PublicCard } from '../types/cards.ts'
import type {
  HoleCardsState,
  HoleDefinition,
  PersonalCardOfferState,
  Player,
  RoundConfig,
} from '../types/game.ts'
import {
  DYNAMIC_OFFER_TUNING,
  getSkillBandForExpectedScore,
  STATIC_OFFER_TUNING,
  type SkillBandOfferTuning,
} from './gameBalance.ts'
import {
  filterCardsByEnabledPacks,
  filterPersonalCardsForHole,
  filterPublicCardsForHole,
} from './filterCards.ts'
import { isNoMercyFeaturedHole } from './featuredHoles.ts'

type PersonalOfferKind = 'safe' | 'hard' | 'single'

const DIFFICULTY_RANK: Record<PersonalCard['difficulty'], number> = {
  easy: 1,
  medium: 2,
  hard: 3,
}

function hashString(value: string): number {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash
}

function createTieBreakerSeed(playerId: string, holeNumber: number, cardId: string): number {
  return hashString(`${playerId}:${holeNumber}:${cardId}`)
}

function getOfferTuning(
  expectedScore18: number,
  dynamicDifficultyEnabled: boolean,
): SkillBandOfferTuning {
  if (!dynamicDifficultyEnabled) {
    return STATIC_OFFER_TUNING
  }

  const skillBand = getSkillBandForExpectedScore(expectedScore18)
  return DYNAMIC_OFFER_TUNING[skillBand]
}

function scoreDistanceToPreferredPoints(points: number, preferredPoints: number[]): number {
  if (preferredPoints.length === 0) {
    return 0
  }

  const closestDistance = preferredPoints.reduce((bestDistance, targetPoints) => {
    return Math.min(bestDistance, Math.abs(points - targetPoints))
  }, Number.POSITIVE_INFINITY)

  if (closestDistance === 0) {
    return 7
  }

  return Math.max(0, 7 - closestDistance * 2)
}

function getChallengeIndex(card: PersonalCard): number {
  return card.points * 10 + DIFFICULTY_RANK[card.difficulty]
}

function shouldUseHighUpsideHardTarget(
  player: Player,
  hole: HoleDefinition,
  dynamicDifficultyEnabled: boolean,
): boolean {
  if (!dynamicDifficultyEnabled) {
    return false
  }

  const tuning = getOfferTuning(player.expectedScore18, dynamicDifficultyEnabled)
  if (tuning.hardHighUpsideChance <= 0) {
    return false
  }

  const roll = createTieBreakerSeed(player.id, hole.holeNumber, 'hard-upside') % 100
  return roll < Math.round(tuning.hardHighUpsideChance * 100)
}

function getPreferredPointsForOffer(
  player: Player,
  hole: HoleDefinition,
  offerKind: PersonalOfferKind,
  dynamicDifficultyEnabled: boolean,
): number[] {
  const tuning = getOfferTuning(player.expectedScore18, dynamicDifficultyEnabled)
  const basePoints = tuning[offerKind].preferredPoints

  if (offerKind !== 'hard') {
    return basePoints
  }

  if (!shouldUseHighUpsideHardTarget(player, hole, dynamicDifficultyEnabled)) {
    return basePoints
  }

  return Array.from(new Set([5, ...basePoints]))
}

function scoreCardForOffer(
  card: PersonalCard,
  player: Player,
  hole: HoleDefinition,
  offerKind: PersonalOfferKind,
  dynamicDifficultyEnabled: boolean,
): number {
  const tuning = getOfferTuning(player.expectedScore18, dynamicDifficultyEnabled)[offerKind]
  const preferredPoints = getPreferredPointsForOffer(player, hole, offerKind, dynamicDifficultyEnabled)
  const difficultyScore = tuning.difficultyWeights[card.difficulty] * 6
  const pointScore = scoreDistanceToPreferredPoints(card.points, preferredPoints) * 5
  const challengeIndex = getChallengeIndex(card)

  if (offerKind === 'safe') {
    return difficultyScore + pointScore - challengeIndex
  }

  if (offerKind === 'hard') {
    return difficultyScore + pointScore + challengeIndex
  }

  return difficultyScore + pointScore + Math.round(challengeIndex / 2)
}

function rankCardsForOffer(
  cards: PersonalCard[],
  player: Player,
  hole: HoleDefinition,
  offerKind: PersonalOfferKind,
  dynamicDifficultyEnabled: boolean,
): PersonalCard[] {
  return [...cards].sort((cardA, cardB) => {
    const scoreA = scoreCardForOffer(cardA, player, hole, offerKind, dynamicDifficultyEnabled)
    const scoreB = scoreCardForOffer(cardB, player, hole, offerKind, dynamicDifficultyEnabled)

    if (scoreA !== scoreB) {
      return scoreB - scoreA
    }

    const tieBreakerA = createTieBreakerSeed(player.id, hole.holeNumber, cardA.id)
    const tieBreakerB = createTieBreakerSeed(player.id, hole.holeNumber, cardB.id)

    if (tieBreakerA !== tieBreakerB) {
      return tieBreakerA - tieBreakerB
    }

    return cardA.code.localeCompare(cardB.code)
  })
}

function createEmptyOfferState(): PersonalCardOfferState {
  return {
    safeCardId: null,
    hardCardId: null,
  }
}

function chooseSafeAndHardCardsForPlayer(
  cards: PersonalCard[],
  player: Player,
  hole: HoleDefinition,
  dynamicDifficultyEnabled: boolean,
): { cards: PersonalCard[]; offer: PersonalCardOfferState } {
  const safeRanked = rankCardsForOffer(cards, player, hole, 'safe', dynamicDifficultyEnabled)
  const safeCard = safeRanked[0]
  const remaining = safeCard ? cards.filter((card) => card.id !== safeCard.id) : cards
  const hardRanked = rankCardsForOffer(remaining, player, hole, 'hard', dynamicDifficultyEnabled)
  const safeChallengeIndex = safeCard ? getChallengeIndex(safeCard) : -1

  let hardCard = hardRanked[0]
  if (hardCard && safeChallengeIndex >= 0 && getChallengeIndex(hardCard) <= safeChallengeIndex) {
    const moreDemanding = hardRanked.find((card) => getChallengeIndex(card) > safeChallengeIndex)
    if (moreDemanding) {
      hardCard = moreDemanding
    }
  }

  const orderedCards = [safeCard, hardCard].filter((card): card is PersonalCard => Boolean(card))

  return {
    cards: orderedCards,
    offer: {
      safeCardId: safeCard?.id ?? null,
      hardCardId: hardCard?.id ?? null,
    },
  }
}

function chooseSingleCardForPlayer(
  cards: PersonalCard[],
  player: Player,
  hole: HoleDefinition,
  dynamicDifficultyEnabled: boolean,
): { cards: PersonalCard[]; offer: PersonalCardOfferState } {
  const singleRanked = rankCardsForOffer(cards, player, hole, 'single', dynamicDifficultyEnabled)
  const selectedCard = singleRanked[0]

  if (!selectedCard) {
    return {
      cards: [],
      offer: createEmptyOfferState(),
    }
  }

  return {
    cards: [selectedCard],
    offer: {
      safeCardId: selectedCard.id,
      hardCardId: null,
    },
  }
}

function chooseNoMercyCardForPlayer(
  cards: PersonalCard[],
  player: Player,
  hole: HoleDefinition,
  dynamicDifficultyEnabled: boolean,
): { cards: PersonalCard[]; offer: PersonalCardOfferState } {
  const hardRanked = rankCardsForOffer(cards, player, hole, 'hard', dynamicDifficultyEnabled)
  const selectedCard = hardRanked[0]

  if (!selectedCard) {
    return {
      cards: [],
      offer: createEmptyOfferState(),
    }
  }

  return {
    cards: [selectedCard],
    offer: {
      safeCardId: null,
      hardCardId: selectedCard.id,
    },
  }
}

export interface PersonalDealResult {
  dealtPersonalCardsByPlayerId: Record<string, PersonalCard[]>
  personalCardOfferByPlayerId: Record<string, PersonalCardOfferState>
}

export function drawUniquePersonalCards(cards: PersonalCard[], drawCount: number): PersonalCard[] {
  const uniqueCards: PersonalCard[] = []
  const seenCardIds = new Set<string>()

  for (const card of cards) {
    if (seenCardIds.has(card.id)) {
      continue
    }

    seenCardIds.add(card.id)
    uniqueCards.push(card)

    if (uniqueCards.length >= drawCount) {
      break
    }
  }

  return uniqueCards
}

export function getPersonalDrawCount(roundConfig: RoundConfig): number {
  if (roundConfig.toggles.autoAssignOne) {
    return 1
  }

  return roundConfig.toggles.drawTwoPickOne ? 2 : 1
}

export function getInitialSelectedPersonalCardId(
  dealtCards: PersonalCard[],
  roundConfig: RoundConfig,
): string | null {
  if (roundConfig.toggles.autoAssignOne) {
    return dealtCards[0]?.id ?? null
  }

  return null
}

export function createEmptyHoleCardsState(
  players: Player[],
  holeNumber: number,
): HoleCardsState {
  return {
    holeNumber,
    dealtPersonalCardsByPlayerId: Object.fromEntries(players.map((player) => [player.id, []])),
    selectedCardIdByPlayerId: Object.fromEntries(players.map((player) => [player.id, null])),
    personalCardOfferByPlayerId: Object.fromEntries(
      players.map((player) => [player.id, createEmptyOfferState()]),
    ),
    publicCards: [],
  }
}

export function createDealtHoleCardsState(
  players: Player[],
  hole: HoleDefinition,
  roundConfig: RoundConfig,
  personalDeck: PersonalCard[],
  publicDeck: PublicCard[],
): HoleCardsState {
  const personalDealResult = dealPersonalCardsForHole(
    players,
    hole,
    roundConfig,
    personalDeck,
  )
  const selectedCardIdByPlayerId = Object.fromEntries(
    players.map((player) => {
      const dealtCards = personalDealResult.dealtPersonalCardsByPlayerId[player.id] ?? []
      const defaultSelectionId = getInitialSelectedPersonalCardId(dealtCards, roundConfig)
      if (defaultSelectionId) {
        return [player.id, defaultSelectionId]
      }

      if (isNoMercyFeaturedHole(hole.featuredHoleType)) {
        return [player.id, dealtCards[0]?.id ?? null]
      }

      return [player.id, null]
    }),
  )

  return {
    holeNumber: hole.holeNumber,
    dealtPersonalCardsByPlayerId: personalDealResult.dealtPersonalCardsByPlayerId,
    selectedCardIdByPlayerId,
    personalCardOfferByPlayerId: personalDealResult.personalCardOfferByPlayerId,
    publicCards: dealPublicCardsForHole(hole, roundConfig, publicDeck),
  }
}

export function dealPersonalCardsForHole(
  players: Player[],
  hole: HoleDefinition,
  roundConfig: RoundConfig,
  deck: PersonalCard[],
): PersonalDealResult {
  const packFilteredDeck = filterCardsByEnabledPacks(deck, roundConfig.enabledPackIds)
  const eligibleDeck = filterPersonalCardsForHole(packFilteredDeck, hole.par, hole.tags)
  const drawCount = getPersonalDrawCount(roundConfig)
  const dealtPersonalCardsByPlayerId: Record<string, PersonalCard[]> = {}
  const personalCardOfferByPlayerId: Record<string, PersonalCardOfferState> = {}
  const noMercyFeaturedHole = isNoMercyFeaturedHole(hole.featuredHoleType)

  for (const player of players) {
    if (noMercyFeaturedHole) {
      const offer = chooseNoMercyCardForPlayer(
        eligibleDeck,
        player,
        hole,
        roundConfig.toggles.dynamicDifficulty,
      )
      dealtPersonalCardsByPlayerId[player.id] = offer.cards
      personalCardOfferByPlayerId[player.id] = offer.offer
      continue
    }

    if (drawCount >= 2) {
      const offer = chooseSafeAndHardCardsForPlayer(
        eligibleDeck,
        player,
        hole,
        roundConfig.toggles.dynamicDifficulty,
      )
      dealtPersonalCardsByPlayerId[player.id] = offer.cards
      personalCardOfferByPlayerId[player.id] = offer.offer
      continue
    }

    const offer = chooseSingleCardForPlayer(
      eligibleDeck,
      player,
      hole,
      roundConfig.toggles.dynamicDifficulty,
    )
    dealtPersonalCardsByPlayerId[player.id] = offer.cards
    personalCardOfferByPlayerId[player.id] = offer.offer
  }

  return {
    dealtPersonalCardsByPlayerId,
    personalCardOfferByPlayerId,
  }
}

export function dealPublicCardsForHole(
  hole: HoleDefinition,
  roundConfig: RoundConfig,
  deck: PublicCard[],
): PublicCard[] {
  const packFilteredDeck = filterCardsByEnabledPacks(deck, roundConfig.enabledPackIds)
  const filteredDeck = filterPublicCardsForHole(packFilteredDeck, hole.par, hole.tags)
  const fullEligibleDeck = filterPublicCardsForHole(deck, hole.par, hole.tags)
  const cards: PublicCard[] = []
  const isChaosFeaturedHole = hole.featuredHoleType === 'chaos'

  if (isChaosFeaturedHole) {
    // Featured Chaos hole fallback: guarantee a Chaos card even when the chaos pack is disabled.
    const featuredChaosCard =
      filteredDeck.find((card) => card.cardType === 'chaos') ??
      fullEligibleDeck.find((card) => card.cardType === 'chaos') ??
      filteredDeck.find((card) => card.cardType === 'prop') ??
      fullEligibleDeck.find((card) => card.cardType === 'prop')

    if (featuredChaosCard) {
      cards.push(featuredChaosCard)
    }
  }

  if (roundConfig.enabledPackIds.includes('chaos') && !cards.some((card) => card.cardType === 'chaos')) {
    const chaosCard = filteredDeck.find((card) => card.cardType === 'chaos')
    if (chaosCard) {
      cards.push(chaosCard)
    }
  }

  if (roundConfig.enabledPackIds.includes('props')) {
    const propCard = filteredDeck.find((card) => card.cardType === 'prop')
    if (propCard && !cards.some((card) => card.id === propCard.id)) {
      cards.push(propCard)
    }
  }

  return cards
}
