import { ICONS } from '../app/icons.ts'
import { useMemo, useState } from 'react'
import LeaderboardTable from '../components/LeaderboardTable.tsx'
import {
  buildHoleRecapData,
  formatWinnerSummary,
  type HoleRecapPlayerRow,
} from '../logic/holeRecap.ts'
import { buildLeaderboardEntries, type LeaderboardSortMode } from '../logic/leaderboard.ts'
import { getMissionStatusPillClass } from '../logic/missionStatus.ts'
import type { ScreenProps } from './types.ts'

function formatSignedPoints(value: number): string {
  return `${value > 0 ? '+' : ''}${value}`
}

function formatDuration(ms: number | null): string {
  if (typeof ms !== 'number') {
    return 'Pending'
  }

  const totalSeconds = Math.max(0, Math.round(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  if (minutes === 0) {
    return `${seconds}s`
  }

  return `${minutes}m ${seconds}s`
}

function getPointDriverTone(value: number): 'positive' | 'negative' | 'neutral' {
  if (value > 0) {
    return 'positive'
  }

  if (value < 0) {
    return 'negative'
  }

  return 'neutral'
}

function buildPointDrivers(row: HoleRecapPlayerRow): Array<{
  label: string
  value: number
  tone: 'positive' | 'negative' | 'neutral'
}> {
  const drivers = [
    { label: 'Card', value: row.baseCardPoints },
    { label: 'Featured', value: row.featuredBonusPoints },
    { label: 'Momentum', value: row.momentumBonusPoints },
    { label: 'Public', value: row.publicBonusPoints },
    { label: 'Rivalry', value: row.rivalryBonus },
    { label: 'Balance Cap', value: row.balanceCapAdjustment },
    { label: 'Hole Total', value: row.holePoints },
  ]

  return drivers.map((driver) => ({
    ...driver,
    tone: getPointDriverTone(driver.value),
  }))
}

function LeaderboardScreen({ roundState, onNavigate, onUpdateRoundState }: ScreenProps) {
  const recapData = useMemo(() => buildHoleRecapData(roundState), [roundState])
  const isLastHole = roundState.currentHoleIndex === roundState.holes.length - 1
  const isPowerUpsMode = recapData.gameMode === 'powerUps'
  const [roundSortMode, setRoundSortMode] = useState<LeaderboardSortMode>('adjustedScore')
  const [breakdownExpanded, setBreakdownExpanded] = useState(false)

  const momentumJumpCount = recapData.playerRows.filter((row) => row.momentumTierJumped).length
  const publicSwingCount = recapData.publicCardRecapItems.reduce(
    (total, item) => total + item.impactRows.length,
    0,
  )
  const strongestHoleGain = [...recapData.playerRows].sort(
    (rowA, rowB) => rowB.holePoints - rowA.holePoints,
  )[0]

  const holeUxMetrics = roundState.holeUxMetrics[roundState.currentHoleIndex]
  const hasPublicCardsOnHole = roundState.holeCards[roundState.currentHoleIndex].publicCards.length > 0
  const debugRecapMetricsEnabled =
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    window.localStorage.getItem('gimme-golf-debug-recap') === 'true'

  const roundLeaderboardRows = useMemo(
    () => buildLeaderboardEntries(roundState.players, roundState.totalsByPlayerId, roundSortMode),
    [roundSortMode, roundState.players, roundState.totalsByPlayerId],
  )

  const holeWinnerScore = recapData.gamePointHoleWinners.score
  const bestStrokeScore = recapData.bestRealScoreHoleWinners.score
  const roundLeaderScore = recapData.leaderSnapshot.adjusted.score

  const progressRound = () => {
    if (isLastHole) {
      onNavigate('endRound')
      return
    }

    onUpdateRoundState((currentState) => ({
      ...currentState,
      currentHoleIndex: currentState.currentHoleIndex + 1,
    }))
    onNavigate('holePlay')
  }

  return (
    <section className="screen stack-sm hole-recap-screen">
      <header className="screen__header recap-header">
        <div className="row-between">
          <div className="screen-title">
            <img className="screen-title__icon" src={ICONS.holeRecap} alt="" aria-hidden="true" />
            <h2>Hole {recapData.holeNumber} Recap</h2>
          </div>
          <span className="chip">Par {recapData.holePar}</span>
        </div>
        <p className="muted">Between-holes snapshot</p>
      </header>

      <section className="panel recap-hero stack-xs" aria-live="polite">
        <p className="recap-highlight-label">Top Moment</p>
        <p className="recap-highlight recap-hero__headline">{recapData.highlightLine}</p>
        <p className="recap-hero__sub">
          Hole winner: {formatWinnerSummary(recapData.gamePointHoleWinners)}
          {typeof holeWinnerScore === 'number' ? ` (${formatSignedPoints(holeWinnerScore)})` : ''}
        </p>
      </section>

      <section className="panel recap-section recap-why-card stack-xs">
        <div className="row-between">
          <h3>Why This Hole Moved</h3>
          <span className="chip">Quick Read</span>
        </div>
        <ul className="list-reset recap-why-list">
          {!isPowerUpsMode && strongestHoleGain && (
            <li className="recap-why-list__item">
              Best hole gain: {strongestHoleGain.playerName} ({formatSignedPoints(strongestHoleGain.holePoints)})
            </li>
          )}
          {!isPowerUpsMode && <li className="recap-why-list__item">Momentum jumps: {momentumJumpCount}</li>}
          {!isPowerUpsMode && recapData.publicCardRecapItems.length > 0 && (
            <li className="recap-why-list__item">Public-card swings: {publicSwingCount}</li>
          )}
          {isPowerUpsMode && (
            <li className="recap-why-list__item">
              Power-ups used: {recapData.playerRows.filter((row) => row.powerUpUsed).length}
            </li>
          )}
          {isPowerUpsMode && (
            <li className="recap-why-list__item">
              Curses assigned: {recapData.playerRows.filter((row) => row.curseTitle).length}
            </li>
          )}
        </ul>
      </section>

      <section className="panel stack-xs recap-section">
        <div className="row-between">
          <h3>Hole Outcome</h3>
          <span className="chip">Snapshot</span>
        </div>
        <div className="end-summary-grid recap-outcome-grid">
          <article className="summary-stat recap-outcome-card">
            <p className="label">Hole Winner</p>
            <strong>{formatWinnerSummary(recapData.gamePointHoleWinners)}</strong>
            <p>{typeof holeWinnerScore === 'number' ? `${formatSignedPoints(holeWinnerScore)} points` : 'No score'}</p>
          </article>
          <article className="summary-stat recap-outcome-card">
            <p className="label">Best Stroke</p>
            <strong>{formatWinnerSummary(recapData.bestRealScoreHoleWinners)}</strong>
            <p>{typeof bestStrokeScore === 'number' ? `${bestStrokeScore} strokes` : 'No score'}</p>
          </article>
          <article className="summary-stat recap-outcome-card">
            <p className="label">Round Leader</p>
            <strong>{formatWinnerSummary(recapData.leaderSnapshot.adjusted)}</strong>
            <p>{typeof roundLeaderScore === 'number' ? `Adjusted ${roundLeaderScore}` : 'No score'}</p>
          </article>
        </div>
      </section>

      <LeaderboardTable
        title="Round Leaderboard"
        rows={roundLeaderboardRows}
        sortMode={roundSortMode}
        onSortChange={setRoundSortMode}
        showMomentum={false}
      />

      <section className="panel stack-xs recap-next recap-next--sticky">
        <button type="button" className="button-primary" onClick={progressRound}>
          <img
            className="button-icon"
            src={isLastHole ? ICONS.leaderboard : ICONS.golfFlag}
            alt=""
            aria-hidden="true"
          />
          {isLastHole ? 'Finish Round' : `Next Hole ${recapData.holeNumber + 1}`}
        </button>
      </section>

      <section className="panel stack-xs recap-breakdown-toggle">
        <div className="row-between">
          <h3>Breakdown</h3>
          <span className="chip">{breakdownExpanded ? 'Expanded' : 'Optional'}</span>
        </div>
        <p className="muted">Open for detailed card, momentum, and public-card scoring.</p>
        <button
          type="button"
          className={breakdownExpanded ? 'button-primary' : ''}
          onClick={() => setBreakdownExpanded((current) => !current)}
          aria-expanded={breakdownExpanded}
          aria-controls="hole-recap-breakdown"
        >
          {breakdownExpanded ? 'Hide Breakdown' : 'Show Breakdown'}
        </button>
      </section>

      {breakdownExpanded && (
        <section id="hole-recap-breakdown" className="stack-sm" aria-label="Hole recap breakdown">
          {recapData.featuredHoleRecap && (
            <section className="panel featured-hole-recap stack-xs">
              <div className="row-between">
                <h3>Featured Hole Impact</h3>
                <span className="chip featured-hole-chip">{recapData.featuredHoleRecap.name}</span>
              </div>
              <p>{recapData.featuredHoleRecap.shortDescription}</p>
              <p className="muted">{recapData.featuredHoleRecap.impactLine}</p>
              {recapData.featuredHoleRecap.topBeneficiaries.length > 0 && (
                <p className="muted">
                  Top beneficiary: {recapData.featuredHoleRecap.topBeneficiaries.join(', ')}
                </p>
              )}
              <p className="muted">
                {recapData.featuredHoleRecap.leaderboardImpact
                  ? 'Featured rule changed who won the hole.'
                  : 'Featured rule did not change hole winners.'}
              </p>
            </section>
          )}

          <section className="panel recap-section stack-xs">
            <div className="row-between">
              <h3>{isPowerUpsMode ? 'Power-Up Outcomes' : 'Card Outcomes'}</h3>
              <span className="chip">{recapData.playerRows.length} golfers</span>
            </div>
            {recapData.playerRows.map((row) => (
              <details
                key={row.playerId}
                className={`recap-item recap-player-summary ${
                  row.missionStatus === 'success'
                    ? 'recap-player-card--success'
                    : row.missionStatus === 'failed'
                      ? 'recap-player-card--failed'
                      : ''
                }`}
              >
                <summary className="recap-player-summary__summary">
                  <span className="recap-player-summary__name">{row.playerName}</span>
                  <div className="recap-metrics recap-player-summary__chips">
                    {row.isHoleWinnerByPoints && <span className="recap-pill badge-winner">Winner</span>}
                    {!isPowerUpsMode && (
                      <span className={getMissionStatusPillClass(row.missionStatus)}>{row.missionStatus}</span>
                    )}
                    {!isPowerUpsMode && (
                      <span className="recap-pill">Card {formatSignedPoints(row.baseCardPoints)}</span>
                    )}
                    {!isPowerUpsMode && (
                      <span className="recap-pill">Momentum {formatSignedPoints(row.momentumBonusPoints)}</span>
                    )}
                    {!isPowerUpsMode && (
                      <span className="recap-pill">Public {formatSignedPoints(row.publicBonusPoints)}</span>
                    )}
                    <span className="recap-pill recap-pill--total">
                      Total {formatSignedPoints(row.holePoints)}
                    </span>
                  </div>
                </summary>

                <div className="stack-xs recap-player-summary__details">
                  {isPowerUpsMode ? (
                    <>
                      <p className="recap-card-line">
                        {row.powerUpTitle ? `Power Up: ${row.powerUpTitle}` : 'No Power Up assigned'}
                      </p>
                      <p className="recap-card-line">
                        {row.curseTitle ? `Curse: ${row.curseTitle}` : 'No Curse assigned'}
                      </p>
                      <div className="recap-metrics recap-metrics--totals">
                        <span className={`recap-pill ${row.powerUpUsed ? 'badge-success' : 'status-pending'}`}>
                          {row.powerUpUsed ? 'Used' : 'Unused'}
                        </span>
                        <span className="recap-pill recap-pill--total">
                          Round Points {formatSignedPoints(row.totalGamePoints)}
                        </span>
                        <span className="recap-pill recap-pill--total">
                          Adjusted {row.totalAdjustedScore}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="recap-card-line">
                        {row.selectedCardCode && row.selectedCardName
                          ? `${row.selectedCardCode}: ${row.selectedCardName}`
                          : 'No personal card selected'}
                      </p>
                      <section className="recap-driver-grid">
                        {buildPointDrivers(row).map((driver) => (
                          <div key={`${row.playerId}-${driver.label}`} className="recap-driver-cell">
                            <span className="label">{driver.label}</span>
                            <strong className={`recap-driver-value recap-driver-value--${driver.tone}`}>
                              {formatSignedPoints(driver.value)}
                            </strong>
                          </div>
                        ))}
                      </section>
                      <div className="recap-metrics recap-metrics--totals">
                        {row.featuredBonusPoints !== 0 && (
                          <span className="recap-pill recap-pill--featured">
                            Featured {formatSignedPoints(row.featuredBonusPoints)}
                          </span>
                        )}
                        {row.rivalryBonus !== 0 && (
                          <span className="recap-pill badge-featured">
                            Rivalry {formatSignedPoints(row.rivalryBonus)}
                          </span>
                        )}
                        {row.balanceCapAdjustment !== 0 && (
                          <span className="recap-pill">
                            Balance Cap {formatSignedPoints(row.balanceCapAdjustment)}
                          </span>
                        )}
                        {row.momentumTierJumped && (
                          <span className="recap-pill recap-pill--momentum-up">
                            {row.momentumBeforeLabel} to {row.momentumAfterLabel}
                          </span>
                        )}
                        <span className="recap-pill recap-pill--total">
                          Round Points {formatSignedPoints(row.totalGamePoints)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </details>
            ))}
          </section>

          {!isPowerUpsMode && recapData.publicCardRecapItems.length > 0 && (
            <section className="panel recap-section recap-public-impact stack-xs">
              <div className="row-between">
                <h3>Public Card Impact</h3>
                <span className="chip">{recapData.publicCardRecapItems.length} cards</span>
              </div>
              {recapData.publicCardRecapItems.map((item) => (
                <article key={item.cardId} className="recap-item recap-public-impact__item stack-xs">
                  <div className="row-between">
                    <strong>
                      {item.cardCode} {item.cardName}
                    </strong>
                    <span className="chip">{item.modeLabel}</span>
                  </div>
                  <p className="muted">{item.summaryLine}</p>
                  {item.impactRows.length === 0 ? (
                    <p className="muted">No points moved on this card.</p>
                  ) : (
                    <div className="stack-xs">
                      {item.impactRows.map((impactRow) => (
                        <div key={impactRow.playerId} className="row-between recap-impact-row">
                          <span>{impactRow.playerName}</span>
                          <strong
                            className={impactRow.delta >= 0 ? 'recap-impact-plus' : 'recap-impact-minus'}
                          >
                            {formatSignedPoints(impactRow.delta)}
                          </strong>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </section>
          )}

          {debugRecapMetricsEnabled && (
            <section className="panel recap-section stack-xs">
              <div className="row-between">
                <h3>UX Instrumentation</h3>
                <span className="chip">Debug</span>
              </div>
              <div className="end-summary-grid">
                <article className="summary-stat">
                  <p className="label">Time Per Hole</p>
                  <strong>{formatDuration(holeUxMetrics?.durationMs ?? null)}</strong>
                  <p>From deal to recap save</p>
                </article>
                <article className="summary-stat">
                  <p className="label">Taps To Complete</p>
                  <strong>{holeUxMetrics?.tapsToComplete ?? 0}</strong>
                  <p>Hole play + results actions</p>
                </article>
                <article className="summary-stat">
                  <p className="label">Public Resolve Time</p>
                  <strong>
                    {hasPublicCardsOnHole
                      ? formatDuration(holeUxMetrics?.publicResolutionDurationMs ?? null)
                      : 'N/A'}
                  </strong>
                  <p>{hasPublicCardsOnHole ? 'First public action to completion' : 'No public cards'}</p>
                </article>
              </div>
            </section>
          )}
        </section>
      )}
    </section>
  )
}

export default LeaderboardScreen
