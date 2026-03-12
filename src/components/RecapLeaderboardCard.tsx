import type { ReactNode } from 'react'
import type { GolfScoreToParByPlayerId } from '../logic/golfScore.ts'
import type { LeaderboardSortMode } from '../logic/leaderboard.ts'
import type { LeaderboardEntry } from '../types/game.ts'
import LeaderboardTable from './LeaderboardTable.tsx'

interface RecapLeaderboardCardProps {
  title: string
  rows: LeaderboardEntry[]
  sortMode: LeaderboardSortMode
  onSortChange: (sortMode: LeaderboardSortMode) => void
  golfScoreToParByPlayerId?: GolfScoreToParByPlayerId
  badge: ReactNode
}

function RecapLeaderboardCard({
  title,
  rows,
  sortMode,
  onSortChange,
  golfScoreToParByPlayerId,
  badge,
}: RecapLeaderboardCardProps) {
  return (
    <LeaderboardTable
      title={title}
      rows={rows}
      sortMode={sortMode}
      onSortChange={onSortChange}
      golfScoreToParByPlayerId={golfScoreToParByPlayerId}
      showMomentum={false}
      className="recap-leaderboard-card"
      headerBadge={badge}
      compactLegend
    />
  )
}

export default RecapLeaderboardCard
