import { PERSONAL_CARDS, PUBLIC_CARDS } from '../data/cards.ts'
import type { RoundState } from '../types/game.ts'
import {
  buildDeckMemoryFromHoleCards,
  createDealtHoleCardsState,
  createEmptyHoleCardsState,
} from './dealCards.ts'
import {
  assignPowerUpsForHoleWithCurses,
  createEmptyHolePowerUpState,
} from './powerUps.ts'
import { markHoleStartedAt } from './uxMetrics.ts'

export function prepareCurrentHoleForPlay(
  roundState: RoundState,
  startedAtMs: number = Date.now(),
): RoundState {
  const currentHoleIndex = roundState.currentHoleIndex
  const currentHole = roundState.holes[currentHoleIndex]

  if (!currentHole) {
    return roundState
  }

  const isPowerUpsMode = roundState.config.gameMode === 'powerUps'
  const holeCards = [...roundState.holeCards]
  const holePowerUps = [...roundState.holePowerUps]

  if (isPowerUpsMode) {
    holeCards[currentHoleIndex] = createEmptyHoleCardsState(
      roundState.players,
      currentHole.holeNumber,
    )
    holePowerUps[currentHoleIndex] = assignPowerUpsForHoleWithCurses(
      roundState.players,
      currentHole.holeNumber,
      roundState.holeResults,
      currentHoleIndex,
    )
  } else {
    const priorHoleCards = roundState.holeCards.filter(
      (_, holeIndex) => holeIndex !== currentHoleIndex,
    )
    const deckMemoryForDeal = buildDeckMemoryFromHoleCards(priorHoleCards)

    holeCards[currentHoleIndex] = createDealtHoleCardsState(
      roundState.players,
      currentHole,
      roundState.config,
      PERSONAL_CARDS,
      PUBLIC_CARDS,
      deckMemoryForDeal,
      priorHoleCards,
    )
    holePowerUps[currentHoleIndex] = createEmptyHolePowerUpState(
      roundState.players,
      currentHole.holeNumber,
    )
  }

  const holeResults = [...roundState.holeResults]
  holeResults[currentHoleIndex] = {
    ...holeResults[currentHoleIndex],
    strokesByPlayerId: Object.fromEntries(roundState.players.map((player) => [player.id, null])),
    missionStatusByPlayerId: Object.fromEntries(roundState.players.map((player) => [player.id, 'pending'])),
    publicPointDeltaByPlayerId: Object.fromEntries(roundState.players.map((player) => [player.id, 0])),
    publicCardResolutionsByCardId: {},
    publicCardResolutionNotes: 'Pending public card resolution.',
  }

  return {
    ...roundState,
    holeCards,
    holePowerUps,
    holeResults,
    holeUxMetrics: markHoleStartedAt(roundState.holeUxMetrics, currentHoleIndex, startedAtMs),
    deckMemory: buildDeckMemoryFromHoleCards(holeCards),
  }
}
