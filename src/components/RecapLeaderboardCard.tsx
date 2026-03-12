import type { ReactNode } from 'react'
import type { LeaderboardSortMode } from '../logic/leaderboard.ts'
import type { LeaderboardEntry } from '../types/game.ts'
import LeaderboardTable from './LeaderboardTable.tsx'

interface RecapLeaderboardCardProps {
  title: string
  rows: LeaderboardEntry[]
  sortMode: LeaderboardSortMode
  onSortChange: (sortMode: LeaderboardSortMode) => void
  badge: ReactNode
}

function RecapLeaderboardCard({
  title,
  rows,
  sortMode,
  onSortChange,
  badge,
}: RecapLeaderboardCardProps) {
  return (
    <LeaderboardTable
      title={title}
      rows={rows}
      sortMode={sortMode}
      onSortChange={onSortChange}
      showMomentum={false}
      className="recap-leaderboard-card"
      headerBadge={badge}
      compactLegend
    />
  )
}

export default RecapLeaderboardCard
