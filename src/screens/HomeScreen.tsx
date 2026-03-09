import { ICONS } from '../app/icons.ts'
import type { ScreenProps } from './types.ts'

function HomeScreen({
  roundState,
  hasSavedRound,
  onNavigate,
  onResumeSavedRound,
  onResetRound,
  onAbandonRound,
}: ScreenProps) {
  const continueRound = () => {
    onResumeSavedRound()
  }

  const startNewRound = () => {
    if (hasSavedRound) {
      const shouldReplaceSavedRound = window.confirm(
        'A saved round exists. Start a new round and replace current progress?',
      )
      if (!shouldReplaceSavedRound) {
        return
      }

      onResetRound()
    }

    onNavigate('roundSetup')
  }

  const abandonRound = () => {
    const shouldAbandonRound = window.confirm(
      'Abandon the saved round? This permanently clears local round progress.',
    )
    if (!shouldAbandonRound) {
      return
    }

    onAbandonRound()
  }

  return (
    <section className="screen home-screen">
      <header className="screen__header">
        <div className="screen-title">
          <img className="screen-title__icon" src={ICONS.golfFlag} alt="" aria-hidden="true" />
          <h2>GIMME GOLF</h2>
        </div>
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
        {hasSavedRound ? (
          <>
            <p className="muted">
              Saved round found. Next stop: Hole {roundState.currentHoleIndex + 1} of{' '}
              {roundState.holes.length}.
            </p>
            <button type="button" className="button-primary" onClick={continueRound}>
              <img className="button-icon" src={ICONS.golfFlag} alt="" aria-hidden="true" />
              Continue Round
            </button>
            <button type="button" className="button-danger" onClick={startNewRound}>
              <img className="button-icon" src={ICONS.teeOff} alt="" aria-hidden="true" />
              Start New Round
            </button>
            <button type="button" onClick={abandonRound}>
              Abandon Round
            </button>
          </>
        ) : (
          <button type="button" className="button-primary" onClick={startNewRound}>
            <img className="button-icon" src={ICONS.teeOff} alt="" aria-hidden="true" />
            Start New Round
          </button>
        )}
      </section>
    </section>
  )
}

export default HomeScreen
