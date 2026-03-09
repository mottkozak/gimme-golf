import { ICONS } from '../app/icons.ts'
import HoleSummaryList from '../components/HoleSummaryList.tsx'
import LeaderboardTable from '../components/LeaderboardTable.tsx'
import { computeRoundAwards } from '../logic/awards.ts'
import { buildLeaderboardEntries } from '../logic/leaderboard.ts'
import { formatPlayerNames } from '../logic/playerNames.ts'
import { getCurrentMomentumStateByPlayerId } from '../logic/streaks.ts'
import type { LeaderboardEntry } from '../types/game.ts'
import type { ScreenProps } from './types.ts'

const MAJOR_AWARD_IDS = new Set(['mvp', 'mostClutch', 'missionMachine', 'biggestComeback'])

function getLeaderboardWinners(
  rows: LeaderboardEntry[],
  metric: 'realScore' | 'gamePoints' | 'adjustedScore',
): { names: string; value: number | null } {
  if (rows.length === 0) {
    return {
      names: '-',
      value: null,
    }
  }

  const values = rows.map((row) => row[metric])
  const winningValue = metric === 'gamePoints' ? Math.max(...values) : Math.min(...values)
  const winnerNames = rows
    .filter((row) => row[metric] === winningValue)
    .map((row) => row.playerName)

  return {
    names: formatPlayerNames(winnerNames),
    value: winningValue,
  }
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

function EndRoundScreen({ roundState, onNavigate, onResetRound }: ScreenProps) {
  const leaderboardRows = buildLeaderboardEntries(
    roundState.players,
    roundState.totalsByPlayerId,
    'adjustedScore',
  )
  const realRows = buildLeaderboardEntries(roundState.players, roundState.totalsByPlayerId, 'realScore')
  const pointsRows = buildLeaderboardEntries(roundState.players, roundState.totalsByPlayerId, 'gamePoints')

  const realWinner = getLeaderboardWinners(realRows, 'realScore')
  const pointsWinner = getLeaderboardWinners(pointsRows, 'gamePoints')
  const adjustedWinner = getLeaderboardWinners(leaderboardRows, 'adjustedScore')
  const momentumByPlayerId = getCurrentMomentumStateByPlayerId(
    roundState.players,
    roundState.holes,
    roundState.holeCards,
    roundState.holeResults,
    roundState.config.toggles.momentumBonuses,
  )

  const awardsSummary = computeRoundAwards(roundState)
  const majorAwards = awardsSummary.awards.filter((award) => MAJOR_AWARD_IDS.has(award.awardId))
  const funAwards = awardsSummary.awards.filter((award) => !MAJOR_AWARD_IDS.has(award.awardId))
  const orderedAwards = [...majorAwards, ...funAwards]

  const adjustedWinningScore = adjustedWinner.value
  const adjustedWinnerRows = leaderboardRows.filter(
    (row) => adjustedWinningScore !== null && row.adjustedScore === adjustedWinningScore,
  )
  const heroWinnerNames = formatPlayerNames(adjustedWinnerRows.map((row) => row.playerName))
  const heroWinnerRow = adjustedWinnerRows[0] ?? leaderboardRows[0] ?? null

  return (
    <section className="screen stack-sm end-round-screen">
      <header className="screen__header end-round-header">
        <div className="screen-title">
          <img className="screen-title__icon" src={ICONS.leaderboard} alt="" aria-hidden="true" />
          <h2>Round Summary</h2>
        </div>
        <p className="muted">Final recap after {roundState.holes.length} holes.</p>
      </header>

      <section className="panel end-round-hero stack-xs" aria-live="polite">
        <p className="label">Round Winner</p>
        <p className="end-round-hero__title">
          {heroWinnerNames !== '-' ? `${heroWinnerNames} ${adjustedWinnerRows.length > 1 ? 'Win' : 'Wins'} The Round` : 'Round Complete'}
        </p>
        <div className="end-round-hero__metrics">
          <div className="end-round-hero__metric">
            <span className="label">Game Points</span>
            <strong className={heroWinnerRow ? getScoreToneClass(heroWinnerRow.gamePoints) : 'score-neutral'}>
              {heroWinnerRow ? formatSignedPoints(heroWinnerRow.gamePoints) : '-'}
            </strong>
          </div>
          <div className="end-round-hero__metric">
            <span className="label">Adjusted Score</span>
            <strong className="score-neutral">{heroWinnerRow ? heroWinnerRow.adjustedScore : '-'}</strong>
          </div>
        </div>
      </section>

      <section className="panel stack-xs end-round-results">
        <div className="row-between">
          <h3>Round Results</h3>
          <span className="chip">Final Leaders</span>
        </div>
        <div className="end-round-results__list">
          <div className="end-round-results__row">
            <span className="end-round-results__label">Real Score Winner</span>
            <span className="end-round-results__value score-neutral">
              {realWinner.names} {realWinner.value !== null ? `(${realWinner.value})` : ''}
            </span>
          </div>
          <div className="end-round-results__row">
            <span className="end-round-results__label">Game Points Winner</span>
            <span className={`end-round-results__value ${getScoreToneClass(pointsWinner.value ?? 0)}`}>
              {pointsWinner.names} {pointsWinner.value !== null ? `(${formatSignedPoints(pointsWinner.value)})` : ''}
            </span>
          </div>
          <div className="end-round-results__row">
            <span className="end-round-results__label">Adjusted Winner</span>
            <span className="end-round-results__value score-neutral">
              {adjustedWinner.names} {adjustedWinner.value !== null ? `(${adjustedWinner.value})` : ''}
            </span>
          </div>
        </div>
      </section>

      <LeaderboardTable
        title="Round Leaderboard"
        rows={leaderboardRows}
        momentumByPlayerId={momentumByPlayerId}
      />

      <section className="panel stack-xs end-round-awards">
        <details>
          <summary className="end-round-disclosure__summary row-between">
            <h3>Round Awards</h3>
            <span className="chip">{orderedAwards.length} awards</span>
          </summary>
          <p className="muted">{awardsSummary.roundPersonalityLine}</p>
          <div className="award-carousel" role="list" aria-label="Round awards">
            {orderedAwards.map((award) => (
              <article
                key={award.awardId}
                className={`award-row ${MAJOR_AWARD_IDS.has(award.awardId) ? 'award-row--major' : 'award-row--fun'}`}
                role="listitem"
              >
                <div className="row-between">
                  <p className="award-title">{award.awardName}</p>
                  <span className="chip">{award.shortLabel}</span>
                </div>
                <p className="award-winner">
                  {formatPlayerNames(award.winners.map((winner) => winner.playerName))}
                  {award.isTie ? ' (Tie)' : ''}
                </p>
                <p className="award-explanation">{award.explanation}</p>
                <p className="award-stat">{award.supportingStat}</p>
              </article>
            ))}
          </div>
        </details>
      </section>

      <section className="panel stack-xs end-round-holes">
        <details>
          <summary className="end-round-disclosure__summary row-between">
            <h3>Per-Hole Summary</h3>
            <span className="chip">Tap to Expand</span>
          </summary>
          <p className="muted">
            {roundState.config.gameMode === 'powerUps'
              ? 'Compact scorecards. Tap a hole for full detail.'
              : 'Compact scorecards with point swings. Tap a hole for full detail.'}
          </p>
          <HoleSummaryList
            players={roundState.players}
            holes={roundState.holes}
            holeCards={roundState.holeCards}
            holeResults={roundState.holeResults}
            momentumEnabled={roundState.config.toggles.momentumBonuses}
            gameMode={roundState.config.gameMode}
          />
        </details>
      </section>

      <section className="end-cta-bar">
        <button
          type="button"
          className="button-primary"
          onClick={() => {
            onResetRound()
            onNavigate('home')
          }}
        >
          <img className="button-icon" src={ICONS.teeOff} alt="" aria-hidden="true" />
          Start New Round
        </button>
        <button type="button" onClick={() => onNavigate('home')}>
          Return Home
        </button>
      </section>
    </section>
  )
}

export default EndRoundScreen
