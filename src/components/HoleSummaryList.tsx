import { useMemo } from 'react'
import {
  buildHolePointBreakdownsByPlayerId,
  createEmptyHolePointBreakdown,
} from '../logic/streaks.ts'
import { getMissionStatusPillClass } from '../logic/missionStatus.ts'
import type { GameMode, HoleCardsState, HoleDefinition, HoleResultState, Player } from '../types/game.ts'

interface HoleSummaryListProps {
  players: Player[]
  holes: HoleDefinition[]
  holeCards: HoleCardsState[]
  holeResults: HoleResultState[]
  momentumEnabled: boolean
  gameMode: GameMode
}

function formatSignedPoints(value: number): string {
  return `${value > 0 ? '+' : ''}${value}`
}

function getScoreToneClass(value: number): 'score-positive' | 'score-negative' | 'score-neutral' {
  if (value > 0) {
    return 'score-positive'
  }

  if (value < 0) {
    return 'score-negative'
  }

  return 'score-neutral'
}

function HoleSummaryList({
  players,
  holes,
  holeCards,
  holeResults,
  momentumEnabled,
  gameMode,
}: HoleSummaryListProps) {
  const breakdownsByPlayerId = useMemo(
    () =>
      buildHolePointBreakdownsByPlayerId(
        players,
        holes,
        holeCards,
        holeResults,
        momentumEnabled,
      ),
    [players, holes, holeCards, holeResults, momentumEnabled],
  )

  return (
    <section className="hole-scorecard-list stack-xs">
      {holes.map((hole, holeIndex) => {
        const holeResult = holeResults[holeIndex]

        return (
          <details key={hole.holeNumber} className="panel hole-scorecard">
            <summary className="hole-scorecard__summary">
              <div className="row-between">
                <strong>Hole {hole.holeNumber}</strong>
                <span className="chip">Par {hole.par}</span>
              </div>

              <div className="hole-scorecard__quick-row">
                {players.map((player) => {
                  const pointBreakdown =
                    breakdownsByPlayerId[player.id]?.[holeIndex] ?? createEmptyHolePointBreakdown()
                  const holePoints = pointBreakdown.total

                  return (
                    <span key={player.id} className="hole-scorecard__quick-item">
                      <span className="hole-scorecard__quick-name">{player.name}</span>
                      <span className={`hole-scorecard__quick-points ${getScoreToneClass(holePoints)}`}>
                        {formatSignedPoints(holePoints)}
                      </span>
                    </span>
                  )
                })}
              </div>
            </summary>

            <div className="stack-xs hole-scorecard__details">
              {players.map((player) => {
                const strokes = holeResult?.strokesByPlayerId[player.id]
                const missionStatus = holeResult?.missionStatusByPlayerId[player.id] ?? 'pending'
                const pointBreakdown =
                  breakdownsByPlayerId[player.id]?.[holeIndex] ?? createEmptyHolePointBreakdown()
                const holePoints = pointBreakdown.total
                const isPowerUpsMode = gameMode === 'powerUps'
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
                  pointBreakdown.balanceCapAdjustment !== 0
                    ? `balance cap ${formatSignedPoints(pointBreakdown.balanceCapAdjustment)}`
                    : null,
                ].filter((part): part is string => Boolean(part))

                return (
                  <div key={player.id} className="hole-scorecard__detail-row">
                    <div className="row-between">
                      <strong>{player.name}</strong>
                      <span className={`hole-scorecard__detail-points ${getScoreToneClass(holePoints)}`}>
                        {formatSignedPoints(holePoints)} pts
                      </span>
                    </div>
                    <div className="recap-metrics">
                      <span className="score-neutral">
                        {typeof strokes === 'number' ? `${strokes} strokes` : 'No score'}
                      </span>
                      {!isPowerUpsMode && (
                        <span className={getMissionStatusPillClass(missionStatus)}>{missionStatus}</span>
                      )}
                      {isPowerUpsMode ? (
                        <span className="score-neutral">Power-Ups mode</span>
                      ) : (
                        <span className="score-neutral">
                          {pointParts.length > 0 ? pointParts.join(' | ') : 'No bonus modifiers'}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </details>
        )
      })}
    </section>
  )
}

export default HoleSummaryList
