import type { RoundState } from '../types/game.ts'

export type GolfScoreToParByPlayerId = Record<string, number | null>

export interface GolfScoreSummary {
  score: number | null
  playerIds: string[]
}

function getPlayedParForPlayer(
  playerId: string,
  roundState: Pick<RoundState, 'holes' | 'holeResults'>,
): number {
  return roundState.holeResults.reduce((total, holeResult, holeIndex) => {
    const strokes = holeResult?.strokesByPlayerId[playerId]
    if (typeof strokes !== 'number') {
      return total
    }

    const par = roundState.holes[holeIndex]?.par ?? 0
    return total + par
  }, 0)
}

export function buildGolfScoreToParByPlayerId(
  roundState: Pick<RoundState, 'players' | 'holes' | 'holeResults' | 'totalsByPlayerId'>,
): GolfScoreToParByPlayerId {
  return Object.fromEntries(
    roundState.players.map((player) => {
      const playedPar = getPlayedParForPlayer(player.id, roundState)
      if (playedPar === 0) {
        return [player.id, null]
      }

      const realScore = roundState.totalsByPlayerId[player.id]?.realScore ?? 0
      return [player.id, realScore - playedPar]
    }),
  )
}

export function getBestGolfScoreSummary(
  golfScoreToParByPlayerId: GolfScoreToParByPlayerId,
): GolfScoreSummary {
  const scoreEntries = Object.entries(golfScoreToParByPlayerId).filter(
    (entry): entry is [string, number] => typeof entry[1] === 'number',
  )

  if (scoreEntries.length === 0) {
    return {
      score: null,
      playerIds: [],
    }
  }

  const bestScore = scoreEntries.reduce((best, [, score]) => Math.min(best, score), scoreEntries[0][1])
  const bestPlayerIds = scoreEntries
    .filter(([, score]) => score === bestScore)
    .map(([playerId]) => playerId)

  return {
    score: bestScore,
    playerIds: bestPlayerIds,
  }
}

export function formatGolfScoreToPar(scoreToPar: number | null): string {
  if (typeof scoreToPar !== 'number') {
    return '—'
  }

  if (scoreToPar === 0) {
    return 'Even'
  }

  return `${scoreToPar > 0 ? '+' : ''}${scoreToPar}`
}

export function describeGolfScoreToPar(scoreToPar: number | null): string {
  if (typeof scoreToPar !== 'number') {
    return 'No strokes entered'
  }

  if (scoreToPar === 0) {
    return 'Level par'
  }

  if (scoreToPar < 0) {
    return `${Math.abs(scoreToPar)} under par`
  }

  return `${scoreToPar} over par`
}

export function getGolfScoreToneClass(
  scoreToPar: number | null,
): 'score-positive' | 'score-negative' | 'score-neutral' {
  if (typeof scoreToPar !== 'number' || scoreToPar === 0) {
    return 'score-neutral'
  }

  // Under par is favorable, so negative values get the positive tone.
  return scoreToPar < 0 ? 'score-positive' : 'score-negative'
}
