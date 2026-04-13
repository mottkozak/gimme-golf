import { computeRoundAwards } from './awards.ts'
import { buildGolfScoreToParByPlayerId } from './golfScore.ts'
import {
  buildLeaderboardEntries,
  getAdjustedScoreLeaders,
  getRealScoreLeaders,
  type LeaderboardSortMode,
} from './leaderboard.ts'
import { formatPlayerNames } from './playerNames.ts'
import { computeRecapArchetypes, type RecapPlayerArchetype } from './recapArchetypes.ts'
import { buildConstrainedAwardCards, type RecapAwardCard } from './roundRecapAwards.ts'
import {
  buildProgressionCallouts,
  computeProgression,
  computeWinnerLateGain,
  formatSignedValue,
  getWinnerHeroSubtext,
  type RecapProgressionCallout,
  type RecapProgressionLine,
} from './roundRecapProgression.ts'
import type { RoundState } from '../types/game.ts'

export type RecapShareTheme = 'champion' | 'chaos' | 'comeback'

export interface RoundRecapWinnerHeroRow {
  playerId: string
  playerName: string
  gamePoints: number
  realScore: number
  adjustedScore: number
  golfToPar: number | null
  isWinner: boolean
}

export interface RoundRecapWinnerHeroSection {
  title: string
  subtext: string
  scoreboardRows: RoundRecapWinnerHeroRow[]
  fullTableRows: RoundRecapWinnerHeroRow[]
}

export type RoundRecapProgressionLine = RecapProgressionLine

export type RoundRecapProgressionCallout = RecapProgressionCallout

export interface RoundRecapProgressionSection {
  holes: number[]
  lines: RoundRecapProgressionLine[]
  leaderByHole: Array<string | null>
  callouts: RoundRecapProgressionCallout[]
  postAnimationInsight: string
}

export type RoundRecapAwardCard = RecapAwardCard

export interface RoundRecapAwardsSection {
  cards: RoundRecapAwardCard[]
}

export interface RoundRecapViewModel {
  winnerHero: RoundRecapWinnerHeroSection
  progression: RoundRecapProgressionSection
  archetypes: RecapPlayerArchetype[]
  awards: RoundRecapAwardsSection
  /** Set when exactly one player has the lowest adjusted score (game-points progression callouts). */
  winnerPlayerId: string | null
  /** Every player tied for lowest adjusted score (co-champions). */
  adjustedWinnerPlayerIds: string[]
  awardsSummary: ReturnType<typeof computeRoundAwards>
}

export function buildRoundRecapViewModel(roundState: RoundState): RoundRecapViewModel {
  const awardsSummary = computeRoundAwards(roundState)
  const winnerSortMode: LeaderboardSortMode =
    roundState.config.gameMode === 'powerUps' ? 'realScore' : 'adjustedScore'

  const leaderboardRows = buildLeaderboardEntries(
    roundState.players,
    roundState.totalsByPlayerId,
    winnerSortMode,
  )
  const adjustedLeaders =
    winnerSortMode === 'realScore'
      ? getRealScoreLeaders(leaderboardRows)
      : getAdjustedScoreLeaders(leaderboardRows)
  const winnerPlayerId = adjustedLeaders.length === 1 ? adjustedLeaders[0]!.playerId : null
  const adjustedWinnerPlayerIds = adjustedLeaders.map((row) => row.playerId)
  const winnerNames =
    adjustedLeaders.length > 0 ? formatPlayerNames(adjustedLeaders.map((row) => row.playerName)) : 'No winner'
  const golfScoreToParByPlayerId = buildGolfScoreToParByPlayerId(roundState)
  const progressionComputation = computeProgression(roundState, winnerPlayerId)
  const finalHoleIndex = Math.max(0, progressionComputation.holes.length - 1)
  const sortedFinalPoints = progressionComputation.lines
    .map((line) => line.cumulativePointsByHole[finalHoleIndex] ?? 0)
    .sort((left, right) => right - left)
  const winnerFinalLead = (sortedFinalPoints[0] ?? 0) - (sortedFinalPoints[1] ?? 0)
  const winnerSubtext =
    adjustedLeaders.length > 1
      ? winnerSortMode === 'realScore'
        ? 'Tied at the top on actual score.'
        : 'Tied at the top on adjusted score.'
      : getWinnerHeroSubtext(winnerPlayerId, progressionComputation.leaderByHole, winnerFinalLead)
  const progressionCallouts = buildProgressionCallouts(progressionComputation, winnerPlayerId)
  const winnerLateGainData = computeWinnerLateGain(progressionComputation, winnerPlayerId)

  const fullTableRows = leaderboardRows.map((row) => ({
    playerId: row.playerId,
    playerName: row.playerName,
    gamePoints: row.gamePoints,
    realScore: row.realScore,
    adjustedScore: row.adjustedScore,
    golfToPar: golfScoreToParByPlayerId[row.playerId] ?? null,
    isWinner: adjustedWinnerPlayerIds.includes(row.playerId),
  }))

  const winVerb = adjustedLeaders.length === 1 ? 'Wins' : 'Win'

  return {
    winnerHero: {
      title: adjustedLeaders.length > 0 ? `${winnerNames} ${winVerb} the Round` : 'Round Complete',
      subtext: winnerSubtext,
      scoreboardRows: fullTableRows.slice(0, 4),
      fullTableRows,
    },
    progression: {
      holes: progressionComputation.holes,
      lines: progressionComputation.lines,
      leaderByHole: progressionComputation.leaderByHole,
      callouts: progressionCallouts,
      postAnimationInsight: winnerLateGainData.winnerLine
        ? `${winnerLateGainData.winnerLine.playerName} gained ${formatSignedValue(winnerLateGainData.winnerLateGain)} over the final ${winnerLateGainData.lateWindow} holes.`
        : 'Round stayed close to the finish.',
    },
    archetypes: computeRecapArchetypes(awardsSummary.statsByPlayerId),
    awards: {
      cards: buildConstrainedAwardCards(awardsSummary),
    },
    winnerPlayerId,
    adjustedWinnerPlayerIds,
    awardsSummary,
  }
}
