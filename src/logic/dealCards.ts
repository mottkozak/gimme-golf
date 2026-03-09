import type { PersonalCard, PublicCard } from '../types/cards.ts'
import type {
  HoleCardsState,
  HoleDefinition,
  PersonalCardOfferState,
  Player,
  RoundDeckMemory,
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

const WEIGHTED_SELECTION_POOL_SIZE = 6
const PERSONAL_RECENT_WINDOW_SIZE = 3
const PER_PLAYER_RECENT_WINDOW_SIZE = 4
const PUBLIC_RECENT_WINDOW_SIZE = 3

function toUniqueIds(ids: string[]): string[] {
  return Array.from(new Set(ids))
}

export function createEmptyRoundDeckMemory(): RoundDeckMemory {
  return {
    usedPersonalCardIds: [],
    usedPublicCardIds: [],
  }
}

export function normalizeRoundDeckMemory(
  deckMemory: RoundDeckMemory | undefined,
): RoundDeckMemory {
  if (!deckMemory) {
    return createEmptyRoundDeckMemory()
  }

  return {
    usedPersonalCardIds: toUniqueIds(deckMemory.usedPersonalCardIds ?? []),
    usedPublicCardIds: toUniqueIds(deckMemory.usedPublicCardIds ?? []),
  }
}

export function buildDeckMemoryFromHoleCards(holeCards: HoleCardsState[]): RoundDeckMemory {
  const usedPersonalCardIds: string[] = []
  const usedPublicCardIds: string[] = []

  for (const holeCardState of holeCards) {
    for (const cards of Object.values(holeCardState.dealtPersonalCardsByPlayerId ?? {})) {
      for (const card of cards) {
        usedPersonalCardIds.push(card.id)
      }
    }

    for (const card of holeCardState.publicCards ?? []) {
      usedPublicCardIds.push(card.id)
    }
  }

  return {
    usedPersonalCardIds: toUniqueIds(usedPersonalCardIds),
    usedPublicCardIds: toUniqueIds(usedPublicCardIds),
  }
}

function getRecentHoleCardsWindow(
  priorHoleCards: HoleCardsState[] | undefined,
  windowSize: number,
): HoleCardsState[] {
  if (!priorHoleCards || priorHoleCards.length === 0 || windowSize <= 0) {
    return []
  }

  return priorHoleCards.slice(Math.max(0, priorHoleCards.length - windowSize))
}

function buildRecentPersonalCardIds(
  priorHoleCards: HoleCardsState[] | undefined,
  windowSize: number,
): Set<string> {
  const recentCardIds = new Set<string>()
  const recentWindow = getRecentHoleCardsWindow(priorHoleCards, windowSize)

  for (const holeCardState of recentWindow) {
    for (const dealtCards of Object.values(holeCardState.dealtPersonalCardsByPlayerId ?? {})) {
      for (const card of dealtCards) {
        recentCardIds.add(card.id)
      }
    }
  }

  return recentCardIds
}

function buildRecentPersonalCardIdsByPlayerId(
  players: Player[],
  priorHoleCards: HoleCardsState[] | undefined,
  windowSize: number,
): Record<string, Set<string>> {
  const recentWindow = getRecentHoleCardsWindow(priorHoleCards, windowSize)
  const recentByPlayerId: Record<string, Set<string>> = Object.fromEntries(
    players.map((player) => [player.id, new Set<string>()]),
  )

  for (const holeCardState of recentWindow) {
    for (const player of players) {
      const dealtCards = holeCardState.dealtPersonalCardsByPlayerId[player.id] ?? []
      const playerRecentCards = recentByPlayerId[player.id]

      for (const card of dealtCards) {
        playerRecentCards.add(card.id)
      }
    }
  }

  return recentByPlayerId
}

function buildRecentPublicCardIds(
  priorHoleCards: HoleCardsState[] | undefined,
  windowSize: number,
): Set<string> {
  const recentCardIds = new Set<string>()
  const recentWindow = getRecentHoleCardsWindow(priorHoleCards, windowSize)

  for (const holeCardState of recentWindow) {
    for (const publicCard of holeCardState.publicCards ?? []) {
      recentCardIds.add(publicCard.id)
    }
  }

  return recentCardIds
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

interface RankedPersonalCard {
  card: PersonalCard
  score: number
  tieBreaker: number
}

function rankCardsForOffer(
  cards: PersonalCard[],
  player: Player,
  hole: HoleDefinition,
  offerKind: PersonalOfferKind,
  dynamicDifficultyEnabled: boolean,
): RankedPersonalCard[] {
  return cards
    .map((card) => ({
      card,
      score: scoreCardForOffer(card, player, hole, offerKind, dynamicDifficultyEnabled),
      tieBreaker: createTieBreakerSeed(player.id, hole.holeNumber, card.id),
    }))
    .sort((cardA, cardB) => {
      if (cardA.score !== cardB.score) {
        return cardB.score - cardA.score
      }

      if (cardA.tieBreaker !== cardB.tieBreaker) {
        return cardA.tieBreaker - cardB.tieBreaker
      }

      return cardA.card.code.localeCompare(cardB.card.code)
    })
}

function pickWeightedPersonalCardFromRanked(
  rankedCards: RankedPersonalCard[],
): PersonalCard | null {
  if (rankedCards.length === 0) {
    return null
  }

  const candidatePool = rankedCards.slice(0, Math.min(WEIGHTED_SELECTION_POOL_SIZE, rankedCards.length))
  const floorScore = candidatePool[candidatePool.length - 1]?.score ?? 0
  const weights = candidatePool.map((candidate, index) => {
    const scoreWeight = Math.max(1, candidate.score - floorScore + 1)
    const rankWeight = Math.max(1, candidatePool.length - index)
    return scoreWeight + rankWeight
  })
  const totalWeight = weights.reduce((total, weight) => total + weight, 0)
  let roll = Math.random() * totalWeight

  for (let index = 0; index < candidatePool.length; index += 1) {
    roll -= weights[index]
    if (roll <= 0) {
      return candidatePool[index].card
    }
  }

  return candidatePool[candidatePool.length - 1].card
}

function getPersonalCandidatePool(
  cards: PersonalCard[],
  usedPersonalCardIds: Set<string>,
  recentPersonalCardIds: Set<string>,
  recentPlayerCardIds: Set<string>,
  minimumFreshCards: number,
): PersonalCard[] {
  const candidatePools = [
    cards.filter(
      (card) =>
        !recentPersonalCardIds.has(card.id) &&
        !recentPlayerCardIds.has(card.id) &&
        !usedPersonalCardIds.has(card.id),
    ),
    cards.filter(
      (card) =>
        !recentPersonalCardIds.has(card.id) && !recentPlayerCardIds.has(card.id),
    ),
    cards.filter(
      (card) =>
        !recentPlayerCardIds.has(card.id) && !usedPersonalCardIds.has(card.id),
    ),
    cards.filter((card) => !recentPlayerCardIds.has(card.id)),
    cards.filter((card) => !usedPersonalCardIds.has(card.id)),
    cards,
  ]

  for (const pool of candidatePools) {
    if (pool.length >= minimumFreshCards || pool.length > 0) {
      return pool
    }
  }

  return cards
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
  usedPersonalCardIds: Set<string>,
  recentPersonalCardIds: Set<string>,
  recentPlayerCardIds: Set<string>,
): { cards: PersonalCard[]; offer: PersonalCardOfferState } {
  const safeCandidatePool = getPersonalCandidatePool(
    cards,
    usedPersonalCardIds,
    recentPersonalCardIds,
    recentPlayerCardIds,
    1,
  )
  const safeRanked = rankCardsForOffer(
    safeCandidatePool,
    player,
    hole,
    'safe',
    dynamicDifficultyEnabled,
  )
  const safeCard = pickWeightedPersonalCardFromRanked(safeRanked)
  if (safeCard) {
    usedPersonalCardIds.add(safeCard.id)
    recentPlayerCardIds.add(safeCard.id)
  }

  const remaining = safeCard ? cards.filter((card) => card.id !== safeCard.id) : cards
  const hardCandidatePool = getPersonalCandidatePool(
    remaining,
    usedPersonalCardIds,
    recentPersonalCardIds,
    recentPlayerCardIds,
    1,
  )
  const hardRanked = rankCardsForOffer(
    hardCandidatePool,
    player,
    hole,
    'hard',
    dynamicDifficultyEnabled,
  )
  const safeChallengeIndex = safeCard ? getChallengeIndex(safeCard) : -1

  let hardCard = pickWeightedPersonalCardFromRanked(hardRanked)
  if (hardCard && safeChallengeIndex >= 0 && getChallengeIndex(hardCard) <= safeChallengeIndex) {
    const moreDemanding = hardRanked
      .filter((candidate) => getChallengeIndex(candidate.card) > safeChallengeIndex)
    const moreDemandingPick = pickWeightedPersonalCardFromRanked(moreDemanding)
    if (moreDemanding.length > 0) {
      hardCard = moreDemandingPick ?? hardCard
    }
  }
  if (hardCard) {
    usedPersonalCardIds.add(hardCard.id)
    recentPlayerCardIds.add(hardCard.id)
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
  usedPersonalCardIds: Set<string>,
  recentPersonalCardIds: Set<string>,
  recentPlayerCardIds: Set<string>,
): { cards: PersonalCard[]; offer: PersonalCardOfferState } {
  const candidatePool = getPersonalCandidatePool(
    cards,
    usedPersonalCardIds,
    recentPersonalCardIds,
    recentPlayerCardIds,
    1,
  )
  const singleRanked = rankCardsForOffer(
    candidatePool,
    player,
    hole,
    'single',
    dynamicDifficultyEnabled,
  )
  const selectedCard = pickWeightedPersonalCardFromRanked(singleRanked)

  if (!selectedCard) {
    return {
      cards: [],
      offer: createEmptyOfferState(),
    }
  }
  usedPersonalCardIds.add(selectedCard.id)
  recentPlayerCardIds.add(selectedCard.id)

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
  usedPersonalCardIds: Set<string>,
  recentPersonalCardIds: Set<string>,
  recentPlayerCardIds: Set<string>,
): { cards: PersonalCard[]; offer: PersonalCardOfferState } {
  const candidatePool = getPersonalCandidatePool(
    cards,
    usedPersonalCardIds,
    recentPersonalCardIds,
    recentPlayerCardIds,
    1,
  )
  const hardRanked = rankCardsForOffer(
    candidatePool,
    player,
    hole,
    'hard',
    dynamicDifficultyEnabled,
  )
  const selectedCard = pickWeightedPersonalCardFromRanked(hardRanked)

  if (!selectedCard) {
    return {
      cards: [],
      offer: createEmptyOfferState(),
    }
  }
  usedPersonalCardIds.add(selectedCard.id)
  recentPlayerCardIds.add(selectedCard.id)

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
  deckMemory: RoundDeckMemory | undefined,
  priorHoleCards: HoleCardsState[] = [],
): HoleCardsState {
  const personalDealResult = dealPersonalCardsForHole(
    players,
    hole,
    roundConfig,
    personalDeck,
    deckMemory,
    priorHoleCards,
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
    publicCards: dealPublicCardsForHole(hole, roundConfig, publicDeck, deckMemory, priorHoleCards),
  }
}

export function dealPersonalCardsForHole(
  players: Player[],
  hole: HoleDefinition,
  roundConfig: RoundConfig,
  deck: PersonalCard[],
  deckMemory: RoundDeckMemory | undefined,
  priorHoleCards: HoleCardsState[] = [],
): PersonalDealResult {
  const normalizedDeckMemory = normalizeRoundDeckMemory(deckMemory)
  const usedPersonalCardIds = new Set(normalizedDeckMemory.usedPersonalCardIds)
  const recentPersonalCardIds = buildRecentPersonalCardIds(priorHoleCards, PERSONAL_RECENT_WINDOW_SIZE)
  const recentPersonalCardIdsByPlayerId = buildRecentPersonalCardIdsByPlayerId(
    players,
    priorHoleCards,
    PER_PLAYER_RECENT_WINDOW_SIZE,
  )
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
        usedPersonalCardIds,
        recentPersonalCardIds,
        recentPersonalCardIdsByPlayerId[player.id] ?? new Set<string>(),
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
        usedPersonalCardIds,
        recentPersonalCardIds,
        recentPersonalCardIdsByPlayerId[player.id] ?? new Set<string>(),
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
      usedPersonalCardIds,
      recentPersonalCardIds,
      recentPersonalCardIdsByPlayerId[player.id] ?? new Set<string>(),
    )
    dealtPersonalCardsByPlayerId[player.id] = offer.cards
    personalCardOfferByPlayerId[player.id] = offer.offer
  }

  return {
    dealtPersonalCardsByPlayerId,
    personalCardOfferByPlayerId,
  }
}

function getPublicCardWeight(card: PublicCard): number {
  const impactWeight = Math.max(1, 4 - Math.min(3, Math.abs(card.points)))
  const signWeight = card.points < 0 ? 4 : card.points === 0 ? 2 : 1
  return impactWeight + signWeight
}

function pickWeightedPublicCard(cards: PublicCard[]): PublicCard | null {
  if (cards.length === 0) {
    return null
  }

  const weightedCards = cards.map((card) => ({
    card,
    weight: getPublicCardWeight(card),
  }))
  const totalWeight = weightedCards.reduce((total, entry) => total + entry.weight, 0)
  let roll = Math.random() * totalWeight

  for (const entry of weightedCards) {
    roll -= entry.weight
    if (roll <= 0) {
      return entry.card
    }
  }

  return weightedCards[weightedCards.length - 1].card
}

function pickPublicCardWithMemory(
  candidates: PublicCard[],
  usedPublicCardIds: Set<string>,
  selectedCardIds: Set<string>,
  recentPublicCardIds: Set<string>,
  preferredSign: 'positive' | 'negative' | 'any' = 'any',
): PublicCard | null {
  const availableCards = candidates.filter((card) => !selectedCardIds.has(card.id))
  if (availableCards.length === 0) {
    return null
  }

  const signFilteredCards =
    preferredSign === 'any'
      ? availableCards
      : availableCards.filter((card) =>
          preferredSign === 'negative' ? card.points < 0 : card.points > 0,
        )
  const basePool = signFilteredCards.length > 0 ? signFilteredCards : availableCards
  const nonRecentAndFresh = basePool.filter(
    (card) => !recentPublicCardIds.has(card.id) && !usedPublicCardIds.has(card.id),
  )
  const nonRecent = basePool.filter((card) => !recentPublicCardIds.has(card.id))
  const fresh = basePool.filter((card) => !usedPublicCardIds.has(card.id))
  const candidatePool =
    nonRecentAndFresh.length > 0
      ? nonRecentAndFresh
      : nonRecent.length > 0
        ? nonRecent
        : fresh.length > 0
          ? fresh
          : basePool
  const selectedCard = pickWeightedPublicCard(candidatePool)

  if (!selectedCard) {
    return null
  }

  selectedCardIds.add(selectedCard.id)
  usedPublicCardIds.add(selectedCard.id)
  recentPublicCardIds.add(selectedCard.id)
  return selectedCard
}

export function dealPublicCardsForHole(
  hole: HoleDefinition,
  roundConfig: RoundConfig,
  deck: PublicCard[],
  deckMemory: RoundDeckMemory | undefined,
  priorHoleCards: HoleCardsState[] = [],
): PublicCard[] {
  const normalizedDeckMemory = normalizeRoundDeckMemory(deckMemory)
  const usedPublicCardIds = new Set(normalizedDeckMemory.usedPublicCardIds)
  const recentPublicCardIds = buildRecentPublicCardIds(priorHoleCards, PUBLIC_RECENT_WINDOW_SIZE)
  const selectedCardIds = new Set<string>()
  const packFilteredDeck = filterCardsByEnabledPacks(deck, roundConfig.enabledPackIds)
  const filteredDeck = filterPublicCardsForHole(packFilteredDeck, hole.par, hole.tags)
  const fullEligibleDeck = filterPublicCardsForHole(deck, hole.par, hole.tags)
  const cards: PublicCard[] = []
  const isChaosFeaturedHole = hole.featuredHoleType === 'chaos'

  if (isChaosFeaturedHole) {
    // Featured Chaos hole fallback: guarantee a Chaos card even when the chaos pack is disabled.
    const featuredChaosCard =
      pickPublicCardWithMemory(
        filteredDeck.filter((card) => card.cardType === 'chaos'),
        usedPublicCardIds,
        selectedCardIds,
        recentPublicCardIds,
      ) ??
      pickPublicCardWithMemory(
        fullEligibleDeck.filter((card) => card.cardType === 'chaos'),
        usedPublicCardIds,
        selectedCardIds,
        recentPublicCardIds,
      ) ??
      pickPublicCardWithMemory(
        filteredDeck.filter((card) => card.cardType === 'prop'),
        usedPublicCardIds,
        selectedCardIds,
        recentPublicCardIds,
      ) ??
      pickPublicCardWithMemory(
        fullEligibleDeck.filter((card) => card.cardType === 'prop'),
        usedPublicCardIds,
        selectedCardIds,
        recentPublicCardIds,
      )

    if (featuredChaosCard) {
      cards.push(featuredChaosCard)
    }
  }

  if (roundConfig.enabledPackIds.includes('chaos') && !cards.some((card) => card.cardType === 'chaos')) {
    const chaosCard = pickPublicCardWithMemory(
      filteredDeck.filter((card) => card.cardType === 'chaos'),
      usedPublicCardIds,
      selectedCardIds,
      recentPublicCardIds,
      'negative',
    )
    if (chaosCard) {
      cards.push(chaosCard)
    }
  }

  if (roundConfig.enabledPackIds.includes('props')) {
    const chaosSign = cards.find((card) => card.cardType === 'chaos')?.points ?? 0
    const propSignPreference = chaosSign > 0 ? 'negative' : chaosSign < 0 ? 'positive' : 'any'
    const propCard = pickPublicCardWithMemory(
      filteredDeck.filter((card) => card.cardType === 'prop'),
      usedPublicCardIds,
      selectedCardIds,
      recentPublicCardIds,
      propSignPreference,
    )
    if (propCard && !cards.some((card) => card.id === propCard.id)) {
      cards.push(propCard)
    }
  }

  return cards
}
