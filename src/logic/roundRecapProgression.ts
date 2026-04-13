import { getDisplayPlayerName } from './playerNames.ts'
import { buildHolePointBreakdownsByPlayerId } from './streaks.ts'
import type { RoundState } from '../types/game.ts'

export interface RecapProgressionLine {
  playerId: string
  playerName: string
  cumulativePointsByHole: number[]
  isWinner: boolean
}

export interface RecapProgressionCallout {
  id: string
  holeNumber: number
  title: string
  detail: string
}

export interface ProgressionComputation {
  holes: number[]
  lines: RecapProgressionLine[]
  leaderByHole: Array<string | null>
}

export function formatSignedValue(value: number): string {
  return `${value > 0 ? '+' : ''}${value}`
}

export function getWinnerHeroSubtext(
  winnerId: string | null,
  leaderByHole: Array<string | null>,
  winnerFinalLead: number,
): string {
  if (!winnerId) {
    return 'Round complete.'
  }

  if (winnerFinalLead <= 2) {
    return 'Won in a tight finish.'
  }

  const winnerLedAllTheWay = leaderByHole.every((leaderId) => leaderId === winnerId)
  if (winnerLedAllTheWay) {
    return 'Controlled from the start.'
  }

  const lateStartIndex = Math.max(1, Math.floor(leaderByHole.length * 0.65))
  const hadLateLeadChange = leaderByHole
    .slice(lateStartIndex)
    .some((leaderId, index, source) => index > 0 && leaderId !== source[index - 1])
  if (hadLateLeadChange) {
    return 'Pulled away late.'
  }

  return 'Pulled away late.'
}

export function computeProgression(
  roundState: RoundState,
  winnerPlayerId: string | null,
): ProgressionComputation {
  const holes = roundState.holes.map((hole) => hole.holeNumber)
  const breakdownsByPlayerId = buildHolePointBreakdownsByPlayerId(
    roundState.players,
    roundState.holes,
    roundState.holeCards,
    roundState.holeResults,
    roundState.config.toggles.momentumBonuses,
  )

  const lines = roundState.players.map((player, playerIndex) => {
    let runningTotal = 0
    const cumulativePointsByHole = holes.map((_, holeIndex) => {
      runningTotal += breakdownsByPlayerId[player.id]?.[holeIndex]?.total ?? 0
      return runningTotal
    })

    return {
      playerId: player.id,
      playerName: getDisplayPlayerName(player.name, playerIndex),
      cumulativePointsByHole,
      isWinner: player.id === winnerPlayerId,
    }
  })

  const leaderByHole = holes.map((_, holeIndex) => {
    if (lines.length === 0) {
      return null
    }
    const maxPoints = Math.max(...lines.map((line) => line.cumulativePointsByHole[holeIndex] ?? 0))
    const leaders = lines.filter((line) => (line.cumulativePointsByHole[holeIndex] ?? 0) === maxPoints)
    return leaders.length === 1 ? leaders[0].playerId : null
  })

  return {
    holes,
    lines,
    leaderByHole,
  }
}

export function buildProgressionCallouts(
  progression: ProgressionComputation,
  winnerPlayerId: string | null,
): RecapProgressionCallout[] {
  const callouts: RecapProgressionCallout[] = []
  const winnerLine = progression.lines.find((line) => line.playerId === winnerPlayerId) ?? null

  for (let index = 1; index < progression.leaderByHole.length; index += 1) {
    const previousLeader = progression.leaderByHole[index - 1]
    const currentLeader = progression.leaderByHole[index]
    if (!previousLeader || !currentLeader || previousLeader === currentLeader) {
      continue
    }

    const leaderName = progression.lines.find((line) => line.playerId === currentLeader)?.playerName ?? 'A player'
    callouts.push({
      id: 'lead-change',
      holeNumber: progression.holes[index],
      title: 'Lead Change',
      detail: `${leaderName} takes the lead.`,
    })
    break
  }

  if (winnerLine && progression.holes.length >= 3) {
    let bestWindowGain = Number.NEGATIVE_INFINITY
    let bestWindowEndIndex = 2
    for (let index = 2; index < progression.holes.length; index += 1) {
      const startValue = winnerLine.cumulativePointsByHole[index - 2] ?? 0
      const endValue = winnerLine.cumulativePointsByHole[index] ?? 0
      const gain = endValue - startValue
      if (gain > bestWindowGain) {
        bestWindowGain = gain
        bestWindowEndIndex = index
      }
    }

    if (bestWindowGain >= 3) {
      const winnerName = winnerLine.playerName
      const hasUsedHole = callouts.some((callout) => callout.holeNumber === progression.holes[bestWindowEndIndex])
      if (!hasUsedHole) {
        callouts.push({
          id: 'pull-away',
          holeNumber: progression.holes[bestWindowEndIndex],
          title: 'Pull Away',
          detail: `${winnerName} gained ${formatSignedValue(bestWindowGain)} over 3 holes.`,
        })
      }
    }
  }

  return callouts.slice(0, 2)
}

export function computeWinnerLateGain(
  progression: ProgressionComputation,
  winnerPlayerId: string | null,
): {
  winnerLine: RecapProgressionLine | null
  lateWindow: number
  winnerLateGain: number
} {
  const winnerProgressionLine = progression.lines.find((line) => line.playerId === winnerPlayerId) ?? null
  const lateWindow = Math.min(5, progression.holes.length)
  const lateWindowStart = Math.max(0, progression.holes.length - lateWindow)
  const winnerLateGain = winnerProgressionLine
    ? (winnerProgressionLine.cumulativePointsByHole[progression.holes.length - 1] ?? 0) -
      (winnerProgressionLine.cumulativePointsByHole[lateWindowStart] ?? 0)
    : 0

  return {
    winnerLine: winnerProgressionLine,
    lateWindow,
    winnerLateGain,
  }
}
