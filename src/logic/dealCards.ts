import type { PersonalCard, PublicCard } from '../types/cards.ts'
import type { HoleCardsState, HoleDefinition, Player, RoundConfig } from '../types/game.ts'
import {
  filterPersonalCardsForHole,
  filterPublicCardsForHole,
} from './filterCards.ts'

type DifficultyBias = 'easy' | 'medium' | 'hard'

const PERSONAL_DIFFICULTY_WEIGHTS: Record<
  DifficultyBias,
  Record<PersonalCard['difficulty'], number>
> = {
  hard: { easy: 1, medium: 3, hard: 5 },
  medium: { easy: 2, medium: 4, hard: 2 },
  easy: { easy: 5, medium: 3, hard: 1 },
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

export function getDifficultyBiasForExpectedScore(expectedScore18: number): DifficultyBias {
  if (expectedScore18 <= 85) {
    return 'hard'
  }

  if (expectedScore18 <= 100) {
    return 'medium'
  }

  return 'easy'
}

export function getPersonalCardWeightForPlayer(
  card: PersonalCard,
  expectedScore18: number,
  dynamicDifficultyEnabled: boolean,
): number {
  if (!dynamicDifficultyEnabled) {
    return 1
  }

  const bias = getDifficultyBiasForExpectedScore(expectedScore18)
  return PERSONAL_DIFFICULTY_WEIGHTS[bias][card.difficulty]
}

export function rankPersonalCardsForPlayer(
  cards: PersonalCard[],
  player: Player,
  hole: HoleDefinition,
  dynamicDifficultyEnabled: boolean,
): PersonalCard[] {
  return [...cards].sort((cardA, cardB) => {
    const weightA = getPersonalCardWeightForPlayer(
      cardA,
      player.expectedScore18,
      dynamicDifficultyEnabled,
    )
    const weightB = getPersonalCardWeightForPlayer(
      cardB,
      player.expectedScore18,
      dynamicDifficultyEnabled,
    )

    if (weightA !== weightB) {
      return weightB - weightA
    }

    const tieBreakerA = createTieBreakerSeed(player.id, hole.holeNumber, cardA.id)
    const tieBreakerB = createTieBreakerSeed(player.id, hole.holeNumber, cardB.id)

    if (tieBreakerA !== tieBreakerB) {
      return tieBreakerA - tieBreakerB
    }

    return cardA.code.localeCompare(cardB.code)
  })
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
  const dealtPersonalCardsByPlayerId = dealPersonalCardsForHole(
    players,
    hole,
    roundConfig,
    personalDeck,
  )
  const selectedCardIdByPlayerId = Object.fromEntries(
    players.map((player) => {
      const dealtCards = dealtPersonalCardsByPlayerId[player.id] ?? []
      return [player.id, getInitialSelectedPersonalCardId(dealtCards, roundConfig)]
    }),
  )

  return {
    holeNumber: hole.holeNumber,
    dealtPersonalCardsByPlayerId,
    selectedCardIdByPlayerId,
    publicCards: dealPublicCardsForHole(hole, roundConfig, publicDeck),
  }
}

export function dealPersonalCardsForHole(
  players: Player[],
  hole: HoleDefinition,
  roundConfig: RoundConfig,
  deck: PersonalCard[],
): Record<string, PersonalCard[]> {
  const eligibleDeck = filterPersonalCardsForHole(deck, hole.par, hole.tags)
  const drawCount = getPersonalDrawCount(roundConfig)

  return Object.fromEntries(
    players.map((player) => {
      const rankedCards = rankPersonalCardsForPlayer(
        eligibleDeck,
        player,
        hole,
        roundConfig.toggles.dynamicDifficulty,
      )
      const cards = drawUniquePersonalCards(rankedCards, drawCount)

      return [player.id, cards]
    }),
  )
}

export function dealPublicCardsForHole(
  hole: HoleDefinition,
  roundConfig: RoundConfig,
  deck: PublicCard[],
): PublicCard[] {
  const filteredDeck = filterPublicCardsForHole(deck, hole.par, hole.tags)
  const cards: PublicCard[] = []

  if (roundConfig.toggles.enableChaosCards) {
    const chaosCard = filteredDeck.find((card) => card.cardType === 'chaos')
    if (chaosCard) {
      cards.push(chaosCard)
    }
  }

  if (roundConfig.toggles.enablePropCards) {
    const propCard = filteredDeck.find((card) => card.cardType === 'prop')
    if (propCard) {
      cards.push(propCard)
    }
  }

  return cards
}
