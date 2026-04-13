import { ICONS } from '../../app/icons.ts'
import { useEffect, useMemo, useRef, useState } from 'react'
import AppIcon from '../../components/AppIcon.tsx'
import HoleActionPanel from '../../components/HoleActionPanel.tsx'
import RecapBreakdownPanel from '../../components/RecapBreakdownPanel.tsx'
import RecapHeroCard from '../../components/RecapHeroCard.tsx'
import RecapLeaderboardCard from '../../components/RecapLeaderboardCard.tsx'
import RecapPlayerOutcomeCard from '../../components/RecapPlayerOutcomeCard.tsx'
import RecapPublicImpactCard from '../../components/RecapPublicImpactCard.tsx'
import RecapStatusChip from '../../components/RecapStatusChip.tsx'
import { hapticLightImpact, hapticSelection } from '../../capacitor/haptics.ts'
import {
  formatDuration,
  formatSignedPoints,
  getMissionResultCallout,
  getMissionSummaryFlavor,
} from './leaderboardPresentation.ts'
import { buildHoleRecapData, formatAdjustedHoleWinnersSupportingLine } from '../../logic/holeRecap.ts'
import { buildLeaderboardEntries } from '../../logic/leaderboard.ts'
import type { ScreenProps } from '../../app/screenContracts.ts'

let analyticsModulePromise: Promise<typeof import('../../logic/analytics.ts')> | null = null

function trackSummaryScreenViewedDeferred(
  roundState: ScreenProps['roundState'],
  screen: 'leaderboard',
  holeNumber: number,
): void {
  if (!analyticsModulePromise) {
    analyticsModulePromise = import('../../logic/analytics.ts')
  }

  void analyticsModulePromise
    .then(({ trackSummaryScreenViewed }) => {
      trackSummaryScreenViewed(roundState, screen, holeNumber)
    })
    .catch(() => {
      // Analytics should stay best-effort and never block recap flow.
    })
}

function LeaderboardScreen({ roundState, onNavigate, onUpdateRoundState }: ScreenProps) {
  const recapData = useMemo(() => buildHoleRecapData(roundState), [roundState])
  const isLastHole = roundState.currentHoleIndex === roundState.holes.length - 1
  const isPowerUpsMode = recapData.gameMode === 'powerUps'
  const [breakdownExpanded, setBreakdownExpanded] = useState(false)
  const advancedFromHoleIndexRef = useRef<number | null>(null)

  const holeUxMetrics = roundState.holeUxMetrics[roundState.currentHoleIndex]
  const hasPublicCardsOnHole = roundState.holeCards[roundState.currentHoleIndex].publicCards.length > 0
  const debugRecapMetricsEnabled =
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    window.localStorage.getItem('gimme-golf-debug-recap') === 'true'

  const roundLeaderboardRows = useMemo(
    () =>
      buildLeaderboardEntries(
        roundState.players,
        roundState.totalsByPlayerId,
        isPowerUpsMode ? 'realScore' : 'adjustedScore',
      ),
    [isPowerUpsMode, roundState.players, roundState.totalsByPlayerId],
  )
  const recapEvenParTotal = useMemo(
    () =>
      roundState.holes
        .slice(0, roundState.currentHoleIndex + 1)
        .reduce((sum, hole) => sum + hole.par, 0),
    [roundState.currentHoleIndex, roundState.holes],
  )

  useEffect(() => {
    trackSummaryScreenViewedDeferred(roundState, 'leaderboard', recapData.holeNumber)
  }, [recapData.holeNumber, roundState])

  const bestMomentHeadline = recapData.highlightLine
  const holeAdjustedNetSupportingLine = formatAdjustedHoleWinnersSupportingLine(recapData)
  const formatHoleScoreCalculation = (strokes: number | null, holePoints: number): string => {
    if (typeof strokes !== 'number') {
      return 'Hole score: awaiting strokes.'
    }

    if (isPowerUpsMode) {
      return `Hole score: ${strokes} actual strokes`
    }

    return `Hole score: ${strokes} - ${holePoints} = ${strokes - holePoints}`
  }

  const progressRound = () => {
    hapticLightImpact()
    const holeIndexAtClick = roundState.currentHoleIndex
    if (advancedFromHoleIndexRef.current === holeIndexAtClick) {
      return
    }
    advancedFromHoleIndexRef.current = holeIndexAtClick

    if (isLastHole) {
      onNavigate('endRound')
      return
    }

    onUpdateRoundState((currentState) => {
      if (currentState.currentHoleIndex !== holeIndexAtClick) {
        return currentState
      }

      return {
        ...currentState,
        currentHoleIndex: currentState.currentHoleIndex + 1,
      }
    })
    onNavigate('holePlay')
  }

  return (
    <section className="screen stack-sm hole-recap-screen hole-recap-screen--editorial">
      <header className="screen__header recap-header">
        <div className="screen-title">
          <AppIcon className="screen-title__icon" icon={ICONS.holeRecap} />
          <h2>Hole {recapData.holeNumber} Recap</h2>
        </div>
        <p className="muted">
          Hole {recapData.holeNumber} of {roundState.holes.length} • Par {recapData.holePar}
        </p>
      </header>

      <RecapHeroCard
        label="Best Moment"
        headline={bestMomentHeadline}
        supportingText={holeAdjustedNetSupportingLine}
      />

      <RecapLeaderboardCard
        title="Round Leaderboard"
        rows={roundLeaderboardRows}
        sortMode={isPowerUpsMode ? 'realScore' : 'adjustedScore'}
        badge={null}
        evenParTotal={recapEvenParTotal}
        metricVisibility={
          isPowerUpsMode
            ? { adjustedScore: false, realScore: true, gamePoints: false }
            : undefined
        }
        legendText={isPowerUpsMode ? 'Actual is pure strokes. Lowest score leads in Power Ups mode.' : undefined}
      />

      <HoleActionPanel
        summary={isLastHole ? 'Round wrap-up is ready' : `Hole ${recapData.holeNumber} saved`}
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
        onToggle={() => {
          hapticSelection()
          setBreakdownExpanded((current) => !current)
        }}
        summary="Open for each golfer's mission card and result."
      />

      {breakdownExpanded && (
        <section
          id="hole-recap-breakdown"
          className="stack-sm recap-breakdown-content"
          aria-label="Hole recap breakdown"
        >
          {recapData.featuredHoleRecap && (
            <section className="panel featured-hole-recap stack-xs">
              <h3>Featured Hole Impact</h3>
              <p className="label">{recapData.featuredHoleRecap.name}</p>
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
            </div>
            <p className="muted recap-card-outcomes-description">
              {isPowerUpsMode
                ? "Shows each golfer's assigned power-up and curse, plus whether the power-up was used."
                : "Shows each golfer's personal card for this hole and whether they completed it."}
            </p>
            {recapData.playerRows.map((row) => {
              const hasCard = Boolean(row.selectedCardCode && row.selectedCardName)
              const missionStatusLabel =
                row.missionStatus === 'success'
                  ? 'Completed'
                  : row.missionStatus === 'failed'
                    ? 'Failed'
                    : 'Pending'
              const missionSummaryFlavor =
                row.missionStatus === 'pending'
                  ? `${row.playerName} still has this mission pending.`
                  : getMissionSummaryFlavor(
                      row.missionStatus === 'success' ? 'success' : 'failed',
                      recapData.holeNumber,
                      row.playerName,
                    )
              const missionCallout =
                row.missionStatus === 'pending'
                  ? 'Mission is still pending resolution.'
                  : getMissionResultCallout(
                      row.missionStatus === 'success' ? 'success' : 'failed',
                      row.selectedCardPoints,
                    )
              const missionCardToneClass =
                row.missionStatus === 'success'
                  ? 'recap-outcome-mission-card--success'
                  : row.missionStatus === 'failed'
                    ? 'recap-outcome-mission-card--failed'
                    : 'recap-outcome-mission-card--pending'
              const summaryFlavorToneClass =
                row.missionStatus === 'success'
                  ? 'recap-player-outcome-card__summary-flavor--success'
                  : row.missionStatus === 'failed'
                    ? 'recap-player-outcome-card__summary-flavor--failed'
                    : 'recap-player-outcome-card__summary-flavor--pending'
              const missionCalloutToneClass =
                row.missionStatus === 'success'
                  ? 'recap-outcome-mission-card__callout--success'
                  : row.missionStatus === 'failed'
                    ? 'recap-outcome-mission-card__callout--failed'
                    : 'recap-outcome-mission-card__callout--pending'

              return (
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
                  toggleLabel={isPowerUpsMode ? 'Outcomes' : 'Card'}
                  collapsible={false}
                  chips={
                    isPowerUpsMode ? (
                      <div className="stack-xs recap-player-outcome-card__summary-block recap-player-outcome-card__summary-block--powerups">
                        <p className="recap-player-outcome-card__card-headline recap-player-outcome-card__card-headline--powerups">
                          {row.powerUpTitle ? `Power Up: ${row.powerUpTitle}` : 'No Power Up assigned'}
                        </p>
                        <p className="recap-player-outcome-card__card-headline recap-player-outcome-card__card-headline--powerups">
                          {row.curseTitle ? `Curse: ${row.curseTitle}` : 'No Curse assigned'}
                        </p>
                        <div className="recap-player-outcome-card__summary-badges recap-player-outcome-card__summary-badges--powerups">
                          {row.isHoleWinnerByPoints && <RecapStatusChip tone="winner">Winner</RecapStatusChip>}
                          <RecapStatusChip tone="total">
                            {typeof row.strokes === 'number' ? `${row.strokes} strokes` : 'Strokes pending'}
                          </RecapStatusChip>
                          <RecapStatusChip tone={row.powerUpUsed ? 'success' : 'subtle'}>
                            {row.powerUpUsed ? 'Power Up Used' : 'Power Up Unused'}
                          </RecapStatusChip>
                          <RecapStatusChip tone="total">Round Strokes {row.totalRealScore}</RecapStatusChip>
                        </div>
                      </div>
                    ) : (
                      <div className="stack-xs recap-player-outcome-card__summary-block">
                        <p className="recap-player-outcome-card__card-headline">
                          {hasCard
                            ? `${row.selectedCardCode} • ${row.selectedCardName}`
                            : 'No personal card assigned'}
                        </p>
                        <p
                          className={`recap-player-outcome-card__summary-flavor ${summaryFlavorToneClass}`}
                        >
                          {hasCard ? missionSummaryFlavor : 'No challenge was tracked for this golfer on this hole.'}
                        </p>
                        <div className="recap-player-outcome-card__summary-badges">
                          <p className="muted">
                            {formatHoleScoreCalculation(row.strokes, row.holePoints)}
                          </p>
                          {hasCard ? (
                            <p className="muted">
                              Outcome: {missionStatusLabel} • Reward {formatSignedPoints(row.selectedCardPoints)} pts
                            </p>
                          ) : (
                            <RecapStatusChip tone="subtle">No Card</RecapStatusChip>
                          )}
                        </div>
                      </div>
                    )
                  }
                >
                  <div className="stack-xs">
                    {!isPowerUpsMode && (
                      <>
                        {row.selectedCardCode && row.selectedCardName ? (
                          <article className={`recap-outcome-mission-card ${missionCardToneClass}`}>
                            <header className="row-between setup-row-wrap recap-outcome-mission-card__header">
                              <strong className="recap-outcome-mission-card__title">
                                {row.selectedCardCode} - {row.selectedCardName}
                              </strong>
                            </header>
                            <p className="recap-outcome-mission-card__description">
                              {row.selectedCardDescription ?? 'No description available'}
                            </p>
                            <p className="muted">
                              {formatHoleScoreCalculation(row.strokes, row.holePoints)}
                            </p>
                            <p className="muted">
                              Outcome: {missionStatusLabel} • Reward {formatSignedPoints(row.selectedCardPoints)} pts
                            </p>
                            <p className={`recap-outcome-mission-card__callout ${missionCalloutToneClass}`}>
                              {missionCallout}
                            </p>
                          </article>
                        ) : (
                          <article className="recap-outcome-mission-card recap-outcome-mission-card--empty">
                            <p className="recap-outcome-mission-card__description">
                              No personal card selected for this golfer on this hole.
                            </p>
                          </article>
                        )}
                      </>
                    )}
                  </div>
                </RecapPlayerOutcomeCard>
              )
            })}
          </section>

          {!isPowerUpsMode && recapData.publicCardRecapItems.length > 0 && (
            <section className="panel recap-section recap-public-impact stack-xs">
              <div className="row-between">
                <h3>Public Card Impact</h3>
                <RecapStatusChip tone="count">{recapData.publicCardRecapItems.length} cards</RecapStatusChip>
              </div>
              {recapData.publicCardRecapItems.map((item) => {
                const publicCard = roundState.holeCards[roundState.currentHoleIndex].publicCards.find(
                  (c) => c.id === item.cardId,
                )
                return (
                  <RecapPublicImpactCard
                    key={item.cardId}
                    title={`${item.cardCode} ${item.cardName}`}
                    modeLabel={<RecapStatusChip tone="snapshot">{item.modeLabel}</RecapStatusChip>}
                    summaryLine={item.summaryLine}
                    description={publicCard?.description}
                    rulesText={publicCard?.rulesText}
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
                )
              })}
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
