import { ICONS } from '../app/icons.ts'
import { useEffect, useMemo, useState } from 'react'
import AppIcon from '../components/AppIcon.tsx'
import HoleActionPanel from '../components/HoleActionPanel.tsx'
import RecapBreakdownPanel from '../components/RecapBreakdownPanel.tsx'
import RecapHeroCard from '../components/RecapHeroCard.tsx'
import RecapLeaderboardCard from '../components/RecapLeaderboardCard.tsx'
import RecapPlayerOutcomeCard from '../components/RecapPlayerOutcomeCard.tsx'
import RecapPublicImpactCard from '../components/RecapPublicImpactCard.tsx'
import RecapStatusChip from '../components/RecapStatusChip.tsx'
import RecapSummaryStatCard from '../components/RecapSummaryStatCard.tsx'
import { trackSummaryScreenViewed } from '../logic/analytics.ts'
import {
  buildGolfScoreToParByPlayerId,
  describeGolfScoreToPar,
  formatGolfScoreToPar,
  getBestGolfScoreSummary,
  getGolfScoreToneClass,
} from '../logic/golfScore.ts'
import {
  buildHoleRecapData,
  formatWinnerSummary,
} from '../logic/holeRecap.ts'
import { buildLeaderboardEntries, type LeaderboardSortMode } from '../logic/leaderboard.ts'
import { formatPlayerNames, getDisplayPlayerName } from '../logic/playerNames.ts'
import type { ScreenProps } from './types.ts'

function formatSignedPoints(value: number): string {
  return `${value > 0 ? '+' : ''}${value}`
}

function getMissionSummaryFlavor(status: 'success' | 'failed', holeNumber: number, playerName: string): string {
  const successLines = [
    `${playerName} cashed it in with calm tempo.`,
    `${playerName} converted and grabbed the bonus clean.`,
    `${playerName} stepped up and closed the mission.`,
    `${playerName} played it like Sunday pressure.`,
  ]
  const failedLines = [
    `${playerName} pushed it right and missed the bonus.`,
    `${playerName} came up short on this one.`,
    `${playerName} had the look but couldn’t convert.`,
    `${playerName} left this mission on the table.`,
  ]

  const lines = status === 'success' ? successLines : failedLines
  const seed = holeNumber + playerName.length
  return lines[seed % lines.length]
}

function getMissionResultCallout(status: 'success' | 'failed', points: number): string {
  if (status === 'success') {
    return `Reward collected: ${formatSignedPoints(points)} points swing in the right direction.`
  }

  return `No reward collected: ${formatSignedPoints(points)} was available on completion.`
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

function LeaderboardScreen({ roundState, onNavigate, onUpdateRoundState }: ScreenProps) {
  const recapData = useMemo(() => buildHoleRecapData(roundState), [roundState])
  const isLastHole = roundState.currentHoleIndex === roundState.holes.length - 1
  const isPowerUpsMode = recapData.gameMode === 'powerUps'
  const [roundSortMode, setRoundSortMode] = useState<LeaderboardSortMode>('adjustedScore')
  const [breakdownExpanded, setBreakdownExpanded] = useState(false)

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
  const golfScoreToParByPlayerId = useMemo(
    () => buildGolfScoreToParByPlayerId(roundState),
    [roundState],
  )
  const bestGolfScoreSummary = useMemo(
    () => getBestGolfScoreSummary(golfScoreToParByPlayerId),
    [golfScoreToParByPlayerId],
  )
  const displayNameByPlayerId = useMemo(
    () =>
      Object.fromEntries(
        roundState.players.map((player, playerIndex) => [
          player.id,
          getDisplayPlayerName(player.name, playerIndex),
        ]),
      ),
    [roundState.players],
  )

  useEffect(() => {
    trackSummaryScreenViewed(roundState, 'leaderboard', recapData.holeNumber)
  }, [recapData.holeNumber, roundState])

  const holeWinnerScore = recapData.gamePointHoleWinners.score
  const roundLeaderScore = recapData.leaderSnapshot.adjusted.score
  const isHolePointsTie = recapData.gamePointHoleWinners.playerNames.length > 1
  const holeWinnerNames =
    recapData.gamePointHoleWinners.playerNames.length > 0
      ? formatPlayerNames(recapData.gamePointHoleWinners.playerNames)
      : '-'
  const bestMomentHeadline = recapData.highlightLine
  const holeOutcomeLabel = isHolePointsTie ? 'Hole Leaders' : 'Hole Winner'
  const holeOutcomeDetail =
    typeof holeWinnerScore === 'number'
      ? `${isHolePointsTie ? 'Tied at' : 'Won with'} ${formatSignedPoints(holeWinnerScore)} points`
      : 'No score'
  const bestGolfScorePlayerNames =
    bestGolfScoreSummary.playerIds.length > 0
      ? formatPlayerNames(
          bestGolfScoreSummary.playerIds.map((playerId) => displayNameByPlayerId[playerId] ?? playerId),
        )
      : '-'

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
        supportingText={isHolePointsTie
          ? `Hole leaders: ${holeWinnerNames}${
              typeof holeWinnerScore === 'number' ? ` (${formatSignedPoints(holeWinnerScore)})` : ''
            }`
          : `Hole winner: ${formatWinnerSummary(recapData.gamePointHoleWinners)}${
              typeof holeWinnerScore === 'number' ? ` (${formatSignedPoints(holeWinnerScore)})` : ''
            }`}
      />

      <section className="panel stack-xs recap-section recap-outcome-section">
        <h3>Hole Outcome</h3>
        <div className="end-summary-grid recap-outcome-grid">
          <RecapSummaryStatCard
            label={`${holeOutcomeLabel} (Game Points)`}
            value={holeWinnerNames}
            detail={holeOutcomeDetail}
          />
          <RecapSummaryStatCard
            label="Round Leader (Adjusted)"
            value={formatWinnerSummary(recapData.leaderSnapshot.adjusted)}
            detail={typeof roundLeaderScore === 'number' ? `Adjusted ${roundLeaderScore}` : 'No score'}
          />
          <RecapSummaryStatCard
            label="Best Golf Score (To Par)"
            value={formatGolfScoreToPar(bestGolfScoreSummary.score)}
            valueClassName={getGolfScoreToneClass(bestGolfScoreSummary.score)}
            detail={
              bestGolfScoreSummary.score !== null
                ? `${bestGolfScorePlayerNames} • ${describeGolfScoreToPar(bestGolfScoreSummary.score)}`
                : 'No strokes entered yet'
            }
          />
        </div>
      </section>

      <RecapLeaderboardCard
        title="Round Leaderboard"
        rows={roundLeaderboardRows}
        sortMode={roundSortMode}
        onSortChange={setRoundSortMode}
        golfScoreToParByPlayerId={golfScoreToParByPlayerId}
        badge={null}
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
        onToggle={() => setBreakdownExpanded((current) => !current)}
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
              <RecapStatusChip tone="count">{recapData.playerRows.length} golfers</RecapStatusChip>
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
                  chips={
                    isPowerUpsMode ? (
                      <>
                        {row.isHoleWinnerByPoints && <RecapStatusChip tone="winner">Winner</RecapStatusChip>}
                        <RecapStatusChip tone="total">Total {formatSignedPoints(row.holePoints)}</RecapStatusChip>
                      </>
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
