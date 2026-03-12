import type { ReactNode } from 'react'
import {
  formatGolfScoreToPar,
  getGolfScoreToneClass,
  type GolfScoreToParByPlayerId,
} from '../logic/golfScore.ts'
import type { LeaderboardSortMode } from '../logic/leaderboard.ts'
import type { LeaderboardEntry } from '../types/game.ts'

interface LeaderboardMomentumValue {
  streak: number
  tierLabel: string
}

interface LeaderboardTableProps {
  title: string
  rows: LeaderboardEntry[]
  sortMode?: LeaderboardSortMode
  onSortChange?: (sortMode: LeaderboardSortMode) => void
  momentumByPlayerId?: Record<string, LeaderboardMomentumValue>
  showMomentum?: boolean
  golfScoreToParByPlayerId?: GolfScoreToParByPlayerId
  className?: string
  headerBadge?: ReactNode
  compactLegend?: boolean
}

function LeaderboardTable({
  title,
  rows,
  sortMode,
  onSortChange,
  momentumByPlayerId,
  showMomentum,
  golfScoreToParByPlayerId,
  className,
  headerBadge,
  compactLegend = false,
}: LeaderboardTableProps) {
  const shouldShowMomentum = showMomentum ?? Boolean(momentumByPlayerId)
  const shouldShowGolfScore = Boolean(golfScoreToParByPlayerId)
  const formatSignedPoints = (value: number): string => `${value > 0 ? '+' : ''}${value}`

  const renderSortButton = (label: string, mode: LeaderboardSortMode) => {
    if (!onSortChange) {
      return <span>{label}</span>
    }

    return (
      <button
        type="button"
        className={`table-sort-button ${sortMode === mode ? 'active' : ''}`}
        onClick={() => onSortChange(mode)}
      >
        {label}
      </button>
    )
  }

  return (
    <div className={['panel', 'stack-xs', className ?? ''].filter(Boolean).join(' ')}>
      <div className="row-between">
        <strong>{title}</strong>
        {headerBadge ?? <span className="chip">#{rows[0]?.playerName ?? '-'}</span>}
      </div>
      <div className="leaderboard-scroll">
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th className="leaderboard-table__th leaderboard-table__th--rank">Rank</th>
              <th className="leaderboard-table__th leaderboard-table__th--player">Player</th>
              {shouldShowMomentum && <th className="leaderboard-table__th">Heat</th>}
              <th className="leaderboard-table__th leaderboard-table__th--metric">
                {renderSortButton('Real (strokes)', 'realScore')}
              </th>
              <th className="leaderboard-table__th leaderboard-table__th--metric">
                {renderSortButton('Game Pts', 'gamePoints')}
              </th>
              <th className="leaderboard-table__th leaderboard-table__th--metric">
                {renderSortButton('Adjusted', 'adjustedScore')}
              </th>
              {shouldShowGolfScore && <th className="leaderboard-table__th leaderboard-table__th--metric">Golf</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={row.playerId}
                className={`leaderboard-table__row ${index === 0 ? 'leaderboard-table__row--leader' : ''}`}
              >
                <td className="leaderboard-table__cell leaderboard-table__cell--rank">{index + 1}</td>
                <td className="leaderboard-table__cell leaderboard-table__cell--player">{row.playerName}</td>
                {shouldShowMomentum && (
                  <td className="leaderboard-table__cell">
                    {momentumByPlayerId
                      ? `${momentumByPlayerId[row.playerId]?.streak ?? 0} ${
                          momentumByPlayerId[row.playerId]?.tierLabel ?? 'Cold'
                        }`
                      : '-'}
                  </td>
                )}
                <td className="leaderboard-table__cell leaderboard-table__cell--metric">
                  {row.realScore}
                </td>
                <td className="leaderboard-table__cell leaderboard-table__cell--metric">
                  {formatSignedPoints(row.gamePoints)}
                </td>
                <td className="leaderboard-table__cell leaderboard-table__cell--metric">
                  {row.adjustedScore}
                </td>
                {shouldShowGolfScore && (
                  <td
                    className={`leaderboard-table__cell leaderboard-table__cell--metric ${getGolfScoreToneClass(
                      golfScoreToParByPlayerId?.[row.playerId] ?? null,
                    )}`}
                  >
                    {formatGolfScoreToPar(golfScoreToParByPlayerId?.[row.playerId] ?? null)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={`muted leaderboard-table__legend ${compactLegend ? 'leaderboard-table__legend--compact' : ''}`}>
        Real is pure strokes. Game points come from side-game outcomes. Adjusted = real minus game
        points. Golf is strokes vs played par ({' '}
        <span className="score-positive">-X under</span> / <span className="score-neutral">Even</span> /{' '}
        <span className="score-negative">+X over</span>).
      </p>
    </div>
  )
}

export default LeaderboardTable
