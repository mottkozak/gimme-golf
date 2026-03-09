import { AWARD_DEFINITION_BY_ID, type AwardId } from '../data/awards.ts'
import type { PersonalCardType } from '../types/cards.ts'
import type { RoundState } from '../types/game.ts'
import { buildHolePointBreakdownsByPlayerId } from './streaks.ts'

const HIGH_VALUE_CARD_POINTS_THRESHOLD = 3

interface AwardWinner {
  playerId: string
  playerName: string
}

interface AwardParticipant {
  id: string
  name: string
}

export interface AwardResult {
  awardId: AwardId
  awardName: string
  shortLabel: string
  winners: AwardWinner[]
  explanation: string
  supportingStat: string
  isTie: boolean
}

export interface PlayerRoundStats {
  playerId: string
  playerName: string
  missionsCompleted: number
  missionsFailed: number
  totalGamePoints: number
  totalRealScore: number
  totalAdjustedScore: number
  hardCardsChosen: number
  hardCardsCompleted: number
  hardCardsFailed: number
  riskCardsChosen: number
  longestStreak: number
  momentumBonusesEarned: number
  momentumSuccesses: number
  publicCardPointsGained: number
  publicCardPointsLost: number
  publicImpactMagnitude: number
  curseCardsFaced: number
  curseCardsSurvived: number
  totalPotentialPointsFromChosenCards: number
  totalActualCardPointsEarned: number
  totalActualPointsEarned: number
  potentialPointsLeftOnTable: number
  highValueCardsChosen: number
  highValueCardsFailed: number
  hardOfferSelections: number
  safeOfferSelections: number
  leaderboardPositionByHole: number[]
  pointDeficitByHole: number[]
  positionImprovement: number
  pointDeficitRecovered: number
  lateRoundPoints: number
}

export interface RoundAwardsSummary {
  awards: AwardResult[]
  statsByPlayerId: Record<string, PlayerRoundStats>
  roundPersonalityLine: string
}

function formatNames(names: string[]): string {
  if (names.length <= 1) {
    return names[0] ?? '-'
  }

  if (names.length === 2) {
    return `${names[0]} & ${names[1]}`
  }

  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`
}

function isHardChoice(
  cardType: PersonalCardType | null,
  cardDifficulty: string | null,
  cardPoints: number,
): boolean {
  if (cardDifficulty === 'hard') {
    return true
  }

  if (cardPoints >= HIGH_VALUE_CARD_POINTS_THRESHOLD) {
    return true
  }

  return (
    cardType === 'risk' ||
    cardType === 'curse' ||
    cardType === 'novelty' ||
    cardType === 'hybrid'
  )
}

function getPlayerById(
  participants: AwardParticipant[],
  playerId: string,
): AwardParticipant | undefined {
  return participants.find((participant) => participant.id === playerId)
}

function toAwardParticipants(
  statsByPlayerId: Record<string, PlayerRoundStats>,
): AwardParticipant[] {
  return Object.values(statsByPlayerId).map((stats) => ({
    id: stats.playerId,
    name: stats.playerName,
  }))
}

function rankPlayersByGamePoints(
  players: AwardParticipant[],
  cumulativeGamePointsByPlayerId: Record<string, number>,
): Record<string, number> {
  const uniqueScores = Array.from(
    new Set(players.map((player) => cumulativeGamePointsByPlayerId[player.id] ?? 0)),
  ).sort((scoreA, scoreB) => scoreB - scoreA)

  return Object.fromEntries(
    players.map((player) => {
      const playerScore = cumulativeGamePointsByPlayerId[player.id] ?? 0
      const rank = uniqueScores.findIndex((score) => score === playerScore) + 1
      return [player.id, rank]
    }),
  )
}

function getTopWinnersByScore(
  participants: AwardParticipant[],
  scoreByPlayerId: Record<string, number>,
  fallbackByPlayerId?: Record<string, number>,
): AwardWinner[] {
  const values = participants.map((participant) => ({
    playerId: participant.id,
    score: scoreByPlayerId[participant.id] ?? 0,
    fallback: fallbackByPlayerId?.[participant.id] ?? 0,
  }))
  const maxScore = Math.max(...values.map((value) => value.score))
  const scoreWinners = values.filter((value) => value.score === maxScore)

  if (scoreWinners.length === 1) {
    const winner = scoreWinners[0]
    const winnerPlayer = getPlayerById(participants, winner.playerId)
    return [
      {
        playerId: winner.playerId,
        playerName: winnerPlayer?.name ?? winner.playerId,
      },
    ]
  }

  if (fallbackByPlayerId) {
    const maxFallback = Math.max(...scoreWinners.map((winner) => winner.fallback))
    const fallbackWinners = scoreWinners.filter((winner) => winner.fallback === maxFallback)
    if (fallbackWinners.length === 1) {
      const winner = fallbackWinners[0]
      const winnerPlayer = getPlayerById(participants, winner.playerId)
      return [
        {
          playerId: winner.playerId,
          playerName: winnerPlayer?.name ?? winner.playerId,
        },
      ]
    }
  }

  return scoreWinners.map((winner) => {
    const player = getPlayerById(participants, winner.playerId)
    return {
      playerId: winner.playerId,
      playerName: player?.name ?? winner.playerId,
    }
  })
}

function createAwardResult(
  awardId: AwardId,
  winners: AwardWinner[],
  explanation: string,
  supportingStat: string,
): AwardResult {
  const definition = AWARD_DEFINITION_BY_ID[awardId]

  return {
    awardId,
    awardName: definition.name,
    shortLabel: definition.shortLabel,
    winners,
    explanation,
    supportingStat,
    isTie: winners.length > 1,
  }
}

function buildPlayerRoundStats(roundState: RoundState): Record<string, PlayerRoundStats> {
  const momentumEnabled = roundState.config.toggles.momentumBonuses
  const breakdownsByPlayerId = buildHolePointBreakdownsByPlayerId(
    roundState.players,
    roundState.holes,
    roundState.holeCards,
    roundState.holeResults,
    momentumEnabled,
  )

  const statsByPlayerId: Record<string, PlayerRoundStats> = Object.fromEntries(
    roundState.players.map((player) => {
      const totals = roundState.totalsByPlayerId[player.id]
      return [
        player.id,
        {
          playerId: player.id,
          playerName: player.name,
          missionsCompleted: 0,
          missionsFailed: 0,
          totalGamePoints: totals?.gamePoints ?? 0,
          totalRealScore: totals?.realScore ?? 0,
          totalAdjustedScore: totals?.adjustedScore ?? 0,
          hardCardsChosen: 0,
          hardCardsCompleted: 0,
          hardCardsFailed: 0,
          riskCardsChosen: 0,
          longestStreak: 0,
          momentumBonusesEarned: 0,
          momentumSuccesses: 0,
          publicCardPointsGained: 0,
          publicCardPointsLost: 0,
          publicImpactMagnitude: 0,
          curseCardsFaced: 0,
          curseCardsSurvived: 0,
          totalPotentialPointsFromChosenCards: 0,
          totalActualCardPointsEarned: 0,
          totalActualPointsEarned: 0,
          potentialPointsLeftOnTable: 0,
          highValueCardsChosen: 0,
          highValueCardsFailed: 0,
          hardOfferSelections: 0,
          safeOfferSelections: 0,
          leaderboardPositionByHole: [],
          pointDeficitByHole: [],
          positionImprovement: 0,
          pointDeficitRecovered: 0,
          lateRoundPoints: 0,
        },
      ]
    }),
  )

  const holeCount = Math.max(roundState.holeCards.length, roundState.holeResults.length)
  const cumulativeGamePointsByPlayerId = Object.fromEntries(
    roundState.players.map((player) => [player.id, 0]),
  )

  for (let holeIndex = 0; holeIndex < holeCount; holeIndex += 1) {
    for (const player of roundState.players) {
      const stats = statsByPlayerId[player.id]
      const breakdown = breakdownsByPlayerId[player.id]?.[holeIndex]
      if (!breakdown) {
        continue
      }

      const selectedCardPoints = breakdown.selectedCardPoints ?? 0

      if (breakdown.missionStatus === 'success') {
        stats.missionsCompleted += 1
      } else if (breakdown.missionStatus === 'failed') {
        stats.missionsFailed += 1
      }

      if (breakdown.selectedCardId) {
        stats.totalPotentialPointsFromChosenCards += selectedCardPoints
        stats.totalActualCardPointsEarned += breakdown.baseMissionPoints

        if (selectedCardPoints >= HIGH_VALUE_CARD_POINTS_THRESHOLD) {
          stats.highValueCardsChosen += 1
          if (breakdown.missionStatus === 'failed') {
            stats.highValueCardsFailed += 1
          }
        }

        if (isHardChoice(breakdown.selectedCardType, breakdown.selectedCardDifficulty, selectedCardPoints)) {
          stats.hardCardsChosen += 1
          if (breakdown.missionStatus === 'success') {
            stats.hardCardsCompleted += 1
          } else if (breakdown.missionStatus === 'failed') {
            stats.hardCardsFailed += 1
          }
        }

        if (breakdown.selectedCardType === 'risk') {
          stats.riskCardsChosen += 1
        }

        if (breakdown.selectedCardType === 'curse') {
          stats.curseCardsFaced += 1
          if (breakdown.missionStatus === 'success') {
            stats.curseCardsSurvived += 1
          }
        }
      }

      const offerState = roundState.holeCards[holeIndex]?.personalCardOfferByPlayerId[player.id]
      const selectedCardId = roundState.holeCards[holeIndex]?.selectedCardIdByPlayerId[player.id]
      if (offerState?.hardCardId && selectedCardId === offerState.hardCardId) {
        stats.hardOfferSelections += 1
      }
      if (offerState?.safeCardId && selectedCardId === offerState.safeCardId) {
        stats.safeOfferSelections += 1
      }

      if (breakdown.publicDelta > 0) {
        stats.publicCardPointsGained += breakdown.publicDelta
      } else if (breakdown.publicDelta < 0) {
        stats.publicCardPointsLost += Math.abs(breakdown.publicDelta)
      }

      stats.publicImpactMagnitude += Math.abs(breakdown.publicDelta)
      stats.totalActualPointsEarned += breakdown.total
      stats.momentumBonusesEarned += Math.max(0, breakdown.momentumBonus)
      if (breakdown.missionStatus === 'success' && breakdown.momentumBonus > 0) {
        stats.momentumSuccesses += 1
      }

      stats.longestStreak = Math.max(stats.longestStreak, breakdown.streakAfter)
      stats.potentialPointsLeftOnTable =
        stats.totalPotentialPointsFromChosenCards - stats.totalActualCardPointsEarned

      cumulativeGamePointsByPlayerId[player.id] += breakdown.total
    }

    const rankByPlayerId = rankPlayersByGamePoints(roundState.players, cumulativeGamePointsByPlayerId)
    const holeLeaderPoints = Math.max(
      ...roundState.players.map((player) => cumulativeGamePointsByPlayerId[player.id] ?? 0),
    )

    for (const player of roundState.players) {
      const stats = statsByPlayerId[player.id]
      const playerPoints = cumulativeGamePointsByPlayerId[player.id] ?? 0
      stats.leaderboardPositionByHole.push(rankByPlayerId[player.id] ?? roundState.players.length)
      stats.pointDeficitByHole.push(holeLeaderPoints - playerPoints)
    }
  }

  const lateRoundStartIndex = Math.max(0, holeCount - Math.max(3, Math.ceil(holeCount / 3)))
  for (const player of roundState.players) {
    const stats = statsByPlayerId[player.id]
    const holeBreakdowns = breakdownsByPlayerId[player.id] ?? []
    const firstRank = stats.leaderboardPositionByHole[0] ?? roundState.players.length
    const lastRank =
      stats.leaderboardPositionByHole[stats.leaderboardPositionByHole.length - 1] ??
      firstRank
    stats.positionImprovement = firstRank - lastRank

    const firstDeficit = stats.pointDeficitByHole[0] ?? 0
    const lastDeficit = stats.pointDeficitByHole[stats.pointDeficitByHole.length - 1] ?? 0
    stats.pointDeficitRecovered = firstDeficit - lastDeficit

    stats.lateRoundPoints = holeBreakdowns
      .slice(lateRoundStartIndex)
      .reduce((total, breakdown) => total + breakdown.total, 0)
  }

  return statsByPlayerId
}

function buildMvpAward(statsByPlayerId: Record<string, PlayerRoundStats>): {
  winners: AwardWinner[]
  explanation: string
  supportingStat: string
} {
  const players = Object.values(statsByPlayerId)
  const participants = toAwardParticipants(statsByPlayerId)
  const scoreByPlayerId = Object.fromEntries(
    players.map((stats) => [
      stats.playerId,
      stats.totalGamePoints * 10 +
        stats.missionsCompleted * 3 +
        stats.hardCardsCompleted * 4 +
        stats.momentumBonusesEarned * 2,
    ]),
  )
  const winners = getTopWinnersByScore(
    participants,
    scoreByPlayerId,
    Object.fromEntries(players.map((stats) => [stats.playerId, stats.totalGamePoints])),
  )
  const winnerStats = winners.map((winner) => statsByPlayerId[winner.playerId])

  return {
    winners,
    explanation: `${formatNames(winners.map((winner) => winner.playerName))} drove the strongest all-around side-game round.`,
    supportingStat: `${winnerStats.map((stats) => stats.totalGamePoints).join(', ')} game points`,
  }
}

function buildChaosAgentAward(statsByPlayerId: Record<string, PlayerRoundStats>) {
  const players = Object.values(statsByPlayerId)
  const participants = toAwardParticipants(statsByPlayerId)
  const scoreByPlayerId = Object.fromEntries(
    players.map((stats) => [stats.playerId, stats.publicImpactMagnitude * 2 + stats.publicCardPointsGained]),
  )
  const fallbackByPlayerId = Object.fromEntries(
    players.map((stats) => [stats.playerId, stats.publicCardPointsGained]),
  )
  const winners = getTopWinnersByScore(participants, scoreByPlayerId, fallbackByPlayerId)
  const winnerStats = winners.map((winner) => statsByPlayerId[winner.playerId])
  const swingValue = winnerStats.reduce(
    (maxValue, stats) => Math.max(maxValue, stats.publicImpactMagnitude),
    0,
  )

  return createAwardResult(
    'chaosAgent',
    winners,
    `${formatNames(winners.map((winner) => winner.playerName))} produced the biggest public-card swings.`,
    `Public swing impact ${swingValue}`,
  )
}

function buildMostClutchAward(statsByPlayerId: Record<string, PlayerRoundStats>) {
  const players = Object.values(statsByPlayerId)
  const participants = toAwardParticipants(statsByPlayerId)
  const scoreByPlayerId = Object.fromEntries(
    players.map((stats) => [
      stats.playerId,
      stats.hardCardsCompleted * 4 +
        stats.momentumSuccesses * 3 +
        Math.max(0, stats.lateRoundPoints) * 2,
    ]),
  )
  const fallbackByPlayerId = Object.fromEntries(
    players.map((stats) => [stats.playerId, stats.missionsCompleted]),
  )
  const winners = getTopWinnersByScore(participants, scoreByPlayerId, fallbackByPlayerId)
  const winnerStats = winners.map((winner) => statsByPlayerId[winner.playerId])
  const hardCloses = winnerStats.reduce((maxValue, stats) => Math.max(maxValue, stats.hardCardsCompleted), 0)

  return createAwardResult(
    'mostClutch',
    winners,
    `${formatNames(winners.map((winner) => winner.playerName))} delivered in tough spots and late-hole pressure.`,
    `${hardCloses} hard cards completed`,
  )
}

function buildMostCursedAward(statsByPlayerId: Record<string, PlayerRoundStats>) {
  const players = Object.values(statsByPlayerId)
  const anyCurseSeen = players.some((stats) => stats.curseCardsFaced > 0)
  const participants = toAwardParticipants(statsByPlayerId)

  const scoreByPlayerId = Object.fromEntries(
    players.map((stats) => {
      if (anyCurseSeen) {
        const curseMisses = stats.curseCardsFaced - stats.curseCardsSurvived
        return [stats.playerId, stats.curseCardsFaced * 4 + curseMisses * 2 + stats.publicCardPointsLost]
      }

      return [stats.playerId, stats.publicCardPointsLost * 3 + stats.hardCardsFailed * 2]
    }),
  )
  const fallbackByPlayerId = Object.fromEntries(
    players.map((stats) => [stats.playerId, stats.publicCardPointsLost]),
  )
  const winners = getTopWinnersByScore(participants, scoreByPlayerId, fallbackByPlayerId)
  const winnerStats = winners.map((winner) => statsByPlayerId[winner.playerId])

  const supportingStat = anyCurseSeen
    ? `${winnerStats.map((stats) => stats.curseCardsFaced).join(', ')} curse cards faced`
    : `${winnerStats.map((stats) => stats.publicCardPointsLost).join(', ')} points lost to public effects`

  return createAwardResult(
    'mostCursed',
    winners,
    `${formatNames(winners.map((winner) => winner.playerName))} absorbed the roughest adversity all round.`,
    supportingStat,
  )
}

function buildBiggestComebackAward(statsByPlayerId: Record<string, PlayerRoundStats>) {
  const players = Object.values(statsByPlayerId)
  const participants = toAwardParticipants(statsByPlayerId)
  const scoreByPlayerId = Object.fromEntries(
    players.map((stats) => [
      stats.playerId,
      Math.max(0, stats.positionImprovement) * 6 + Math.max(0, stats.pointDeficitRecovered) * 2,
    ]),
  )
  const fallbackByPlayerId = Object.fromEntries(
    players.map((stats) => [stats.playerId, stats.lateRoundPoints]),
  )
  const winners = getTopWinnersByScore(participants, scoreByPlayerId, fallbackByPlayerId)
  const winnerStats = winners.map((winner) => statsByPlayerId[winner.playerId])
  const biggestMove = winnerStats.reduce(
    (maxValue, stats) => Math.max(maxValue, stats.positionImprovement),
    0,
  )

  return createAwardResult(
    'biggestComeback',
    winners,
    `${formatNames(winners.map((winner) => winner.playerName))} gained the most ground through the round.`,
    `Improved by ${biggestMove} leaderboard spot${biggestMove === 1 ? '' : 's'}`,
  )
}

function buildRiskTakerAward(statsByPlayerId: Record<string, PlayerRoundStats>) {
  const players = Object.values(statsByPlayerId)
  const participants = toAwardParticipants(statsByPlayerId)
  const scoreByPlayerId = Object.fromEntries(
    players.map((stats) => [
      stats.playerId,
      stats.hardOfferSelections * 4 + stats.riskCardsChosen * 3 + stats.hardCardsChosen * 2,
    ]),
  )
  const fallbackByPlayerId = Object.fromEntries(
    players.map((stats) => [stats.playerId, stats.highValueCardsChosen]),
  )
  const winners = getTopWinnersByScore(participants, scoreByPlayerId, fallbackByPlayerId)
  const winnerStats = winners.map((winner) => statsByPlayerId[winner.playerId])
  const riskSelections = winnerStats.reduce(
    (maxValue, stats) => Math.max(maxValue, stats.hardOfferSelections + stats.riskCardsChosen),
    0,
  )

  return createAwardResult(
    'riskTaker',
    winners,
    `${formatNames(winners.map((winner) => winner.playerName))} leaned into harder lines and high-upside cards.`,
    `${riskSelections} risky selections`,
  )
}

function buildMissionMachineAward(statsByPlayerId: Record<string, PlayerRoundStats>) {
  const players = Object.values(statsByPlayerId)
  const participants = toAwardParticipants(statsByPlayerId)
  const scoreByPlayerId = Object.fromEntries(
    players.map((stats) => [stats.playerId, stats.missionsCompleted * 5 + stats.hardCardsCompleted]),
  )
  const fallbackByPlayerId = Object.fromEntries(
    players.map((stats) => [stats.playerId, stats.totalGamePoints]),
  )
  const winners = getTopWinnersByScore(participants, scoreByPlayerId, fallbackByPlayerId)
  const winnerStats = winners.map((winner) => statsByPlayerId[winner.playerId])
  const completions = winnerStats.reduce(
    (maxValue, stats) => Math.max(maxValue, stats.missionsCompleted),
    0,
  )

  return createAwardResult(
    'missionMachine',
    winners,
    `${formatNames(winners.map((winner) => winner.playerName))} completed mission after mission.`,
    `Completed ${completions} missions`,
  )
}

function buildHeartbreakerAward(statsByPlayerId: Record<string, PlayerRoundStats>) {
  const players = Object.values(statsByPlayerId)
  const participants = toAwardParticipants(statsByPlayerId)
  const scoreByPlayerId = Object.fromEntries(
    players.map((stats) => [
      stats.playerId,
      stats.hardCardsFailed * 4 + stats.highValueCardsFailed * 3 + stats.potentialPointsLeftOnTable,
    ]),
  )
  const fallbackByPlayerId = Object.fromEntries(
    players.map((stats) => [stats.playerId, stats.missionsFailed]),
  )
  const winners = getTopWinnersByScore(participants, scoreByPlayerId, fallbackByPlayerId)
  const winnerStats = winners.map((winner) => statsByPlayerId[winner.playerId])
  const missedPotential = winnerStats.reduce(
    (maxValue, stats) => Math.max(maxValue, stats.potentialPointsLeftOnTable),
    0,
  )

  return createAwardResult(
    'heartbreaker',
    winners,
    `${formatNames(winners.map((winner) => winner.playerName))} left the most upside on the table.`,
    `${missedPotential} potential points missed`,
  )
}

function buildRoundPersonalityLine(statsByPlayerId: Record<string, PlayerRoundStats>): string {
  const stats = Object.values(statsByPlayerId)
  const totalPublicImpact = stats.reduce((total, playerStats) => total + playerStats.publicImpactMagnitude, 0)
  const totalMomentum = stats.reduce((total, playerStats) => total + playerStats.momentumBonusesEarned, 0)
  const totalCompletions = stats.reduce((total, playerStats) => total + playerStats.missionsCompleted, 0)
  const totalAttempts = stats.reduce(
    (total, playerStats) => total + playerStats.missionsCompleted + playerStats.missionsFailed,
    0,
  )
  const completionRate = totalAttempts > 0 ? totalCompletions / totalAttempts : 0

  if (totalPublicImpact >= 12) {
    return 'Round Personality: Public-card chaos all day.'
  }

  if (totalMomentum >= 8) {
    return 'Round Personality: A streak-heavy shootout.'
  }

  if (completionRate >= 0.65) {
    return 'Round Personality: Mission clinic with lots of clean closes.'
  }

  return 'Round Personality: Tight grind with pressure on every hole.'
}

export function computeRoundAwards(roundState: RoundState): RoundAwardsSummary {
  const statsByPlayerId = buildPlayerRoundStats(roundState)
  const mvpAwardInputs = buildMvpAward(statsByPlayerId)

  const awards: AwardResult[] = [
    createAwardResult(
      'mvp',
      mvpAwardInputs.winners,
      mvpAwardInputs.explanation,
      mvpAwardInputs.supportingStat,
    ),
    buildChaosAgentAward(statsByPlayerId),
    buildMostClutchAward(statsByPlayerId),
    buildMostCursedAward(statsByPlayerId),
    buildBiggestComebackAward(statsByPlayerId),
    buildRiskTakerAward(statsByPlayerId),
    buildMissionMachineAward(statsByPlayerId),
    buildHeartbreakerAward(statsByPlayerId),
  ].sort(
    (awardA, awardB) =>
      AWARD_DEFINITION_BY_ID[awardA.awardId].sortOrder -
      AWARD_DEFINITION_BY_ID[awardB.awardId].sortOrder,
  )

  return {
    awards,
    statsByPlayerId,
    roundPersonalityLine: buildRoundPersonalityLine(statsByPlayerId),
  }
}
