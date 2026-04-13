import type { PlayerRoundStats } from './awards.ts'

export interface RecapPlayerArchetype {
  playerId: string
  playerName: string
  icon: string
  title: string
  oneLiner: string
}

interface ArchetypeContext {
  maxPublicImpact: number
  playerCount: number
  adjustedRankByPlayerId: Record<string, number>
}

function buildContext(statsByPlayerId: Record<string, PlayerRoundStats>): ArchetypeContext {
  const allStats = Object.values(statsByPlayerId)
  const rankedByAdjustedScore = [...allStats].sort((left, right) => {
    if (left.totalAdjustedScore !== right.totalAdjustedScore) {
      return left.totalAdjustedScore - right.totalAdjustedScore
    }

    if (left.totalRealScore !== right.totalRealScore) {
      return left.totalRealScore - right.totalRealScore
    }

    return right.totalGamePoints - left.totalGamePoints
  })

  const adjustedRankByPlayerId = Object.fromEntries(
    rankedByAdjustedScore.map((stats, index) => [stats.playerId, index + 1]),
  )

  return {
    maxPublicImpact: allStats.reduce((maxValue, stats) => Math.max(maxValue, stats.publicImpactMagnitude), 0),
    playerCount: allStats.length,
    adjustedRankByPlayerId,
  }
}

interface ArchetypeCandidate {
  icon: string
  title: string
  oneLiner: string
  score: number
}

const UNIQUE_FALLBACK_ARCHETYPES: Array<Omit<ArchetypeCandidate, 'score'>> = [
  {
    icon: '🧱',
    title: 'The Wall',
    oneLiner: 'Kept mistakes down and hung tough.',
  },
  {
    icon: '🧭',
    title: 'The Steady Hand',
    oneLiner: 'Stayed composed and avoided big swings.',
  },
  {
    icon: '⛳',
    title: 'The Fairway Finder',
    oneLiner: 'Kept the round in play and moving forward.',
  },
  {
    icon: '🪨',
    title: 'The Grinder',
    oneLiner: 'Battled through every hole without blinking.',
  },
  {
    icon: '🛡️',
    title: 'The Stabilizer',
    oneLiner: 'Absorbed pressure and kept the card together.',
  },
]

function createUniqueFallbackCandidate(usedTitles: Set<string>): ArchetypeCandidate {
  for (const fallback of UNIQUE_FALLBACK_ARCHETYPES) {
    if (!usedTitles.has(fallback.title)) {
      return {
        ...fallback,
        score: 0,
      }
    }
  }

  let suffix = 2
  let title = `The Wall ${suffix}`
  while (usedTitles.has(title)) {
    suffix += 1
    title = `The Wall ${suffix}`
  }

  return {
    icon: '🧱',
    title,
    oneLiner: 'Kept mistakes down and hung tough.',
    score: 0,
  }
}

function pushCandidate(
  candidates: ArchetypeCandidate[],
  candidate: ArchetypeCandidate,
): void {
  candidates.push(candidate)
}

function buildArchetypeCandidatesForPlayer(
  stats: PlayerRoundStats,
  context: ArchetypeContext,
): ArchetypeCandidate[] {
  const missionAttempts = stats.missionsCompleted + stats.missionsFailed
  const successRate = missionAttempts > 0 ? stats.missionsCompleted / missionAttempts : 0
  const hasBalancedCardMix =
    Math.abs(stats.hardOfferSelections - stats.safeOfferSelections) <= 1 &&
    stats.hardOfferSelections > 0 &&
    stats.safeOfferSelections > 0
  const deficitSpread =
    stats.pointDeficitByHole.length > 0
      ? Math.max(...stats.pointDeficitByHole) - Math.min(...stats.pointDeficitByHole)
      : 0
  const adjustedRank = context.adjustedRankByPlayerId[stats.playerId] ?? context.playerCount
  const candidates: ArchetypeCandidate[] = []

  if (stats.publicImpactMagnitude >= 4 && stats.publicImpactMagnitude === context.maxPublicImpact) {
    pushCandidate(candidates, {
      icon: '🤡',
      title: 'The Chaos Agent',
      oneLiner: 'Triggered the wild stuff all round.',
      score: 95 + stats.publicImpactMagnitude,
    })
  }

  if (stats.hardCardsFailed >= 2 && stats.potentialPointsLeftOnTable >= 6) {
    pushCandidate(candidates, {
      icon: '💀',
      title: 'The Heartbreaker',
      oneLiner: 'Had the upside and missed it by inches.',
      score: 84 + stats.potentialPointsLeftOnTable,
    })
  }

  if (missionAttempts >= 4 && successRate >= 0.75) {
    pushCandidate(candidates, {
      icon: '🎯',
      title: 'The Sniper',
      oneLiner: 'Low mistakes and clean conversions.',
      score: 88 + Math.round(successRate * 10),
    })
  }

  if (stats.riskCardsChosen >= 3 || stats.hardOfferSelections >= stats.safeOfferSelections + 2) {
    pushCandidate(candidates, {
      icon: '🎲',
      title: 'The Gambler',
      oneLiner: 'Full send all round.',
      score: 80 + stats.riskCardsChosen + stats.hardOfferSelections,
    })
  }

  if (stats.safeOfferSelections >= stats.hardOfferSelections + 2 && successRate >= 0.5) {
    pushCandidate(candidates, {
      icon: '🧠',
      title: 'The Strategist',
      oneLiner: 'Picked smart spots and stayed efficient.',
      score: 78 + stats.safeOfferSelections,
    })
  }

  if (stats.positionImprovement > 0 && stats.lateRoundPoints >= Math.max(3, Math.ceil(stats.totalGamePoints * 0.4))) {
    pushCandidate(candidates, {
      icon: '🧊',
      title: 'The Closer',
      oneLiner: 'Saved the best stretch for late.',
      score: 82 + stats.positionImprovement + stats.lateRoundPoints,
    })
  }

  if (stats.longestStreak >= 3 || stats.momentumBonusesEarned >= 2) {
    pushCandidate(candidates, {
      icon: '🔥',
      title: 'The Heater',
      oneLiner: 'Caught fire and stayed hot.',
      score: 76 + stats.longestStreak + stats.momentumBonusesEarned,
    })
  }

  if (deficitSpread >= 5) {
    pushCandidate(candidates, {
      icon: '📉',
      title: 'The Rollercoaster',
      oneLiner: 'High highs, low lows, nonstop swings.',
      score: 70 + deficitSpread,
    })
  }

  if (hasBalancedCardMix) {
    pushCandidate(candidates, {
      icon: '⚖️',
      title: 'The Balanced One',
      oneLiner: 'Mixed risk and safety the whole way.',
      score: 68 + stats.hardOfferSelections + stats.safeOfferSelections,
    })
  }

  if (adjustedRank === 1) {
    pushCandidate(candidates, {
      icon: '🏁',
      title: 'The Pace Setter',
      oneLiner: 'Set the benchmark on adjusted score.',
      score: 85,
    })
  }

  if (adjustedRank === context.playerCount && stats.positionImprovement > 0) {
    pushCandidate(candidates, {
      icon: '🛠️',
      title: 'The Rebuilder',
      oneLiner: 'Started behind and found better gear.',
      score: 72 + stats.positionImprovement,
    })
  }

  pushCandidate(candidates, {
    icon: '🧱',
    title: 'The Wall',
    oneLiner: 'Kept mistakes down and hung tough.',
    score: 5,
  })

  const bestByTitle = new Map<string, ArchetypeCandidate>()
  for (const candidate of candidates) {
    const existing = bestByTitle.get(candidate.title)
    if (!existing || candidate.score > existing.score) {
      bestByTitle.set(candidate.title, candidate)
    }
  }

  return [...bestByTitle.values()].sort((left, right) => {
    if (left.score !== right.score) {
      return right.score - left.score
    }

    return left.title.localeCompare(right.title)
  })
}

export function computeRecapArchetypes(
  statsByPlayerId: Record<string, PlayerRoundStats>,
): RecapPlayerArchetype[] {
  if (Object.keys(statsByPlayerId).length === 0) {
    return []
  }

  const context = buildContext(statsByPlayerId)
  const statsList = Object.values(statsByPlayerId)
  const assignmentOrder = [...statsList].sort((left, right) => {
    const leftRank = context.adjustedRankByPlayerId[left.playerId] ?? context.playerCount
    const rightRank = context.adjustedRankByPlayerId[right.playerId] ?? context.playerCount
    if (leftRank !== rightRank) {
      return leftRank - rightRank
    }

    return right.totalGamePoints - left.totalGamePoints
  })
  const usedTitles = new Set<string>()
  const archetypeByPlayerId: Record<string, Omit<RecapPlayerArchetype, 'playerId' | 'playerName'>> = {}

  for (const stats of assignmentOrder) {
    const candidates = buildArchetypeCandidatesForPlayer(stats, context)
    const selectedCandidate =
      candidates.find((candidate) => !usedTitles.has(candidate.title)) ??
      createUniqueFallbackCandidate(usedTitles)

    archetypeByPlayerId[stats.playerId] = {
      icon: selectedCandidate.icon,
      title: selectedCandidate.title,
      oneLiner: selectedCandidate.oneLiner,
    }
    usedTitles.add(selectedCandidate.title)
  }

  return statsList.map((stats) => {
    const archetype = archetypeByPlayerId[stats.playerId] ?? {
      icon: '🧱',
      title: 'The Wall',
      oneLiner: 'Kept mistakes down and hung tough.',
    }

    return {
      playerId: stats.playerId,
      playerName: stats.playerName,
      icon: archetype.icon,
      title: archetype.title,
      oneLiner: archetype.oneLiner,
    }
  })
}
