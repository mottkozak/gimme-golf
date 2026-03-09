import type {
  HoleCardsState,
  HolePowerUpState,
  HoleResultState,
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

interface RoundTotalsCacheEntry {
  playersRef: Player[]
  holesRef: RoundState['holes']
  holeCardsRef: HoleCardsState[]
  holeResultsRef: HoleResultState[]
  momentumEnabled: boolean
  totalsByPlayerId: Record<string, PlayerTotals>
}

let roundTotalsCache: RoundTotalsCacheEntry | null = null

export function clearRoundTotalsCache(): void {
  roundTotalsCache = null
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

export function calculatePlayerHoleGamePoints(
  playerId: string,
  holeIndex: number,
  players: Player[],
  holes: RoundState['holes'],
  holeCards: HoleCardsState[],
  holeResults: HoleResultState[],
  momentumEnabled: boolean,
): number {
  return calculatePlayerHolePointBreakdown(
    playerId,
    holeIndex,
    players,
    holes,
    holeCards,
    holeResults,
    momentumEnabled,
  ).total
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

export function calculatePlayerGamePoints(
  playerId: string,
  players: Player[],
  holes: RoundState['holes'],
  holeCards: HoleCardsState[],
  holeResults: HoleResultState[],
  momentumEnabled: boolean,
): number {
  const breakdownsByPlayerId = buildHolePointBreakdownsByPlayerId(
    players,
    holes,
    holeCards,
    holeResults,
    momentumEnabled,
  )

  return (breakdownsByPlayerId[playerId] ?? []).reduce((total, breakdown) => total + breakdown.total, 0)
}

export function calculateRoundTotalsByPlayerId(
  players: Player[],
  holes: RoundState['holes'],
  holeCards: HoleCardsState[],
  holeResults: HoleResultState[],
  momentumEnabled: boolean,
): Record<string, PlayerTotals> {
  const cached =
    roundTotalsCache &&
    roundTotalsCache.playersRef === players &&
    roundTotalsCache.holesRef === holes &&
    roundTotalsCache.holeCardsRef === holeCards &&
    roundTotalsCache.holeResultsRef === holeResults &&
    roundTotalsCache.momentumEnabled === momentumEnabled
      ? roundTotalsCache
      : null

  if (cached) {
    return cached.totalsByPlayerId
  }

  const breakdownsByPlayerId = buildHolePointBreakdownsByPlayerId(
    players,
    holes,
    holeCards,
    holeResults,
    momentumEnabled,
  )

  const totalsByPlayerId = Object.fromEntries(
    players.map((player) => {
      const realScore = calculatePlayerRealScore(player.id, holeResults)
      const gamePoints = (breakdownsByPlayerId[player.id] ?? []).reduce(
        (total, breakdown) => total + breakdown.total,
        0,
      )

      return [player.id, createPlayerTotals(realScore, gamePoints)]
    }),
  )

  roundTotalsCache = {
    playersRef: players,
    holesRef: holes,
    holeCardsRef: holeCards,
    holeResultsRef: holeResults,
    momentumEnabled,
    totalsByPlayerId,
  }

  return totalsByPlayerId
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
      usedPowerUpByPlayerId: Object.fromEntries(
        players.map((player) => [
          player.id,
          existing.usedPowerUpByPlayerId?.[player.id] ?? false,
        ]),
      ),
    }
  })
}

export function recalculateRoundTotals(roundState: RoundState): RoundState {
  const normalizedHoleResults = normalizeHoleResults(roundState.players, roundState.holeResults)
  const normalizedHoleCards = normalizeHoleCards(roundState.players, roundState.holeCards)
  const normalizedHolePowerUps = normalizeHolePowerUps(
    roundState.players,
    roundState.holes,
    roundState.holePowerUps,
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
