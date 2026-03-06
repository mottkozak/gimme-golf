import { calculatePlayerHoleGamePoints } from '../logic/scoring.ts'
import type { HoleCardsState, HoleDefinition, HoleResultState, Player } from '../types/game.ts'

interface HoleSummaryListProps {
  players: Player[]
  holes: HoleDefinition[]
  holeCards: HoleCardsState[]
  holeResults: HoleResultState[]
}

function getMissionStatusClass(missionStatus: HoleResultState['missionStatusByPlayerId'][string]): string {
  if (missionStatus === 'success') {
    return 'status-pill status-success'
  }

  if (missionStatus === 'failed') {
    return 'status-pill status-failed'
  }

  return 'status-pill status-pending'
}

function HoleSummaryList({ players, holes, holeCards, holeResults }: HoleSummaryListProps) {
  return (
    <section className="stack-sm">
      {holes.map((hole, holeIndex) => {
        const holeCardState = holeCards[holeIndex]
        const holeResult = holeResults[holeIndex]

        return (
          <article key={hole.holeNumber} className="panel hole-summary-card stack-xs">
            <header className="row-between">
              <strong>Hole {hole.holeNumber}</strong>
              <span className="chip">Par {hole.par}</span>
            </header>

            <div className="stack-xs">
              {players.map((player) => {
                const strokes = holeResult?.strokesByPlayerId[player.id]
                const missionStatus = holeResult?.missionStatusByPlayerId[player.id] ?? 'pending'
                const publicDelta = holeResult?.publicPointDeltaByPlayerId[player.id] ?? 0
                const holePoints = calculatePlayerHoleGamePoints(
                  player.id,
                  holeCardState,
                  holeResult,
                )

                return (
                  <div key={player.id} className="hole-summary-player-row">
                    <strong>{player.name}</strong>
                    <div className="recap-metrics">
                      <span>{typeof strokes === 'number' ? `${strokes} strokes` : 'No score'}</span>
                      <span className={getMissionStatusClass(missionStatus)}>{missionStatus}</span>
                      <span>
                        Points {holePoints > 0 ? '+' : ''}
                        {holePoints}
                        {publicDelta !== 0
                          ? ` (public ${publicDelta > 0 ? '+' : ''}${publicDelta})`
                          : ''}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </article>
        )
      })}
    </section>
  )
}

export default HoleSummaryList
