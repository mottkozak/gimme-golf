import PlayerCard from '../components/PlayerCard.tsx'
import type { ScreenProps } from './types.ts'

function HomeScreen({
  roundState,
  hasSavedRound,
  onNavigate,
  onResumeSavedRound,
  onResetRound,
  onAbandonRound,
}: ScreenProps) {
  const currentHole = roundState.holes[roundState.currentHoleIndex]

  return (
    <section className="screen">
      <header className="screen__header">
        <h1>SideQuest Golf</h1>
        <p className="muted">Mobile-first round companion with local round persistence.</p>
      </header>

      <section className="panel">
        <div className="row-between">
          <strong>Round Snapshot</strong>
          <span className="chip">Hole {currentHole.holeNumber}</span>
        </div>
        <p>
          {roundState.players.length} golfers, {roundState.config.holeCount} holes,{' '}
          {roundState.config.courseStyle} setup.
        </p>
        <div className="button-row">
          <button onClick={() => onNavigate('roundSetup')}>Round Setup</button>
          <button onClick={() => onNavigate('leaderboard')}>Latest Recap</button>
          <button className="button-primary" onClick={() => onNavigate('holeSetup')}>
            Start Hole Flow
          </button>
        </div>

        <div className="button-row">
          {hasSavedRound && (
            <button type="button" onClick={onResumeSavedRound}>
              Resume Round
            </button>
          )}
          <button type="button" onClick={onResetRound}>
            Reset Round
          </button>
          <button type="button" className="button-danger" onClick={onAbandonRound}>
            Abandon Round
          </button>
        </div>

        <p className="muted">
          {hasSavedRound
            ? 'A saved round is available in local storage.'
            : 'No saved round yet. Changes save automatically once you edit setup or hole data.'}
        </p>
      </section>

      <section className="stack-sm">
        {roundState.players.map((player) => {
          const totals = roundState.totalsByPlayerId[player.id]

          return <PlayerCard key={player.id} player={player} totals={totals} />
        })}
      </section>
    </section>
  )
}

export default HomeScreen
