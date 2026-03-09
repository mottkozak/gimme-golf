import { calculatePlayerHolePointBreakdown } from '../logic/scoring.ts'
import type { HoleCardsState, HoleDefinition, HoleResultState, Player } from '../types/game.ts'

interface HoleSummaryListProps {
  players: Player[]
  holes: HoleDefinition[]
  holeCards: HoleCardsState[]
  holeResults: HoleResultState[]
  momentumEnabled: boolean
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

function formatSignedPoints(value: number): string {
  return `${value > 0 ? '+' : ''}${value}`
}

function HoleSummaryList({
  players,
  holes,
  holeCards,
  holeResults,
  momentumEnabled,
}: HoleSummaryListProps) {
  return (
    <section className="stack-sm">
      {holes.map((hole, holeIndex) => {
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
                const pointBreakdown = calculatePlayerHolePointBreakdown(
                  player.id,
                  holeIndex,
                  players,
                  holes,
                  holeCards,
                  holeResults,
                  momentumEnabled,
                )
                const holePoints = pointBreakdown.total
                const pointParts = [
                  pointBreakdown.baseMissionPoints !== 0
                    ? `card ${formatSignedPoints(pointBreakdown.baseMissionPoints)}`
                    : null,
                  pointBreakdown.featuredBonusPoints !== 0
                    ? `featured ${formatSignedPoints(pointBreakdown.featuredBonusPoints)}`
                    : null,
                  pointBreakdown.momentumBonus !== 0
                    ? `momentum ${formatSignedPoints(pointBreakdown.momentumBonus)}`
                    : null,
                  pointBreakdown.publicDelta !== 0
                    ? `public ${formatSignedPoints(pointBreakdown.publicDelta)}`
                    : null,
                ].filter((part): part is string => Boolean(part))

                return (
                  <div key={player.id} className="hole-summary-player-row">
                    <strong>{player.name}</strong>
                    <div className="recap-metrics">
                      <span>{typeof strokes === 'number' ? `${strokes} strokes` : 'No score'}</span>
                      <span className={getMissionStatusClass(missionStatus)}>{missionStatus}</span>
                      <span>
                        Points {formatSignedPoints(holePoints)}
                        {pointParts.length > 0 ? ` (${pointParts.join(', ')})` : ''}
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
