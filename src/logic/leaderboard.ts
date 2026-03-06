import type { LeaderboardEntry, Player, PlayerTotals } from '../types/game.ts'

export type LeaderboardSortMode = 'adjustedScore' | 'realScore' | 'gamePoints'

function sortEntriesByMode(
  entryA: LeaderboardEntry,
  entryB: LeaderboardEntry,
  sortMode: LeaderboardSortMode,
): number {
  if (sortMode === 'gamePoints') {
    if (entryA.gamePoints !== entryB.gamePoints) {
      return entryB.gamePoints - entryA.gamePoints
    }
    return entryA.realScore - entryB.realScore
  }

  if (sortMode === 'realScore') {
    if (entryA.realScore !== entryB.realScore) {
      return entryA.realScore - entryB.realScore
    }
    return entryB.gamePoints - entryA.gamePoints
  }

  if (entryA.adjustedScore !== entryB.adjustedScore) {
    return entryA.adjustedScore - entryB.adjustedScore
  }

  return entryA.realScore - entryB.realScore
}

export function buildLeaderboardEntries(
  players: Player[],
  totalsByPlayerId: Record<string, PlayerTotals>,
  sortMode: LeaderboardSortMode = 'adjustedScore',
): LeaderboardEntry[] {
  return players
    .map((player) => {
      const totals = totalsByPlayerId[player.id]
      return {
        playerId: player.id,
        playerName: player.name,
        realScore: totals?.realScore ?? 0,
        gamePoints: totals?.gamePoints ?? 0,
        adjustedScore: totals?.adjustedScore ?? 0,
      }
    })
    .sort((entryA, entryB) => sortEntriesByMode(entryA, entryB, sortMode))
}

export function getLeaderboardLeader(
  rows: LeaderboardEntry[],
  sortMode: LeaderboardSortMode,
): LeaderboardEntry | null {
  if (rows.length === 0) {
    return null
  }

  const [leader] = [...rows].sort((entryA, entryB) => sortEntriesByMode(entryA, entryB, sortMode))
  return leader
}
