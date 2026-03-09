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
                  <div key={player.id} className="hole-summary-player-row">
                    <strong>{player.name}</strong>
                    <div className="recap-metrics">
                      <span>{typeof strokes === 'number' ? `${strokes} strokes` : 'No score'}</span>
                      {!isPowerUpsMode && (
                        <span className={getMissionStatusPillClass(missionStatus)}>{missionStatus}</span>
                      )}
                      {isPowerUpsMode ? (
                        <span>Power-Ups mode</span>
                      ) : (
                        <span>
                          Points {formatSignedPoints(holePoints)}
                          {pointParts.length > 0 ? ` (${pointParts.join(', ')})` : ''}
                        </span>
                      )}
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
