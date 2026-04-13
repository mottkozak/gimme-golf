import { getDisplayPlayerName } from './playerNames.ts'
import type { LeaderboardEntry, Player, PlayerTotals } from '../types/game.ts'

export type LeaderboardSortMode = 'adjustedScore' | 'realScore' | 'gamePoints'

export function compareEntriesByUnifiedScore(entryA: LeaderboardEntry, entryB: LeaderboardEntry): number {
  if (entryA.adjustedScore !== entryB.adjustedScore) {
    return entryA.adjustedScore - entryB.adjustedScore
  }

  if (entryA.realScore !== entryB.realScore) {
    return entryA.realScore - entryB.realScore
  }

  if (entryA.gamePoints !== entryB.gamePoints) {
    return entryB.gamePoints - entryA.gamePoints
  }

  return entryA.playerName.localeCompare(entryB.playerName)
}

export function hasSameUnifiedScore(entryA: LeaderboardEntry, entryB: LeaderboardEntry): boolean {
  return (
    entryA.adjustedScore === entryB.adjustedScore &&
    entryA.realScore === entryB.realScore &&
    entryA.gamePoints === entryB.gamePoints
  )
}

export function getUnifiedLeaders(rows: LeaderboardEntry[]): LeaderboardEntry[] {
  if (rows.length === 0) {
    return []
  }

  const sortedRows = [...rows].sort(compareEntriesByUnifiedScore)
  const leader = sortedRows[0]
  if (!leader) {
    return []
  }

  return sortedRows.filter((row) => hasSameUnifiedScore(row, leader))
}

/** All entries tied for the lowest adjusted score (round winner(s) on adjusted). */
export function getAdjustedScoreLeaders(rows: LeaderboardEntry[]): LeaderboardEntry[] {
  if (rows.length === 0) {
    return []
  }

  const minAdjusted = Math.min(...rows.map((row) => row.adjustedScore))
  return rows.filter((row) => row.adjustedScore === minAdjusted)
}

/** All entries tied for the lowest real score (round winner(s) on actual strokes). */
export function getRealScoreLeaders(rows: LeaderboardEntry[]): LeaderboardEntry[] {
  if (rows.length === 0) {
    return []
  }

  const minReal = Math.min(...rows.map((row) => row.realScore))
  return rows.filter((row) => row.realScore === minReal)
}

function sortEntriesByMode(
  entryA: LeaderboardEntry,
  entryB: LeaderboardEntry,
  sortMode: LeaderboardSortMode,
): number {
  if (sortMode === 'gamePoints') {
    if (entryA.gamePoints !== entryB.gamePoints) {
      return entryB.gamePoints - entryA.gamePoints
    }
    return compareEntriesByUnifiedScore(entryA, entryB)
  }

  if (sortMode === 'realScore') {
    if (entryA.realScore !== entryB.realScore) {
      return entryA.realScore - entryB.realScore
    }
    return compareEntriesByUnifiedScore(entryA, entryB)
  }

  return compareEntriesByUnifiedScore(entryA, entryB)
}

export function buildLeaderboardEntries(
  players: Player[],
  totalsByPlayerId: Record<string, PlayerTotals>,
  sortMode: LeaderboardSortMode = 'adjustedScore',
): LeaderboardEntry[] {
  return players
    .map((player, index) => {
      const totals = totalsByPlayerId[player.id]
      return {
        playerId: player.id,
        playerName: getDisplayPlayerName(player.name, index),
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
