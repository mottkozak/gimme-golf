import { ICONS } from '../app/icons.ts'
import HoleSummaryList from '../components/HoleSummaryList.tsx'
import LeaderboardTable from '../components/LeaderboardTable.tsx'
import { computeRoundAwards } from '../logic/awards.ts'
import { buildLeaderboardEntries } from '../logic/leaderboard.ts'
import { getCurrentMomentumStateByPlayerId } from '../logic/streaks.ts'
import type { LeaderboardEntry } from '../types/game.ts'
import type { ScreenProps } from './types.ts'

const MAJOR_AWARD_IDS = new Set(['mvp', 'mostClutch', 'missionMachine', 'biggestComeback'])

function formatNames(names: string[]): string {
  if (names.length === 0) {
    return '-'
  }

  if (names.length === 1) {
    return names[0]
  }

  if (names.length === 2) {
    return `${names[0]} & ${names[1]}`
  }

  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`
}

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
    names: formatNames(winnerNames),
    value: winningValue,
  }
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

  return (
    <section className="screen stack-sm">
      <header className="screen__header">
        <div className="screen-title">
          <img className="screen-title__icon" src={ICONS.leaderboard} alt="" aria-hidden="true" />
          <h2>Round Summary</h2>
        </div>
        <p className="muted">
          Final results after {roundState.holes.length} holes with real score, game points, and
          adjusted score.
        </p>
      </header>

      <section className="panel stack-xs">
        <div className="row-between">
          <h3>Major Winners</h3>
          <span className="chip">Round Leaders</span>
        </div>
        <div className="end-summary-grid">
          <article className="summary-stat">
            <p className="label">Real Score Winner</p>
            <strong>{realWinner.names}</strong>
            <p>{realWinner.value ?? '-'} strokes</p>
          </article>
          <article className="summary-stat">
            <p className="label">Game Points Winner</p>
            <strong>{pointsWinner.names}</strong>
            <p>{pointsWinner.value ?? '-'} points</p>
          </article>
          <article className="summary-stat">
            <p className="label">Adjusted Winner</p>
            <strong>{adjustedWinner.names}</strong>
            <p>{adjustedWinner.value ?? '-'} adjusted</p>
          </article>
        </div>
      </section>

      <LeaderboardTable
        title="Leaderboard"
        rows={leaderboardRows}
        momentumByPlayerId={momentumByPlayerId}
      />

      <section className="panel stack-xs">
        <div className="row-between">
          <h3>Round Awards</h3>
          <span className="chip">{awardsSummary.awards.length} awards</span>
        </div>
        <p className="muted">{awardsSummary.roundPersonalityLine}</p>

        <section className="award-group stack-xs">
          <p className="award-group__title">Performance Awards</p>
          {majorAwards.map((award) => (
            <article key={award.awardId} className="award-row award-row--major">
              <div className="row-between">
                <p className="award-title">{award.awardName}</p>
                <span className="chip">{award.shortLabel}</span>
              </div>
              <p className="award-winner">
                {formatNames(award.winners.map((winner) => winner.playerName))}
                {award.isTie ? ' (Tie)' : ''}
              </p>
              <p className="award-explanation">{award.explanation}</p>
              <p className="award-stat">{award.supportingStat}</p>
            </article>
          ))}
        </section>

        <section className="award-group stack-xs">
          <p className="award-group__title">Fun Awards</p>
          {funAwards.map((award) => (
            <article key={award.awardId} className="award-row award-row--fun">
              <div className="row-between">
                <p className="award-title">{award.awardName}</p>
                <span className="chip">{award.shortLabel}</span>
              </div>
              <p className="award-winner">
                {formatNames(award.winners.map((winner) => winner.playerName))}
                {award.isTie ? ' (Tie)' : ''}
              </p>
              <p className="award-explanation">{award.explanation}</p>
              <p className="award-stat">{award.supportingStat}</p>
            </article>
          ))}
        </section>
      </section>

      <section className="panel stack-xs">
        <h3>Per-Hole Summary</h3>
        <p className="muted">
          {roundState.config.gameMode === 'powerUps'
            ? 'Stacked mobile cards with strokes and lightweight power-up flow context.'
            : 'Stacked mobile cards with strokes, challenge result, and point impact.'}
        </p>
      </section>

      <HoleSummaryList
        players={roundState.players}
        holes={roundState.holes}
        holeCards={roundState.holeCards}
        holeResults={roundState.holeResults}
        momentumEnabled={roundState.config.toggles.momentumBonuses}
        gameMode={roundState.config.gameMode}
      />

      <section className="panel stack-xs">
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
