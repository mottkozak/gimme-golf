import type { MissionStatus } from '../types/game.ts'

export interface HoleRecapRow {
  playerId: string
  playerName: string
  strokes: number | null
  selectedCardCode: string | null
  missionStatus: MissionStatus
  missionPoints: number
  momentumBonus: number
  publicDelta: number
  holePoints: number
  streakAfter: number
  momentumTierAfter: string
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
              <th>Card</th>
              <th>Success</th>
              <th>Card Pts</th>
              <th>Momentum</th>
              <th>Public</th>
              <th>Hole Pts</th>
              <th>Streak</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.playerId}>
                <td>{row.playerName}</td>
                <td>{row.strokes ?? '-'}</td>
                <td>{row.selectedCardCode ?? '-'}</td>
                <td>{formatMissionStatus(row.missionStatus)}</td>
                <td>
                  {row.missionPoints > 0 ? '+' : ''}
                  {row.missionPoints}
                </td>
                <td>
                  {row.momentumBonus > 0 ? '+' : ''}
                  {row.momentumBonus}
                </td>
                <td>
                  {row.publicDelta > 0 ? '+' : ''}
                  {row.publicDelta}
                </td>
                <td>
                  {row.holePoints > 0 ? '+' : ''}
                  {row.holePoints}
                </td>
                <td>
                  {row.streakAfter} ({row.momentumTierAfter})
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
