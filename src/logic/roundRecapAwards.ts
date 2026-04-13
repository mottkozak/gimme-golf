import { formatPlayerNames } from './playerNames.ts'
import { computeRoundAwards, type AwardResult, type PlayerRoundStats } from './awards.ts'

export interface RecapAwardCard {
  id: string
  title: string
  winnerLine: string
  detail: string
}

function pickTopPlayerByScore(
  statsByPlayerId: Record<string, PlayerRoundStats>,
  scoreFn: (stats: PlayerRoundStats) => number,
  usedPlayerIds: Set<string>,
  preferUnused: boolean,
): PlayerRoundStats | null {
  const stats = Object.values(statsByPlayerId)
  const sorted = [...stats].sort((left, right) => {
    const scoreDelta = scoreFn(right) - scoreFn(left)
    if (scoreDelta !== 0) {
      return scoreDelta
    }
    return right.totalGamePoints - left.totalGamePoints
  })

  if (sorted.length === 0) {
    return null
  }

  if (!preferUnused) {
    return sorted[0]
  }

  return sorted.find((entry) => !usedPlayerIds.has(entry.playerId)) ?? sorted[0]
}

function getAwardById(awards: AwardResult[], id: string): AwardResult | undefined {
  return awards.find((award) => award.awardId === id)
}

export function buildConstrainedAwardCards(
  awardsSummary: ReturnType<typeof computeRoundAwards>,
): RecapAwardCard[] {
  const usedPlayerIds = new Set<string>()
  const cards: RecapAwardCard[] = []
  const statsByPlayerId = awardsSummary.statsByPlayerId
  const awardById = Object.fromEntries(awardsSummary.awards.map((award) => [award.awardId, award]))

  const mvpAward = getAwardById(awardsSummary.awards, 'mvp')
  const mvpPlayer = mvpAward?.winners[0]
  if (mvpAward && mvpPlayer) {
    usedPlayerIds.add(mvpPlayer.playerId)
    cards.push({
      id: 'mvp',
      title: 'MVP',
      winnerLine: mvpPlayer.playerName,
      detail: 'Controlled the round.',
    })
  }

  const comebackWinner = pickTopPlayerByScore(
    statsByPlayerId,
    (stats) => Math.max(0, stats.positionImprovement) * 6 + Math.max(0, stats.pointDeficitRecovered) * 2,
    usedPlayerIds,
    true,
  )
  if (comebackWinner) {
    usedPlayerIds.add(comebackWinner.playerId)
    cards.push({
      id: 'comeback',
      title: 'Comeback',
      winnerLine: comebackWinner.playerName,
      detail: 'Clawed back late.',
    })
  }

  const clutchWinner = pickTopPlayerByScore(
    statsByPlayerId,
    (stats) => stats.hardCardsCompleted * 4 + stats.momentumSuccesses * 3 + Math.max(0, stats.lateRoundPoints) * 2,
    usedPlayerIds,
    true,
  )
  if (clutchWinner) {
    usedPlayerIds.add(clutchWinner.playerId)
    cards.push({
      id: 'clutch',
      title: 'Ice in Veins',
      winnerLine: clutchWinner.playerName,
      detail: 'Closed strong under pressure.',
    })
  }

  const missionWinner = pickTopPlayerByScore(
    statsByPlayerId,
    (stats) => stats.missionsCompleted * 4 + stats.hardCardsCompleted,
    usedPlayerIds,
    true,
  )
  if (missionWinner) {
    usedPlayerIds.add(missionWinner.playerId)
    cards.push({
      id: 'mission-king',
      title: 'Mission King',
      winnerLine: missionWinner.playerName,
      detail: 'Stacked mission wins all round.',
    })
  }

  if (cards.length < 3) {
    const fallback = getAwardById(awardsSummary.awards, 'heartbreaker') ?? awardById.riskTaker ?? awardById.chaosAgent
    if (fallback) {
      cards.push({
        id: fallback.awardId,
        title: fallback.awardName,
        winnerLine: formatPlayerNames(fallback.winners.map((winner) => winner.playerName)),
        detail: fallback.explanation,
      })
    }
  }

  return cards.slice(0, 4)
}
