import { ICONS } from '../app/icons.ts'
import { useEffect, useMemo, useState } from 'react'
import AppIcon from '../components/AppIcon.tsx'
import HoleActionPanel from '../components/HoleActionPanel.tsx'
import HoleInfoCard from '../components/HoleInfoCard.tsx'
import RecapBreakdownPanel from '../components/RecapBreakdownPanel.tsx'
import RecapHeroCard from '../components/RecapHeroCard.tsx'
import RecapLeaderboardCard from '../components/RecapLeaderboardCard.tsx'
import RecapPlayerOutcomeCard from '../components/RecapPlayerOutcomeCard.tsx'
import RecapPublicImpactCard from '../components/RecapPublicImpactCard.tsx'
import RecapStatusChip from '../components/RecapStatusChip.tsx'
import RecapSummaryStatCard from '../components/RecapSummaryStatCard.tsx'
import { trackSummaryScreenViewed } from '../logic/analytics.ts'
import {
  buildHoleRecapData,
  formatWinnerSummary,
  type HoleRecapPlayerRow,
} from '../logic/holeRecap.ts'
import { buildLeaderboardEntries, type LeaderboardSortMode } from '../logic/leaderboard.ts'
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

function getMissionStatusChipTone(status: HoleRecapPlayerRow['missionStatus']): 'success' | 'failed' | 'subtle' {
  if (status === 'success') {
    return 'success'
  }

  if (status === 'failed') {
    return 'failed'
  }

  return 'subtle'
}

function formatMissionStatusLabel(status: HoleRecapPlayerRow['missionStatus']): string {
  if (!status) {
    return 'Pending'
  }

  return `${status.charAt(0).toUpperCase()}${status.slice(1)}`
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
  const holeMovementRows = [
    !isPowerUpsMode && strongestHoleGain
      ? {
          label: 'Best hole gain',
          value: `${strongestHoleGain.playerName} (${formatSignedPoints(strongestHoleGain.holePoints)})`,
        }
      : null,
    !isPowerUpsMode
      ? {
          label: 'Momentum jumps',
          value: String(momentumJumpCount),
        }
      : null,
    !isPowerUpsMode && recapData.publicCardRecapItems.length > 0
      ? {
          label: 'Public-card swings',
          value: String(publicSwingCount),
        }
      : null,
    isPowerUpsMode
      ? {
          label: 'Power-ups used',
          value: String(recapData.playerRows.filter((row) => row.powerUpUsed).length),
        }
      : null,
    isPowerUpsMode
      ? {
          label: 'Curses assigned',
          value: String(recapData.playerRows.filter((row) => row.curseTitle).length),
        }
      : null,
  ].filter((entry): entry is { label: string; value: string } => entry !== null)

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

  useEffect(() => {
    trackSummaryScreenViewed(roundState, 'leaderboard', recapData.holeNumber)
  }, [recapData.holeNumber, roundState])

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
    <section className="screen stack-sm hole-recap-screen hole-recap-screen--editorial">
      <header className="screen__header recap-header recap-header--editorial">
        <div className="row-between recap-header__title-row">
          <div className="screen-title">
            <AppIcon className="screen-title__icon" icon={ICONS.holeRecap} />
            <h2>Hole {recapData.holeNumber} Recap</h2>
          </div>
          <div className="recap-header__chips">
            <RecapStatusChip tone="count">
              Hole {recapData.holeNumber} of {roundState.holes.length}
            </RecapStatusChip>
            <RecapStatusChip tone="subtle">Par {recapData.holePar}</RecapStatusChip>
          </div>
        </div>
        <p className="muted">A polished between-holes snapshot before the next tee.</p>
      </header>

      <RecapHeroCard
        label="Best Moment"
        headline={recapData.highlightLine}
        supportingText={`Hole winner: ${formatWinnerSummary(recapData.gamePointHoleWinners)}${
          typeof holeWinnerScore === 'number' ? ` (${formatSignedPoints(holeWinnerScore)})` : ''
        }`}
      />

      <HoleInfoCard title="Scoring Clarity" className="recap-score-clarity">
        <p className="muted">
          Real = golf strokes only (never modified). Points = side-game outcomes. Adjusted = real
          score minus game points.
        </p>
      </HoleInfoCard>

      <section className="panel recap-section recap-why-card stack-xs">
        <div className="row-between">
          <h3>Why This Hole Moved</h3>
          <RecapStatusChip tone="quick">Quick Read</RecapStatusChip>
        </div>
        <ul className="list-reset recap-why-list">
          {holeMovementRows.map((entry) => (
            <li key={entry.label} className="recap-why-list__item">
              <span>{entry.label}</span>
              <strong>{entry.value}</strong>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel stack-xs recap-section recap-outcome-section">
        <div className="row-between">
          <h3>Hole Outcome</h3>
          <RecapStatusChip tone="snapshot">Snapshot</RecapStatusChip>
        </div>
        <div className="end-summary-grid recap-outcome-grid">
          <RecapSummaryStatCard
            label="Hole Winner"
            value={formatWinnerSummary(recapData.gamePointHoleWinners)}
            detail={typeof holeWinnerScore === 'number' ? `${formatSignedPoints(holeWinnerScore)} points` : 'No score'}
          />
          <RecapSummaryStatCard
            label="Best Stroke"
            value={formatWinnerSummary(recapData.bestRealScoreHoleWinners)}
            detail={typeof bestStrokeScore === 'number' ? `${bestStrokeScore} strokes` : 'No score'}
          />
          <RecapSummaryStatCard
            label="Round Leader"
            value={formatWinnerSummary(recapData.leaderSnapshot.adjusted)}
            detail={typeof roundLeaderScore === 'number' ? `Adjusted ${roundLeaderScore}` : 'No score'}
          />
        </div>
      </section>

      <RecapLeaderboardCard
        title="Round Leaderboard"
        rows={roundLeaderboardRows}
        sortMode={roundSortMode}
        onSortChange={setRoundSortMode}
        badge={<RecapStatusChip tone="snapshot">#{roundLeaderboardRows[0]?.playerName ?? '-'}</RecapStatusChip>}
      />

      <HoleActionPanel
        summary={isLastHole ? 'Round wrap-up is ready' : `Hole ${recapData.holeNumber} saved`}
        statusSlot={<RecapStatusChip tone="quick">Next Step</RecapStatusChip>}
        buttonLabel={isLastHole ? 'Finish Round' : `Set Up Hole ${recapData.holeNumber + 1}`}
        buttonIcon={<AppIcon className="button-icon" icon={isLastHole ? ICONS.leaderboard : ICONS.golfFlag} />}
        disabled={false}
        helperText={
          isLastHole
            ? 'Next: final round summary and shareable recap.'
            : `Next: set up Hole ${recapData.holeNumber + 1} and deal.`
        }
        onContinue={progressRound}
      />

      <RecapBreakdownPanel
        expanded={breakdownExpanded}
        onToggle={() => setBreakdownExpanded((current) => !current)}
        summary="Open for detailed card, momentum, and public-card scoring."
        statusChip={
          <RecapStatusChip tone={breakdownExpanded ? 'expanded' : 'optional'}>
            {breakdownExpanded ? 'Expanded' : 'Optional'}
          </RecapStatusChip>
        }
      />

      {breakdownExpanded && (
        <section
          id="hole-recap-breakdown"
          className="stack-sm recap-breakdown-content"
          aria-label="Hole recap breakdown"
        >
          {recapData.featuredHoleRecap && (
            <section className="panel featured-hole-recap stack-xs">
              <div className="row-between">
                <h3>Featured Hole Impact</h3>
                <RecapStatusChip tone="winner" className="featured-hole-chip">
                  {recapData.featuredHoleRecap.name}
                </RecapStatusChip>
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
              <RecapStatusChip tone="count">{recapData.playerRows.length} golfers</RecapStatusChip>
            </div>
            {recapData.playerRows.map((row) => (
              <RecapPlayerOutcomeCard
                key={row.playerId}
                tone={
                  row.missionStatus === 'success'
                    ? 'success'
                    : row.missionStatus === 'failed'
                      ? 'failed'
                      : 'default'
                }
                playerName={row.playerName}
                chips={
                  <>
                    {row.isHoleWinnerByPoints && <RecapStatusChip tone="winner">Winner</RecapStatusChip>}
                    {!isPowerUpsMode && (
                      <RecapStatusChip tone={getMissionStatusChipTone(row.missionStatus)}>
                        {formatMissionStatusLabel(row.missionStatus)}
                      </RecapStatusChip>
                    )}
                    {!isPowerUpsMode && (
                      <RecapStatusChip>Card {formatSignedPoints(row.baseCardPoints)}</RecapStatusChip>
                    )}
                    {!isPowerUpsMode && (
                      <RecapStatusChip>Momentum {formatSignedPoints(row.momentumBonusPoints)}</RecapStatusChip>
                    )}
                    {!isPowerUpsMode && (
                      <RecapStatusChip>Public {formatSignedPoints(row.publicBonusPoints)}</RecapStatusChip>
                    )}
                    <RecapStatusChip tone="total">Total {formatSignedPoints(row.holePoints)}</RecapStatusChip>
                  </>
                }
              >
                <div className="stack-xs">
                  {isPowerUpsMode ? (
                    <>
                      <p className="recap-card-line">
                        {row.powerUpTitle ? `Power Up: ${row.powerUpTitle}` : 'No Power Up assigned'}
                      </p>
                      <p className="recap-card-line">
                        {row.curseTitle ? `Curse: ${row.curseTitle}` : 'No Curse assigned'}
                      </p>
                      <div className="recap-metrics recap-metrics--totals">
                        <RecapStatusChip tone={row.powerUpUsed ? 'success' : 'subtle'}>
                          {row.powerUpUsed ? 'Used' : 'Unused'}
                        </RecapStatusChip>
                        <RecapStatusChip tone="total">
                          Round Points {formatSignedPoints(row.totalGamePoints)}
                        </RecapStatusChip>
                        <RecapStatusChip tone="total">
                          Adjusted {row.totalAdjustedScore}
                        </RecapStatusChip>
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
                          <RecapStatusChip tone="snapshot">
                            Featured {formatSignedPoints(row.featuredBonusPoints)}
                          </RecapStatusChip>
                        )}
                        {row.rivalryBonus !== 0 && (
                          <RecapStatusChip tone="winner">
                            Rivalry {formatSignedPoints(row.rivalryBonus)}
                          </RecapStatusChip>
                        )}
                        {row.balanceCapAdjustment !== 0 && (
                          <RecapStatusChip>
                            Balance Cap {formatSignedPoints(row.balanceCapAdjustment)}
                          </RecapStatusChip>
                        )}
                        {row.momentumTierJumped && (
                          <RecapStatusChip tone="quick">
                            {row.momentumBeforeLabel} to {row.momentumAfterLabel}
                          </RecapStatusChip>
                        )}
                        <RecapStatusChip tone="total">
                          Round Points {formatSignedPoints(row.totalGamePoints)}
                        </RecapStatusChip>
                      </div>
                    </>
                  )}
                </div>
              </RecapPlayerOutcomeCard>
            ))}
          </section>

          {!isPowerUpsMode && recapData.publicCardRecapItems.length > 0 && (
            <section className="panel recap-section recap-public-impact stack-xs">
              <div className="row-between">
                <h3>Public Card Impact</h3>
                <RecapStatusChip tone="count">{recapData.publicCardRecapItems.length} cards</RecapStatusChip>
              </div>
              {recapData.publicCardRecapItems.map((item) => (
                <RecapPublicImpactCard
                  key={item.cardId}
                  title={`${item.cardCode} ${item.cardName}`}
                  modeLabel={<RecapStatusChip tone="snapshot">{item.modeLabel}</RecapStatusChip>}
                  summaryLine={item.summaryLine}
                >
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
                </RecapPublicImpactCard>
              ))}
            </section>
          )}

          {debugRecapMetricsEnabled && (
            <section className="panel recap-section stack-xs">
              <div className="row-between">
                <h3>UX Instrumentation</h3>
                <RecapStatusChip tone="subtle">Debug</RecapStatusChip>
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
