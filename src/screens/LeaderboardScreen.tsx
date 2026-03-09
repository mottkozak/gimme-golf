import { buildHoleRecapData, formatWinnerSummary } from '../logic/holeRecap.ts'
import type { ScreenProps } from './types.ts'

function LeaderboardScreen({ roundState, onNavigate, onUpdateRoundState }: ScreenProps) {
  const recapData = buildHoleRecapData(roundState)
  const isPowerUpsMode = recapData.gameMode === 'powerUps'
  const isLastHole = roundState.currentHoleIndex === roundState.holes.length - 1
  const playerRows = [...recapData.playerRows]
    .sort((rowA, rowB) => {
      if (rowA.holePoints !== rowB.holePoints) {
        return rowB.holePoints - rowA.holePoints
      }

      const strokesA = rowA.strokes
      const strokesB = rowB.strokes
      if (typeof strokesA === 'number' && typeof strokesB === 'number' && strokesA !== strokesB) {
        return strokesA - strokesB
      }
      return rowA.playerName.localeCompare(rowB.playerName)
    })

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
          <h2>Hole {recapData.holeNumber} Recap</h2>
          <span className="chip">Par {recapData.holePar}</span>
        </div>
        <p className="recap-highlight-label">Top Moment</p>
        <p className="recap-highlight">{recapData.highlightLine}</p>
      </header>

      {recapData.featuredHoleRecap && (
        <section className="panel stack-xs recap-section featured-hole-recap">
          <div className="row-between">
            <h3>Featured Hole: {recapData.featuredHoleRecap.name}</h3>
            <span className="chip">Special</span>
          </div>
          <p className="muted">{recapData.featuredHoleRecap.shortDescription}</p>
          <p>{recapData.featuredHoleRecap.impactLine}</p>
          <p className="muted">
            Most helped:{' '}
            {recapData.featuredHoleRecap.topBeneficiaries.length > 0
              ? recapData.featuredHoleRecap.topBeneficiaries.join(', ')
              : 'No direct bonus winner'}
          </p>
          <p className="muted">
            Leaderboard impact:{' '}
            {recapData.featuredHoleRecap.leaderboardImpact ? 'Yes' : 'No'}
          </p>
        </section>
      )}

      <section className="panel stack-xs recap-section">
        <h3>Player Recap</h3>
        <div className="stack-xs">
          {playerRows.map((row) => (
            <article
              key={row.playerId}
              className={`panel inset recap-player-card stack-xs ${
                row.missionStatus === 'success'
                  ? 'recap-player-card--success'
                  : row.missionStatus === 'failed'
                    ? 'recap-player-card--failed'
                    : ''
              }`}
            >
              <div className="row-between">
                <strong>{row.playerName}</strong>
                <div className="button-row">
                  {isPowerUpsMode && (
                    <span className="chip badge-featured">
                      Power Up {row.powerUpUsed ? 'Used' : 'Unused'}
                    </span>
                  )}
                  {row.isHoleWinnerByPoints && <span className="chip badge-winner">Hole Winner</span>}
                  {!isPowerUpsMode && row.missionStatus === 'success' && (
                    <span className="chip badge-success">Mission Complete</span>
                  )}
                  {!isPowerUpsMode && row.missionStatus === 'failed' && (
                    <span className="chip badge-failure">Mission Failed</span>
                  )}
                  {row.publicBonusPoints !== 0 && (
                    <span className="chip badge-public">Public Card Swing</span>
                  )}
                  {row.rivalryBonus > 0 && (
                    <span className="chip badge-featured">Rivalry Winner</span>
                  )}
                  {!isPowerUpsMode && roundState.config.toggles.momentumBonuses && row.momentumTierJumped && (
                    <span className="chip badge-momentum">Momentum Tier Up</span>
                  )}
                </div>
              </div>

              <p className="muted recap-card-line">
                {isPowerUpsMode
                  ? `Power Up: ${row.powerUpTitle ?? 'None assigned'}`
                  : `Card: ${row.selectedCardName ?? 'No personal card'} ${
                      row.selectedCardCode ? `(${row.selectedCardCode})` : ''
                    }`}
              </p>

              {isPowerUpsMode ? (
                <div className="recap-metrics recap-metrics--primary">
                  <span className="recap-pill">
                    Power Up: <strong>{row.powerUpUsed ? 'Used' : 'Unused'}</strong>
                  </span>
                  <span className="recap-pill">Strokes {row.strokes ?? '-'}</span>
                  <span className="recap-pill recap-pill--hole">
                    Hole {row.holePoints > 0 ? '+' : ''}
                    {row.holePoints}
                  </span>
                </div>
              ) : (
                <div className="recap-metrics recap-metrics--primary">
                  <span
                    className={`recap-pill ${
                      row.missionStatus === 'success'
                        ? 'recap-pill--success'
                        : row.missionStatus === 'failed'
                          ? 'recap-pill--failed'
                          : ''
                    }`}
                  >
                    Success:{' '}
                    <strong>
                      {row.missionStatus === 'success'
                        ? 'Yes'
                        : row.missionStatus === 'failed'
                          ? 'No'
                          : '-'}
                    </strong>
                  </span>
                  <span className="recap-pill">
                    Base {row.baseCardPoints > 0 ? '+' : ''}
                    {row.baseCardPoints}
                  </span>
                  <span className="recap-pill recap-pill--featured">
                    Featured {row.featuredBonusPoints > 0 ? '+' : ''}
                    {row.featuredBonusPoints}
                  </span>
                  <span className="recap-pill recap-pill--bonus">
                    Bonus {row.bonusPoints > 0 ? '+' : ''}
                    {row.bonusPoints}
                  </span>
                  <span className="recap-pill recap-pill--hole">
                    Hole {row.holePoints > 0 ? '+' : ''}
                    {row.holePoints}
                  </span>
                  <span className="recap-pill">Strokes {row.strokes ?? '-'}</span>
                </div>
              )}

              {!isPowerUpsMode && roundState.config.toggles.momentumBonuses && (
                <div className="recap-metrics recap-metrics--momentum">
                  <span
                    className={`recap-pill ${
                      row.momentumTierJumped ? 'recap-pill--momentum-up' : ''
                    }`}
                  >
                    Momentum: {row.momentumBeforeLabel} ({row.streakBefore}) {'->'}{' '}
                    {row.momentumAfterLabel} ({row.streakAfter})
                  </span>
                  {row.momentumBonusPoints > 0 && (
                    <span className="recap-pill recap-pill--bonus">
                      +{row.momentumBonusPoints} momentum
                    </span>
                  )}
                  {row.shieldApplied && <span className="recap-pill">Comeback Shield</span>}
                </div>
              )}

              <div className="recap-metrics recap-metrics--totals">
                <span className="recap-pill recap-pill--total">
                  Total Game: <strong>{row.totalGamePoints}</strong>
                </span>
                <span className="recap-pill recap-pill--total">
                  Total Real: <strong>{row.totalRealScore}</strong>
                </span>
                <span className="recap-pill recap-pill--total">
                  Adjusted: <strong>{row.totalAdjustedScore}</strong>
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {recapData.publicCardRecapItems.length > 0 && (
        <section className="panel stack-xs recap-section">
          <h3>Public Cards</h3>
          {recapData.publicCardRecapItems.map((item) => (
            <article key={item.cardId} className="panel inset stack-xs">
              <div className="row-between">
                <strong>
                  {item.cardName} ({item.cardCode})
                </strong>
                <span className="chip">{item.modeLabel}</span>
              </div>
              <p className="muted">{item.summaryLine}</p>
              {item.impactRows.length > 0 ? (
                <div className="stack-xs">
                  {item.impactRows.map((impact) => (
                    <div key={impact.playerId} className="row-between recap-impact-row">
                      <span>{impact.playerName}</span>
                      <strong className={impact.delta >= 0 ? 'recap-impact-plus' : 'recap-impact-minus'}>
                        {impact.delta > 0 ? '+' : ''}
                        {impact.delta}
                      </strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">No direct point swing from this card.</p>
              )}
            </article>
          ))}
        </section>
      )}

      <section className="panel stack-xs recap-section">
        <h3>Hole Winners</h3>
        <p className="muted">
          Game points: {formatWinnerSummary(recapData.gamePointHoleWinners)}
        </p>
        <p className="muted">
          Best real score: {formatWinnerSummary(recapData.bestRealScoreHoleWinners)}
        </p>
      </section>

      <section className="panel stack-xs recap-section">
        <h3>Leader Snapshot</h3>
        <p className="muted">Real: {formatWinnerSummary(recapData.leaderSnapshot.real)}</p>
        <p className="muted">Points: {formatWinnerSummary(recapData.leaderSnapshot.game)}</p>
        <p className="muted">Adjusted: {formatWinnerSummary(recapData.leaderSnapshot.adjusted)}</p>
      </section>

      <section className="panel stack-xs recap-next">
        <button type="button" className="button-primary" onClick={progressRound}>
          {isLastHole ? 'Finish Round' : `Go To Hole ${recapData.holeNumber + 1}`}
        </button>
      </section>
    </section>
  )
}

export default LeaderboardScreen
