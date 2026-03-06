import type { MissionStatus } from '../types/game.ts'

export interface HoleRecapRow {
  playerId: string
  playerName: string
  strokes: number | null
  missionStatus: MissionStatus
  holePoints: number
}

interface HoleRecapTableProps {
  title: string
  rows: HoleRecapRow[]
}

function formatMissionStatus(status: MissionStatus): string {
  if (status === 'success') {
    return 'Yes'
  }

  if (status === 'failed') {
    return 'No'
  }

  return '-'
}

function HoleRecapTable({ title, rows }: HoleRecapTableProps) {
  return (
    <section className="panel stack-xs">
      <div className="row-between">
        <strong>{title}</strong>
      </div>
      <div className="leaderboard-scroll">
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>Player</th>
              <th>Strokes</th>
              <th>Card Success</th>
              <th>Hole Pts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.playerId}>
                <td>{row.playerName}</td>
                <td>{row.strokes ?? '-'}</td>
                <td>{formatMissionStatus(row.missionStatus)}</td>
                <td>
                  {row.holePoints > 0 ? '+' : ''}
                  {row.holePoints}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default HoleRecapTable
