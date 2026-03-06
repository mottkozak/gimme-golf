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
        <p className="muted">Start a round and configure everything in a quick mobile flow.</p>
      </header>

      <section className="panel stack-xs">
        <p className="muted">
          Set your hole count, course style, golfers, and game options, then begin hole-by-hole play.
        </p>
        <button type="button" className="button-primary" onClick={startRound}>
          Start Round
        </button>
      </section>
    </section>
  )
}

export default HomeScreen
