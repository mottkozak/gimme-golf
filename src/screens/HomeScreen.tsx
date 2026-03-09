import { createNewRoundState } from '../logic/roundLifecycle.ts'
import type { ScreenProps } from './types.ts'

function HomeScreen({
  onNavigate,
  onUpdateRoundState,
}: ScreenProps) {
  const startRound = () => {
    onUpdateRoundState(() => createNewRoundState())
    onNavigate('roundSetup')
  }

  return (
    <section className="screen home-screen">
      <header className="screen__header">
        <h2>GIMME GOLF</h2>
        <p>A gentle reminder that golf is a game.</p>
      </header>

      <section className="panel stack-xs">
        <p className="muted">
          Add challenges to every hole, stir up a little chaos, and keep the competition alive with
          your group. Gimme Golf adds a game alongside your game - all inside a simple scorecard
          built for the course.
        </p>
        <p className="muted">
          Start a round, add your golfers, and tee it up.
        </p>
        <button type="button" className="button-primary" onClick={startRound}>
          Begin Round
        </button>
      </section>
    </section>
  )
}

export default HomeScreen
