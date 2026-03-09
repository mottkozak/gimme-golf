import { ICONS } from '../app/icons.ts'
import { applyQuickRoundDefaults } from '../logic/quickRound.ts'
import type { ScreenProps } from './types.ts'

function HomeScreen({
  roundState,
  hasSavedRound,
  onNavigate,
  onResumeSavedRound,
  onResetRound,
  onAbandonRound,
  onUpdateRoundState,
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

  const startQuickRound = () => {
    if (hasSavedRound) {
      const shouldReplaceSavedRound = window.confirm(
        'A saved round exists. Start a quick round and replace current progress?',
      )
      if (!shouldReplaceSavedRound) {
        return
      }
    }

    onUpdateRoundState((currentState) => applyQuickRoundDefaults(currentState))
    onNavigate('holePlay')
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

  const totalHoles = roundState.holes.length || roundState.config.holeCount
  const currentHole = Math.min(roundState.currentHoleIndex + 1, totalHoles)
  const playerNames = roundState.players.map((player, index) => {
    const trimmedName = player.name.trim()
    return trimmedName.length > 0 ? trimmedName : `Player ${index + 1}`
  })
  const playerCount = playerNames.length
  const playerSummary = playerCount > 0 ? playerNames.join(' • ') : null
  const leaderTeaser = (() => {
    if (playerCount === 0) {
      return null
    }

    const leaderboard = roundState.players
      .map((player, index) => {
        const trimmedName = player.name.trim()
        return {
          name: trimmedName.length > 0 ? trimmedName : `Player ${index + 1}`,
          gamePoints: roundState.totalsByPlayerId[player.id]?.gamePoints ?? 0,
        }
      })
      .sort((left, right) => right.gamePoints - left.gamePoints)

    const hasAnyPoints = leaderboard.some((entry) => entry.gamePoints !== 0)
    if (!hasAnyPoints) {
      return null
    }
    const topPoints = leaderboard[0].gamePoints

    const leaders = leaderboard.filter((entry) => entry.gamePoints === topPoints)
    const visibleLeaders = leaders.slice(0, 2).map((entry) => entry.name)
    const hiddenLeaderCount = leaders.length - visibleLeaders.length
    const names =
      hiddenLeaderCount > 0
        ? `${visibleLeaders.join(', ')} +${hiddenLeaderCount}`
        : visibleLeaders.join(', ')

    return `Leaders: ${names} (${topPoints} pts)`
  })()

  return (
    <section className="screen home-screen">
      <header className="screen__header home-screen__header">
        <div className="screen-title">
          <img className="screen-title__icon" src={ICONS.golfFlag} alt="" aria-hidden="true" />
          <h2>Gimme Golf</h2>
        </div>
        <p>A gentle reminder that golf is a game.</p>
        <p className="muted home-screen__support">
          A side-game for your round. Deal challenges. Earn points. Stir chaos.
        </p>
      </header>

      {hasSavedRound ? (
        <>
          <section className="panel home-resume-card stack-sm">
            <div className="home-section-head">
              <p className="label">Resume Round</p>
              <p className="home-progress">
                Hole {currentHole} of {totalHoles}
              </p>
            </div>
            {playerCount > 0 && (
              <p className="muted home-metadata">
                {playerCount} player{playerCount === 1 ? '' : 's'}
              </p>
            )}
            {playerSummary && <p className="muted home-metadata">{playerSummary}</p>}
            {leaderTeaser && <p className="muted home-metadata">{leaderTeaser}</p>}
            <button
              type="button"
              className="button-primary home-action-button home-action-button--primary"
              onClick={continueRound}
            >
              <span className="home-action-label">Continue Round</span>
              <span className="home-action-helper">Jump back into your saved scorecard</span>
            </button>
          </section>

          <section className="panel home-start-card stack-sm">
            <div className="stack-xs">
              <p className="label">Start New Round</p>
              <p className="muted">Quick start or run full setup.</p>
            </div>
            <button
              type="button"
              className="home-action-button home-action-button--secondary"
              onClick={startQuickRound}
            >
              <span className="home-action-label">Quick Round</span>
              <span className="home-action-helper">Fast setup</span>
            </button>
            <button
              type="button"
              className="home-action-button home-action-button--secondary"
              onClick={startNewRound}
            >
              <span className="home-action-label">Full Setup</span>
              <span className="home-action-helper">Customize players and rules</span>
            </button>
          </section>

          <section className="panel home-danger-zone stack-xs">
            <p className="label home-danger-zone__label">Danger Zone</p>
            <p className="muted">Permanently clear this saved round.</p>
            <button
              type="button"
              className="button-danger home-action-button home-action-button--danger"
              onClick={abandonRound}
            >
              <span className="home-action-label">Abandon Round</span>
            </button>
          </section>
        </>
      ) : (
        <section className="panel home-start-card home-start-card--focus stack-sm">
          <p className="label">Start New Round</p>
          <button
            type="button"
            className="button-primary home-action-button home-action-button--primary"
            onClick={startQuickRound}
          >
            <span className="home-action-label">Quick Round</span>
            <span className="home-action-helper">Fast setup</span>
          </button>
          <button
            type="button"
            className="home-action-button home-action-button--secondary"
            onClick={startNewRound}
          >
            <span className="home-action-label">Full Setup</span>
            <span className="home-action-helper">Customize players and rules</span>
          </button>
        </section>
      )}
    </section>
  )
}

export default HomeScreen
