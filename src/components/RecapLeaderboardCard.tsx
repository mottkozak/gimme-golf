import type { ReactNode } from 'react'
import type { GolfScoreToParByPlayerId } from '../logic/golfScore.ts'
import type { LeaderboardSortMode } from '../logic/leaderboard.ts'
import type { LeaderboardEntry } from '../types/game.ts'
import LeaderboardTable from './LeaderboardTable.tsx'

interface RecapLeaderboardCardProps {
  title: string
  rows: LeaderboardEntry[]
  sortMode: LeaderboardSortMode
  onSortChange?: (sortMode: LeaderboardSortMode) => void
  golfScoreToParByPlayerId?: GolfScoreToParByPlayerId
  badge: ReactNode
  evenParTotal?: number
  className?: string
  metricVisibility?: {
    adjustedScore?: boolean
    realScore?: boolean
    gamePoints?: boolean
  }
  legendText?: string
}

function RecapLeaderboardCard({
  title,
  rows,
  sortMode,
  onSortChange,
  golfScoreToParByPlayerId,
  badge,
  evenParTotal,
  className,
  metricVisibility,
  legendText,
}: RecapLeaderboardCardProps) {
  return (
    <LeaderboardTable
      title={title}
      rows={rows}
      sortMode={sortMode}
      onSortChange={onSortChange}
      golfScoreToParByPlayerId={golfScoreToParByPlayerId}
      showMomentum={false}
      className={['recap-leaderboard-card', className ?? ''].filter(Boolean).join(' ')}
      headerBadge={badge}
      compactLegend
      evenParTotal={evenParTotal}
      metricVisibility={metricVisibility}
      legendText={legendText}
    />
  )
}

export default RecapLeaderboardCard
