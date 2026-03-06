import type { LeaderboardEntry } from '../types/game.ts'

interface LeaderboardTableProps {
  title: string
  rows: LeaderboardEntry[]
}

function LeaderboardTable({ title, rows }: LeaderboardTableProps) {
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
              <th>Real</th>
              <th>Points</th>
              <th>Adjusted</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.playerId}>
                <td>{index + 1}</td>
                <td>{row.playerName}</td>
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
