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
}

function LeaderboardTable({
  title,
  rows,
  sortMode,
  onSortChange,
  momentumByPlayerId,
}: LeaderboardTableProps) {
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
    <div className="panel stack-xs">
      <div className="row-between">
        <strong>{title}</strong>
        <span className="chip">#{rows[0]?.playerName ?? '-'}</span>
      </div>
      <div className="leaderboard-scroll">
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>Heat</th>
              <th>{renderSortButton('Real', 'realScore')}</th>
              <th>{renderSortButton('Points', 'gamePoints')}</th>
              <th>{renderSortButton('Adjusted', 'adjustedScore')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.playerId}>
                <td>{index + 1}</td>
                <td>{row.playerName}</td>
                <td>
                  {momentumByPlayerId
                    ? `${momentumByPlayerId[row.playerId]?.streak ?? 0} ${
                        momentumByPlayerId[row.playerId]?.tierLabel ?? 'Cold'
                      }`
                    : '-'}
                </td>
                <td>{row.realScore}</td>
                <td>{row.gamePoints}</td>
                <td>{row.adjustedScore}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default LeaderboardTable
