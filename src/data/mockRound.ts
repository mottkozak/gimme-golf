import {
  dealPersonalCardsForHole,
  dealPublicCardsForHole,
  getInitialSelectedPersonalCardId,
} from '../logic/dealCards.ts'
import { DEFAULT_FEATURED_HOLES_CONFIG } from '../logic/featuredHoles.ts'
import { buildEmptyHolePowerUpStates } from '../logic/powerUps.ts'
import { createDefaultHoles } from '../logic/roundSetup.ts'
import { createPlayerTotals } from '../logic/scoring.ts'
import { getDefaultEnabledPackIds } from './cardPacks.ts'
import type { HoleTag } from '../types/cards.ts'
import type {
  HoleCardsState,
  HoleResultState,
  Player,
  PlayerTotals,
  RoundConfig,
  RoundState,
} from '../types/game.ts'
import { PERSONAL_CARDS, PUBLIC_CARDS } from './cards.ts'

const MOCK_CONFIG: RoundConfig = {
  holeCount: 9,
  courseStyle: 'standard',
  gameMode: 'cards',
  enabledPackIds: getDefaultEnabledPackIds(),
  featuredHoles: DEFAULT_FEATURED_HOLES_CONFIG,
  toggles: {
    dynamicDifficulty: true,
    momentumBonuses: true,
    drawTwoPickOne: true,
    autoAssignOne: false,
    enableChaosCards: true,
    enablePropCards: true,
  },
}

const MOCK_PLAYERS: Player[] = [
  { id: 'p1', name: 'Avery', expectedScore18: 88 },
  { id: 'p2', name: 'Jordan', expectedScore18: 96 },
  { id: 'p3', name: 'Quinn', expectedScore18: 102 },
]

const TAGS_BY_HOLE_NUMBER: Record<number, HoleTag[]> = {
  1: ['trees'],
  2: ['water'],
  3: ['bunkers'],
  4: ['dogleg'],
  5: ['reachablePar5'],
}

function addMockTags(): RoundState['holes'] {
  return createDefaultHoles(MOCK_CONFIG.holeCount, MOCK_CONFIG.courseStyle).map((hole) => ({
    ...hole,
    tags: TAGS_BY_HOLE_NUMBER[hole.holeNumber] ?? [],
    featuredHoleType: hole.holeNumber === 3 ? 'jackpot' : hole.holeNumber === 7 ? 'rivalry' : null,
  }))
}

function createMockHoleCards(
  holes: RoundState['holes'],
  players: Player[],
  config: RoundConfig,
): HoleCardsState[] {
  return holes.map((hole) => {
    const personalDealResult = dealPersonalCardsForHole(
      players,
      hole,
      config,
      PERSONAL_CARDS,
    )

    const selectedCardIdByPlayerId = Object.fromEntries(
      players.map((player) => {
        const dealtCards = personalDealResult.dealtPersonalCardsByPlayerId[player.id] ?? []
        return [player.id, getInitialSelectedPersonalCardId(dealtCards, config)]
      }),
    )

    return {
      holeNumber: hole.holeNumber,
      dealtPersonalCardsByPlayerId: personalDealResult.dealtPersonalCardsByPlayerId,
      selectedCardIdByPlayerId,
      personalCardOfferByPlayerId: personalDealResult.personalCardOfferByPlayerId,
      publicCards: dealPublicCardsForHole(hole, config, PUBLIC_CARDS),
    }
  })
}

function createMockHoleResults(
  holes: RoundState['holes'],
  players: Player[],
): HoleResultState[] {
  return holes.map((hole, holeIndex) => {
    const playedHole = holeIndex <= 1

    return {
      holeNumber: hole.holeNumber,
      strokesByPlayerId: Object.fromEntries(
        players.map((player, playerIndex) => {
          const strokes = playedHole ? hole.par + ((playerIndex + hole.holeNumber) % 2) : null
          return [player.id, strokes]
        }),
      ),
      missionStatusByPlayerId: Object.fromEntries(
        players.map((player, playerIndex) => {
          if (!playedHole) {
            return [player.id, 'pending']
          }

          const status = (playerIndex + hole.holeNumber) % 2 === 0 ? 'success' : 'failed'
          return [player.id, status]
        }),
      ),
      publicPointDeltaByPlayerId: Object.fromEntries(
        players.map((player, playerIndex) => {
          if (!playedHole) {
            return [player.id, 0]
          }

          const delta = (playerIndex + hole.holeNumber) % 3 === 0 ? 1 : 0
          return [player.id, delta]
        }),
      ),
      publicCardResolutionsByCardId: {},
      publicCardResolutionNotes: playedHole
        ? 'Manual resolution captured in scorekeeper notes.'
        : 'Pending hole completion.',
    }
  })
}

function createMockTotals(): Record<string, PlayerTotals> {
  return {
    p1: createPlayerTotals(40, 5),
    p2: createPlayerTotals(42, 4),
    p3: createPlayerTotals(39, 2),
  }
}

export function createMockRoundState(): RoundState {
  const holes = addMockTags()

  return {
    config: MOCK_CONFIG,
    players: MOCK_PLAYERS,
    holes,
    currentHoleIndex: 2,
    holeCards: createMockHoleCards(holes, MOCK_PLAYERS, MOCK_CONFIG),
    holePowerUps: buildEmptyHolePowerUpStates(MOCK_PLAYERS, holes),
    holeResults: createMockHoleResults(holes, MOCK_PLAYERS),
    totalsByPlayerId: createMockTotals(),
  }
}
