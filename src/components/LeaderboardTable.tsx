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
}

function LeaderboardTable({
  title,
  rows,
  sortMode,
  onSortChange,
  momentumByPlayerId,
  showMomentum,
}: LeaderboardTableProps) {
  const shouldShowMomentum = showMomentum ?? Boolean(momentumByPlayerId)
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
    <div className="panel stack-xs">
      <div className="row-between">
        <strong>{title}</strong>
        <span className="chip">#{rows[0]?.playerName ?? '-'}</span>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted leaderboard-table__legend">
        Real score is pure golf strokes. Game points come from side-game outcomes. Adjusted score
        equals real score minus game points.
      </p>
    </div>
  )
}

export default LeaderboardTable
