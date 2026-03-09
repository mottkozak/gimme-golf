import type {
  HoleCardsState,
  HolePowerUpState,
  HoleResultState,
  Player,
  PlayerTotals,
  RoundState,
} from '../types/game.ts'
import { normalizeRoundConfig } from './roundConfig.ts'
import { createEmptyHolePowerUpState } from './powerUps.ts'
import { getPlayerHolePointBreakdown, type HolePointBreakdown } from './streaks.ts'

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
  return getPlayerHolePointBreakdown(
    playerId,
    holeIndex,
    players,
    holes,
    holeCards,
    holeResults,
    momentumEnabled,
  )
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
  return holeResults.reduce((total, _holeResult, index) => {
    return (
      total +
      calculatePlayerHoleGamePoints(
        playerId,
        index,
        players,
        holes,
        holeCards,
        holeResults,
        momentumEnabled,
      )
    )
  }, 0)
}

export function calculateRoundTotalsByPlayerId(
  players: Player[],
  holes: RoundState['holes'],
  holeCards: HoleCardsState[],
  holeResults: HoleResultState[],
  momentumEnabled: boolean,
): Record<string, PlayerTotals> {
  return Object.fromEntries(
    players.map((player) => {
      const realScore = calculatePlayerRealScore(player.id, holeResults)
      const gamePoints = calculatePlayerGamePoints(
        player.id,
        players,
        holes,
        holeCards,
        holeResults,
        momentumEnabled,
      )

      return [player.id, createPlayerTotals(realScore, gamePoints)]
    }),
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

  return {
    ...roundState,
    config: normalizedConfig,
    holeCards: normalizedHoleCards,
    holePowerUps: normalizedHolePowerUps,
    holeResults: normalizedHoleResults,
    totalsByPlayerId: calculateRoundTotalsByPlayerId(
      roundState.players,
      roundState.holes,
      normalizedHoleCards,
      normalizedHoleResults,
      momentumEnabled,
    ),
  }
}
