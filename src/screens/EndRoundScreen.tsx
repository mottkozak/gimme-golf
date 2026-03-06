import HoleSummaryList from '../components/HoleSummaryList.tsx'
import LeaderboardTable from '../components/LeaderboardTable.tsx'
import { buildLeaderboardEntries, getLeaderboardLeader } from '../logic/leaderboard.ts'
import type { ScreenProps } from './types.ts'

function EndRoundScreen({ roundState, onNavigate, onResetRound }: ScreenProps) {
  const adjustedRows = buildLeaderboardEntries(
    roundState.players,
    roundState.totalsByPlayerId,
    'adjustedScore',
  )
  const realRows = buildLeaderboardEntries(roundState.players, roundState.totalsByPlayerId, 'realScore')
  const pointsRows = buildLeaderboardEntries(
    roundState.players,
    roundState.totalsByPlayerId,
    'gamePoints',
  )

  const realWinner = getLeaderboardLeader(realRows, 'realScore')
  const pointsWinner = getLeaderboardLeader(pointsRows, 'gamePoints')
  const adjustedWinner = getLeaderboardLeader(adjustedRows, 'adjustedScore')

  return (
    <section className="screen stack-sm">
      <header className="screen__header">
        <h2>Round Summary</h2>
        <p className="muted">
          Final results after {roundState.holes.length} holes with real score, game points, and
          adjusted score.
        </p>
      </header>

      <section className="panel end-summary-grid">
        <article className="summary-stat">
          <p className="label">Real Score Winner</p>
          <strong>{realWinner?.playerName ?? '-'}</strong>
          <p>{realWinner?.realScore ?? '-'} strokes</p>
        </article>
        <article className="summary-stat">
          <p className="label">Game Points Winner</p>
          <strong>{pointsWinner?.playerName ?? '-'}</strong>
          <p>{pointsWinner?.gamePoints ?? '-'} points</p>
        </article>
        <article className="summary-stat">
          <p className="label">Adjusted Winner</p>
          <strong>{adjustedWinner?.playerName ?? '-'}</strong>
          <p>{adjustedWinner?.adjustedScore ?? '-'} adjusted</p>
        </article>
      </section>

      <LeaderboardTable title="Final Real Score Leaderboard" rows={realRows} />
      <LeaderboardTable title="Final Game Points Leaderboard" rows={pointsRows} />
      <LeaderboardTable title="Final Adjusted Score Leaderboard" rows={adjustedRows} />

      <section className="panel stack-xs">
        <h3>Per-Hole Summary</h3>
        <p className="muted">Stacked mobile cards with strokes, challenge result, and point impact.</p>
      </section>

      <HoleSummaryList
        players={roundState.players}
        holes={roundState.holes}
        holeCards={roundState.holeCards}
        holeResults={roundState.holeResults}
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
