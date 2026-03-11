import type {
  HoleCardsState,
  HolePowerUpState,
  HoleResultState,
  HoleUxMetrics,
  Player,
  PlayerTotals,
  RoundState,
} from '../types/game.ts'
import { buildDeckMemoryFromHoleCards } from './dealCards.ts'
import { normalizeRoundConfig } from './roundConfig.ts'
import { createEmptyHolePowerUpState } from './powerUps.ts'
import {
  buildHolePointBreakdownsByPlayerId,
  createEmptyHolePointBreakdown,
  type HolePointBreakdown,
} from './streaks.ts'
import { buildHoleUxMetrics } from './uxMetrics.ts'
import { createRefMemoizedSelector } from './selectors.ts'

export function clearRoundTotalsCache(): void {
  roundTotalsByPlayerIdSelector.clear()
}

export function calculateAdjustedScore(realScore: number, gamePoints: number): number {
  return realScore - gamePoints
}

export function createPlayerTotals(realScore: number, gamePoints: number): PlayerTotals {
  return {
    realScore,
    gamePoints,
    adjustedScore: calculateAdjustedScore(realScore, gamePoints),
  }
}

export function calculatePlayerHolePointBreakdown(
  playerId: string,
  holeIndex: number,
  players: Player[],
  holes: RoundState['holes'],
  holeCards: HoleCardsState[],
  holeResults: HoleResultState[],
  momentumEnabled: boolean,
): HolePointBreakdown {
  const breakdownsByPlayerId = buildHolePointBreakdownsByPlayerId(
    players,
    holes,
    holeCards,
    holeResults,
    momentumEnabled,
  )

  return breakdownsByPlayerId[playerId]?.[holeIndex] ?? createEmptyHolePointBreakdown()
}

export function calculatePlayerRealScore(
  playerId: string,
  holeResults: HoleResultState[],
): number {
  return holeResults.reduce((total, holeResult) => {
    const strokes = holeResult.strokesByPlayerId[playerId]
    if (typeof strokes !== 'number') {
      return total
    }

    // Real golf strokes are sourced only from entered strokes and are never modified by card effects.
    return total + strokes
  }, 0)
}

const roundTotalsByPlayerIdSelector = createRefMemoizedSelector(
  (
    players: Player[],
    holes: RoundState['holes'],
    holeCards: HoleCardsState[],
    holeResults: HoleResultState[],
    momentumEnabled: boolean,
  ): Record<string, PlayerTotals> => {
    const breakdownsByPlayerId = buildHolePointBreakdownsByPlayerId(
      players,
      holes,
      holeCards,
      holeResults,
      momentumEnabled,
    )

    return Object.fromEntries(
      players.map((player) => {
        const realScore = calculatePlayerRealScore(player.id, holeResults)
        const gamePoints = (breakdownsByPlayerId[player.id] ?? []).reduce(
          (total, breakdown) => total + breakdown.total,
          0,
        )

        return [player.id, createPlayerTotals(realScore, gamePoints)]
      }),
    )
  },
)

export function calculateRoundTotalsByPlayerId(
  players: Player[],
  holes: RoundState['holes'],
  holeCards: HoleCardsState[],
  holeResults: HoleResultState[],
  momentumEnabled: boolean,
): Record<string, PlayerTotals> {
  return roundTotalsByPlayerIdSelector(
    players,
    holes,
    holeCards,
    holeResults,
    momentumEnabled,
  )
}

function normalizeHoleResults(
  players: Player[],
  holeResults: HoleResultState[],
): HoleResultState[] {
  return holeResults.map((holeResult) => ({
    ...holeResult,
    publicPointDeltaByPlayerId: Object.fromEntries(
      players.map((player) => [player.id, holeResult.publicPointDeltaByPlayerId?.[player.id] ?? 0]),
    ),
    publicCardResolutionsByCardId: holeResult.publicCardResolutionsByCardId ?? {},
  }))
}

function normalizeHoleCards(
  players: Player[],
  holeCards: HoleCardsState[],
): HoleCardsState[] {
  return holeCards.map((holeCardsState) => ({
    ...holeCardsState,
    dealtPersonalCardsByPlayerId: Object.fromEntries(
      players.map((player) => [player.id, holeCardsState.dealtPersonalCardsByPlayerId?.[player.id] ?? []]),
    ),
    selectedCardIdByPlayerId: Object.fromEntries(
      players.map((player) => [player.id, holeCardsState.selectedCardIdByPlayerId?.[player.id] ?? null]),
    ),
    personalCardOfferByPlayerId: Object.fromEntries(
      players.map((player) => {
        const existingOffer = holeCardsState.personalCardOfferByPlayerId?.[player.id]
        return [
          player.id,
          {
            safeCardId: existingOffer?.safeCardId ?? null,
            hardCardId: existingOffer?.hardCardId ?? null,
          },
        ]
      }),
    ),
    publicCards: holeCardsState.publicCards ?? [],
  }))
}

function normalizeHolePowerUps(
  players: Player[],
  holes: RoundState['holes'],
  holePowerUps: HolePowerUpState[] | undefined,
): HolePowerUpState[] {
  return holes.map((hole, holeIndex) => {
    const existing = holePowerUps?.[holeIndex] ?? createEmptyHolePowerUpState(players, hole.holeNumber)
    return {
      holeNumber: hole.holeNumber,
      assignedPowerUpIdByPlayerId: Object.fromEntries(
        players.map((player) => [
          player.id,
          existing.assignedPowerUpIdByPlayerId?.[player.id] ?? null,
        ]),
      ),
      assignedCurseIdByPlayerId: Object.fromEntries(
        players.map((player) => [
          player.id,
          existing.assignedCurseIdByPlayerId?.[player.id] ?? null,
        ]),
      ),
      usedPowerUpByPlayerId: Object.fromEntries(
        players.map((player) => [
          player.id,
          existing.usedPowerUpByPlayerId?.[player.id] ?? false,
        ]),
      ),
    }
  })
}

function normalizeHoleUxMetrics(
  holes: RoundState['holes'],
  holeUxMetrics: HoleUxMetrics[] | undefined,
): HoleUxMetrics[] {
  return buildHoleUxMetrics(holes, holeUxMetrics)
}

export function recalculateRoundTotals(roundState: RoundState): RoundState {
  const normalizedHoleResults = normalizeHoleResults(roundState.players, roundState.holeResults)
  const normalizedHoleCards = normalizeHoleCards(roundState.players, roundState.holeCards)
  const normalizedHolePowerUps = normalizeHolePowerUps(
    roundState.players,
    roundState.holes,
    roundState.holePowerUps,
  )
  const normalizedHoleUxMetrics = normalizeHoleUxMetrics(
    roundState.holes,
    roundState.holeUxMetrics,
  )
  const normalizedConfig = normalizeRoundConfig(roundState.config)
  const momentumEnabled = normalizedConfig.toggles.momentumBonuses
  const normalizedDeckMemory = buildDeckMemoryFromHoleCards(normalizedHoleCards)

  return {
    ...roundState,
    config: normalizedConfig,
    holeCards: normalizedHoleCards,
    holePowerUps: normalizedHolePowerUps,
    holeResults: normalizedHoleResults,
    holeUxMetrics: normalizedHoleUxMetrics,
    deckMemory: normalizedDeckMemory,
    totalsByPlayerId: calculateRoundTotalsByPlayerId(
      roundState.players,
      roundState.holes,
      normalizedHoleCards,
      normalizedHoleResults,
      momentumEnabled,
    ),
  }
}
