import { ICONS } from '../app/icons.ts'
import { useMemo, useState } from 'react'
import LeaderboardTable from '../components/LeaderboardTable.tsx'
import {
  buildHoleRecapData,
  formatWinnerSummary,
  type HoleRecapPlayerRow,
} from '../logic/holeRecap.ts'
import { buildLeaderboardEntries, type LeaderboardSortMode } from '../logic/leaderboard.ts'
import type { PlayerTotals } from '../types/game.ts'
import type { ScreenProps } from './types.ts'

function buildHoleTotalsByPlayerId(
  recapData: ReturnType<typeof buildHoleRecapData>,
): Record<string, PlayerTotals> {
  return Object.fromEntries(
    recapData.playerRows.map((row) => {
      const realScore = row.strokes ?? 0
      const gamePoints = row.holePoints
      return [
        row.playerId,
        {
          realScore,
          gamePoints,
          adjustedScore: realScore - gamePoints,
        },
      ]
    }),
  )
}

function formatSignedPoints(value: number): string {
  return `${value > 0 ? '+' : ''}${value}`
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
    { label: 'Hole Total', value: row.holePoints },
  ]

  return drivers.map((driver) => ({
    ...driver,
    tone: getPointDriverTone(driver.value),
  }))
}

function getMissionStatusClass(missionStatus: 'pending' | 'success' | 'failed'): string {
  if (missionStatus === 'success') {
    return 'status-pill status-success'
  }

  if (missionStatus === 'failed') {
    return 'status-pill status-failed'
  }

  return 'status-pill status-pending'
}

function LeaderboardScreen({ roundState, onNavigate, onUpdateRoundState }: ScreenProps) {
  const recapData = useMemo(() => buildHoleRecapData(roundState), [roundState])
  const isLastHole = roundState.currentHoleIndex === roundState.holes.length - 1
  const isPowerUpsMode = recapData.gameMode === 'powerUps'
  const [roundSortMode, setRoundSortMode] = useState<LeaderboardSortMode>('adjustedScore')
  const [holeSortMode, setHoleSortMode] = useState<LeaderboardSortMode>('adjustedScore')
  const momentumJumpCount = recapData.playerRows.filter((row) => row.momentumTierJumped).length
  const publicSwingCount = recapData.publicCardRecapItems.reduce(
    (total, item) => total + item.impactRows.length,
    0,
  )
  const strongestHoleGain = [...recapData.playerRows].sort(
    (rowA, rowB) => rowB.holePoints - rowA.holePoints,
  )[0]

  const roundLeaderboardRows = useMemo(
    () => buildLeaderboardEntries(roundState.players, roundState.totalsByPlayerId, roundSortMode),
    [roundSortMode, roundState.players, roundState.totalsByPlayerId],
  )
  const holeTotalsByPlayerId = useMemo(() => buildHoleTotalsByPlayerId(recapData), [recapData])
  const holeLeaderboardRows = useMemo(
    () => buildLeaderboardEntries(roundState.players, holeTotalsByPlayerId, holeSortMode),
    [holeSortMode, holeTotalsByPlayerId, roundState.players],
  )

  const progressRound = () => {
    if (isLastHole) {
      onNavigate('endRound')
      return
    }

    onUpdateRoundState((currentState) => ({
      ...currentState,
      currentHoleIndex: currentState.currentHoleIndex + 1,
    }))
    onNavigate('holeSetup')
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
        <p className="recap-highlight-label">Top Moment</p>
        <p className="recap-highlight">{recapData.highlightLine}</p>
      </header>

      <section className="panel stack-xs">
        <div className="row-between">
          <h3>Hole Outcome</h3>
          <span className="chip">Snapshot</span>
        </div>
        <div className="end-summary-grid">
          <article className="summary-stat">
            <p className="label">Hole Points Winner</p>
            <strong>{formatWinnerSummary(recapData.gamePointHoleWinners)}</strong>
            <p>Best game points on this hole</p>
          </article>
          <article className="summary-stat">
            <p className="label">Best Stroke Score</p>
            <strong>{formatWinnerSummary(recapData.bestRealScoreHoleWinners)}</strong>
            <p>Lowest real score on this hole</p>
          </article>
          <article className="summary-stat">
            <p className="label">Round Adjusted Leader</p>
            <strong>{formatWinnerSummary(recapData.leaderSnapshot.adjusted)}</strong>
            <p>Current best adjusted total</p>
          </article>
        </div>
      </section>

      <section className="panel recap-section stack-xs">
        <div className="row-between">
          <h3>Why This Hole Moved</h3>
          <span className="chip">Highlights</span>
        </div>
        <p className="muted">{recapData.highlightLine}</p>
        {!isPowerUpsMode && strongestHoleGain && (
          <p className="muted">
            Best hole gain: {strongestHoleGain.playerName} ({formatSignedPoints(strongestHoleGain.holePoints)}).
          </p>
        )}
        {!isPowerUpsMode && (
          <p className="muted">
            Momentum jumps: {momentumJumpCount} | Public-card swings: {publicSwingCount}
          </p>
        )}
      </section>

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
              Top beneficiary:{' '}
              {recapData.featuredHoleRecap.topBeneficiaries.join(', ')}
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
          <h3>{isPowerUpsMode ? 'Power-Up Outcomes' : 'Card & Momentum Outcomes'}</h3>
          <span className="chip">{recapData.playerRows.length} golfers</span>
        </div>
        {recapData.playerRows.map((row) => (
          <article
            key={row.playerId}
            className={`recap-item recap-player-card ${
              row.missionStatus === 'success'
                ? 'recap-player-card--success'
                : row.missionStatus === 'failed'
                  ? 'recap-player-card--failed'
                  : ''
            }`}
          >
            <div className="row-between">
              <strong>{row.playerName}</strong>
              <div className="recap-metrics recap-metrics--primary">
                {row.isHoleWinnerByPoints && <span className="recap-pill badge-winner">Hole Winner</span>}
                {!isPowerUpsMode && (
                  <span className={getMissionStatusClass(row.missionStatus)}>{row.missionStatus}</span>
                )}
                <span className="recap-pill recap-pill--hole">
                  Hole {formatSignedPoints(row.holePoints)}
                </span>
                <span className="recap-pill recap-pill--total">
                  {typeof row.strokes === 'number' ? `${row.strokes} strokes` : 'No score'}
                </span>
              </div>
            </div>

            {isPowerUpsMode ? (
              <>
                <p className="recap-card-line">
                  {row.powerUpTitle ? `Power Up: ${row.powerUpTitle}` : 'No Power Up assigned'}
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
                  {row.baseCardPoints !== 0 && (
                    <span className="recap-pill recap-pill--bonus">
                      Card {formatSignedPoints(row.baseCardPoints)}
                    </span>
                  )}
                  {row.featuredBonusPoints !== 0 && (
                    <span className="recap-pill recap-pill--featured">
                      Featured {formatSignedPoints(row.featuredBonusPoints)}
                    </span>
                  )}
                  {row.momentumBonusPoints !== 0 && (
                    <span className="recap-pill recap-pill--bonus">
                      Momentum {formatSignedPoints(row.momentumBonusPoints)}
                    </span>
                  )}
                  {row.publicBonusPoints !== 0 && (
                    <span className="recap-pill badge-public">
                      Public {formatSignedPoints(row.publicBonusPoints)}
                    </span>
                  )}
                  {row.rivalryBonus !== 0 && (
                    <span className="recap-pill badge-featured">
                      Rivalry {formatSignedPoints(row.rivalryBonus)}
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
          </article>
        ))}
      </section>

      {!isPowerUpsMode && recapData.publicCardRecapItems.length > 0 && (
        <section className="panel recap-section stack-xs">
          <div className="row-between">
            <h3>Public Card Swings</h3>
            <span className="chip">{recapData.publicCardRecapItems.length} cards</span>
          </div>
          {recapData.publicCardRecapItems.map((item) => (
            <article key={item.cardId} className="recap-item stack-xs">
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

      <LeaderboardTable
        title="Round Leaderboard"
        rows={roundLeaderboardRows}
        sortMode={roundSortMode}
        onSortChange={setRoundSortMode}
        showMomentum={false}
      />

      <LeaderboardTable
        title="Hole Leaderboard"
        rows={holeLeaderboardRows}
        sortMode={holeSortMode}
        onSortChange={setHoleSortMode}
        showMomentum={false}
      />

      <section className="panel stack-xs recap-next">
        <button type="button" className="button-primary" onClick={progressRound}>
          <img
            className="button-icon"
            src={isLastHole ? ICONS.leaderboard : ICONS.golfFlag}
            alt=""
            aria-hidden="true"
          />
          {isLastHole ? 'Finish Round' : `Go To Hole ${recapData.holeNumber + 1}`}
        </button>
      </section>
    </section>
  )
}

export default LeaderboardScreen
