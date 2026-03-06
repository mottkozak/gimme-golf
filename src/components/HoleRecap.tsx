import type { HoleDefinition, HoleResultState, Player } from '../types/game.ts'

interface HoleRecapProps {
  hole: HoleDefinition
  result: HoleResultState
  players: Player[]
}

function HoleRecap({ hole, result, players }: HoleRecapProps) {
  return (
    <section className="panel stack-xs">
      <header className="row-between">
        <strong>Hole {hole.holeNumber} Recap</strong>
        <span className="chip">Par {hole.par}</span>
      </header>
      <ul className="list-reset recap-list">
        {players.map((player) => {
          const strokes = result.strokesByPlayerId[player.id]
          const mission = result.missionStatusByPlayerId[player.id]
          const publicDelta = result.publicPointDeltaByPlayerId[player.id] ?? 0
          const missionClass =
            mission === 'success'
              ? 'status-pill status-success'
              : mission === 'failed'
                ? 'status-pill status-failed'
                : 'status-pill status-pending'

          return (
            <li key={player.id} className="recap-item">
              <span>{player.name}</span>
              <div className="recap-metrics">
                <span>{strokes ?? '-'} strokes</span>
                <span className={missionClass}>{mission}</span>
                <span>
                  public {publicDelta > 0 ? `+${publicDelta}` : publicDelta}
                </span>
              </div>
            </li>
          )
        })}
      </ul>
      <p className="muted">{result.publicCardResolutionNotes}</p>
    </section>
  )
}

export default HoleRecap
