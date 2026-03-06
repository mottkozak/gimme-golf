import type { HoleCardsState, HoleResultState, Player, PlayerTotals, RoundState } from '../types/game.ts'

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

function getSelectedCardPointsForPlayer(
  holeCards: HoleCardsState | undefined,
  playerId: string,
): number {
  if (!holeCards) {
    return 0
  }

  const selectedCardId = holeCards.selectedCardIdByPlayerId[playerId]
  if (!selectedCardId) {
    return 0
  }

  const dealtCards = holeCards.dealtPersonalCardsByPlayerId[playerId] ?? []
  const selectedCard = dealtCards.find((card) => card.id === selectedCardId)

  return selectedCard?.points ?? 0
}

export function calculatePlayerHoleGamePoints(
  playerId: string,
  holeCards: HoleCardsState | undefined,
  holeResult: HoleResultState | undefined,
): number {
  if (!holeResult) {
    return 0
  }

  const missionStatus = holeResult.missionStatusByPlayerId[playerId]
  const missionPoints =
    missionStatus === 'success' ? getSelectedCardPointsForPlayer(holeCards, playerId) : 0
  const publicDelta = holeResult.publicPointDeltaByPlayerId?.[playerId] ?? 0

  return missionPoints + publicDelta
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
  holeCards: HoleCardsState[],
  holeResults: HoleResultState[],
): number {
  return holeResults.reduce((total, holeResult, index) => {
    return total + calculatePlayerHoleGamePoints(playerId, holeCards[index], holeResult)
  }, 0)
}

export function calculateRoundTotalsByPlayerId(
  players: Player[],
  holeCards: HoleCardsState[],
  holeResults: HoleResultState[],
): Record<string, PlayerTotals> {
  return Object.fromEntries(
    players.map((player) => {
      const realScore = calculatePlayerRealScore(player.id, holeResults)
      const gamePoints = calculatePlayerGamePoints(player.id, holeCards, holeResults)

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

export function recalculateRoundTotals(roundState: RoundState): RoundState {
  const normalizedHoleResults = normalizeHoleResults(roundState.players, roundState.holeResults)

  return {
    ...roundState,
    holeResults: normalizedHoleResults,
    totalsByPlayerId: calculateRoundTotalsByPlayerId(
      roundState.players,
      roundState.holeCards,
      normalizedHoleResults,
    ),
  }
}
