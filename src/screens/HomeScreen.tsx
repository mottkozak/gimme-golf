import { useEffect, useMemo, useRef, useState } from 'react'
import { ICONS } from '../app/icons.ts'
import {
  trackHomeAction,
  trackRoundAbandoned,
  trackRoundStarted,
} from '../logic/analytics.ts'
import { loadLocalIdentityState } from '../logic/localIdentity.ts'
import { applyQuickRoundDefaults } from '../logic/quickRound.ts'
import { hasRoundProgress } from '../logic/roundProgress.ts'
import type { ScreenProps } from './types.ts'

type HomeActionIntent = 'startFullSetup' | 'startQuickRound' | 'abandonRound'

interface HomeConfirmCopy {
  title: string
  body: string
  confirmLabel: string
  confirmClassName: string
}

function formatSavedRoundLabel(savedAtMs: number | null): string {
  if (savedAtMs === null) {
    return 'Saved locally on this device.'
  }

  const elapsedMs = Date.now() - savedAtMs

  if (elapsedMs < 45_000) {
    return 'Saved just now.'
  }

  if (elapsedMs < 60 * 60 * 1_000) {
    const elapsedMinutes = Math.max(1, Math.round(elapsedMs / 60_000))
    return `Saved ${elapsedMinutes} min ago.`
  }

  if (elapsedMs < 24 * 60 * 60 * 1_000) {
    const elapsedHours = Math.max(1, Math.round(elapsedMs / (60 * 60 * 1_000)))
    return `Saved ${elapsedHours} hr ago.`
  }

  const savedDate = new Date(savedAtMs)
  return `Saved ${savedDate.toLocaleDateString()} at ${savedDate.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })}.`
}

function getConfirmCopy(intent: HomeActionIntent): HomeConfirmCopy {
  if (intent === 'startQuickRound') {
    return {
      title: 'Start a quick round?',
      body: 'This replaces your saved round progress on this device.',
      confirmLabel: 'Start Quick Round',
      confirmClassName: 'button-primary',
    }
  }

  if (intent === 'startFullSetup') {
    return {
      title: 'Start a new setup?',
      body: 'This replaces your saved round progress on this device.',
      confirmLabel: 'Open Round Setup',
      confirmClassName: 'button-primary',
    }
  }

  return {
    title: 'Abandon saved round?',
    body: 'This permanently clears your local round progress.',
    confirmLabel: 'Abandon Round',
    confirmClassName: 'button-danger',
  }
}

function formatHistoryEntryMeta(completedAtMs: number, holeCount: number, gameMode: string): string {
  const completedDate = new Date(completedAtMs)
  const gameModeLabel = gameMode === 'powerUps' ? 'Power Ups' : 'Cards'

  return `${completedDate.toLocaleDateString()} • ${holeCount} holes • ${gameModeLabel}`
}

function HomeScreen({
  roundState,
  hasSavedRound,
  savedRoundUpdatedAtMs,
  isRoundSavePending,
  roundSaveWarning,
  onNavigate,
  onResumeSavedRound,
  onResetRound,
  onAbandonRound,
  onReplayTutorial,
  onUpdateRoundState,
}: ScreenProps) {
  const [pendingActionIntent, setPendingActionIntent] = useState<HomeActionIntent | null>(null)
  const [resumeError, setResumeError] = useState<string | null>(null)
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null)
  const localIdentityState = useMemo(() => loadLocalIdentityState(), [])
  const recentRounds = localIdentityState.roundHistory.slice(0, 3)
  const recentGolfers = localIdentityState.recentPlayerNames.slice(0, 8)

  useEffect(() => {
    if (!pendingActionIntent) {
      return
    }

    confirmButtonRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPendingActionIntent(null)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [pendingActionIntent])

  const hasSavedRoundProgress = hasSavedRound && hasRoundProgress(roundState)
  const hasRoundReadyToStart = hasSavedRound && !hasSavedRoundProgress
  const totalHoles = roundState.holes.length || roundState.config.holeCount
  const currentHole = Math.min(roundState.currentHoleIndex + 1, totalHoles)

  const executeActionIntent = (intent: HomeActionIntent) => {
    if (intent === 'startFullSetup') {
      trackHomeAction({
        action: 'start_full_setup',
        hasSavedRound,
        currentScreen: 'home',
      })
      onResetRound()
      onNavigate('roundSetup')
      return
    }

    if (intent === 'startQuickRound') {
      const nextRoundState = applyQuickRoundDefaults(roundState)
      trackHomeAction({
        action: 'start_quick_round',
        hasSavedRound,
        currentScreen: 'home',
      })
      trackRoundStarted(nextRoundState, 'home_quick_round')
      onUpdateRoundState((currentState) => applyQuickRoundDefaults(currentState))
      onNavigate('holePlay')
      return
    }

    trackHomeAction({
      action: 'abandon_round',
      hasSavedRound,
      currentScreen: 'home',
    })
    trackRoundAbandoned(roundState, 'home')
    onAbandonRound()
  }

  const continueRound = () => {
    trackHomeAction({
      action: 'continue_round',
      hasSavedRound,
      currentScreen: 'home',
    })
    const didResumeRound = onResumeSavedRound()
    setResumeError(didResumeRound ? null : 'Saved round is no longer available.')
  }

  const startReadyRound = () => {
    setResumeError(null)
    trackHomeAction({
      action: 'continue_round',
      hasSavedRound,
      currentScreen: 'home',
    })
    onNavigate('holePlay')
  }

  const startNewRound = () => {
    setResumeError(null)

    if (hasSavedRoundProgress) {
      setPendingActionIntent('startFullSetup')
      return
    }

    trackHomeAction({
      action: 'start_full_setup',
      hasSavedRound,
      currentScreen: 'home',
    })
    onNavigate('roundSetup')
  }

  const startQuickRound = () => {
    setResumeError(null)

    if (hasSavedRoundProgress) {
      setPendingActionIntent('startQuickRound')
      return
    }

    const nextRoundState = applyQuickRoundDefaults(roundState)
    trackHomeAction({
      action: 'start_quick_round',
      hasSavedRound,
      currentScreen: 'home',
    })
    trackRoundStarted(nextRoundState, 'home_quick_round')
    onUpdateRoundState((currentState) => applyQuickRoundDefaults(currentState))
    onNavigate('holePlay')
  }

  const abandonRound = () => {
    setResumeError(null)
    if (!hasSavedRound) {
      return
    }

    setPendingActionIntent('abandonRound')
  }

  const replayTutorial = () => {
    trackHomeAction({
      action: 'replay_tutorial',
      hasSavedRound,
      currentScreen: 'home',
    })
    onReplayTutorial()
  }

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
  const saveStatusLabel = isRoundSavePending
    ? 'Saving latest updates locally...'
    : formatSavedRoundLabel(savedRoundUpdatedAtMs)
  const confirmCopy = pendingActionIntent ? getConfirmCopy(pendingActionIntent) : null
  const identityPanel = (
    <section className="panel home-identity-card stack-xs">
      <div className="row-between">
        <p className="label">Your Group</p>
        <span className="chip">Local</span>
      </div>
      {recentRounds.length > 0 ? (
        <>
          <p className="muted">
            Latest: {recentRounds[0]?.groupLabel ?? 'Round complete'}
          </p>
          {recentGolfers.length > 0 && (
            <div className="home-identity-card__chips" role="list" aria-label="Recent golfers">
              {recentGolfers.map((name) => (
                <span key={name} className="chip home-identity-card__chip" role="listitem">
                  {name}
                </span>
              ))}
            </div>
          )}
          <ul className="list-reset home-history-list">
            {recentRounds.map((entry) => (
              <li key={entry.roundSignature} className="home-history-list__item">
                <p className="home-history-list__winner">Winner: {entry.winnerNames}</p>
                <p className="muted home-history-list__meta">
                  {formatHistoryEntryMeta(entry.completedAtMs, entry.holeCount, entry.gameMode)}
                </p>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="muted">Finish one round to unlock local group history and name shortcuts.</p>
      )}
    </section>
  )

  return (
    <section className="screen home-screen">
      <header className="screen__header home-screen__header">
        <div className="screen-title">
          <img className="screen-title__icon" src={ICONS.golfFlag} alt="" aria-hidden="true" />
          <h2>Gimme Golf</h2>
        </div>
        <p>Make your round easier to follow and more fun to remember.</p>
        <p className="muted home-screen__support">
          First time? Start with Quick Round to tee off fast, then learn as you play.
        </p>
        {roundSaveWarning && <p className="home-warning-text">{roundSaveWarning}</p>}
      </header>

      {hasSavedRound ? (
        <>
          {hasSavedRoundProgress ? (
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
              <p className="muted home-metadata">{saveStatusLabel}</p>
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
              {resumeError && (
                <p className="home-warning-text" role="status" aria-live="polite">
                  {resumeError}
                </p>
              )}
            </section>
          ) : (
            <section className="panel home-resume-card home-ready-card stack-sm">
              <div className="home-section-head">
                <p className="label">Round Ready</p>
                <p className="home-progress">Hole 1 of {totalHoles}</p>
              </div>
              <p className="muted home-metadata">
                Same golfers and mode are loaded from your last round.
              </p>
              {playerSummary && <p className="muted home-metadata">{playerSummary}</p>}
              <p className="muted home-metadata">{saveStatusLabel}</p>
              <button
                type="button"
                className="button-primary home-action-button home-action-button--primary"
                onClick={startReadyRound}
              >
                <span className="home-action-label">Start Hole 1</span>
                <span className="home-action-helper">Run it back with the same lineup and settings</span>
              </button>
            </section>
          )}

          <section className="panel home-start-card stack-sm">
            <div className="stack-xs">
              <p className="label">{hasSavedRoundProgress ? 'Start New Round' : 'Switch This Round Up'}</p>
              <p className="muted">
                Quick Round is the fastest way to start with balanced defaults.
              </p>
              <p className="muted">
                {hasSavedRoundProgress
                  ? 'Starting new replaces saved progress on this device.'
                  : 'No in-progress score will be overwritten.'}
              </p>
            </div>
            <button
              type="button"
              className="home-action-button home-action-button--secondary"
              onClick={startQuickRound}
            >
              <span className="home-action-label">Quick Round</span>
              <span className="home-action-helper">Best first round • balanced defaults</span>
            </button>
            <button
              type="button"
              className="home-action-button home-action-button--secondary"
              onClick={startNewRound}
            >
              <span className="home-action-label">
                {hasSavedRoundProgress ? 'Round Setup' : 'Pick Preset Mode'}
              </span>
              <span className="home-action-helper">
                {hasSavedRoundProgress
                  ? 'Choose golfers and a preset mode'
                  : 'Switch between Quick Start, Party, Power Ups, or Challenge'}
              </span>
            </button>
          </section>

          <section className="panel home-help-card stack-xs">
            <p className="label">Need a Refresher?</p>
            <button
              type="button"
              className="home-action-button home-action-button--secondary"
              onClick={replayTutorial}
            >
              <span className="home-action-label">Replay Tutorial</span>
              <span className="home-action-helper">60-second walkthrough of the flow</span>
            </button>
          </section>

          {identityPanel}

          <section className="panel home-danger-zone stack-xs">
            <p className="label home-danger-zone__label">Danger Zone</p>
            <p className="muted">
              {hasRoundReadyToStart
                ? 'Clear this saved setup and start from a blank round.'
                : 'Permanently clear this saved round.'}
            </p>
            <button
              type="button"
              className="button-danger home-action-button home-action-button--danger"
              onClick={abandonRound}
            >
              <span className="home-action-label">
                {hasRoundReadyToStart ? 'Clear Saved Setup' : 'Abandon Round'}
              </span>
            </button>
          </section>
        </>
      ) : (
        <>
          <section className="panel home-start-card home-start-card--focus stack-sm">
            <p className="label">Start New Round</p>
            <button
              type="button"
              className="button-primary home-action-button home-action-button--primary"
              onClick={startQuickRound}
            >
              <span className="home-action-label">Quick Round</span>
              <span className="home-action-helper">Best first round • balanced defaults</span>
            </button>
            <button
              type="button"
              className="home-action-button home-action-button--secondary"
              onClick={startNewRound}
            >
              <span className="home-action-label">Full Setup</span>
              <span className="home-action-helper">Choose players, mode, and packs</span>
            </button>
            <button
              type="button"
              className="home-action-button home-action-button--secondary"
              onClick={replayTutorial}
            >
              <span className="home-action-label">Replay Tutorial</span>
              <span className="home-action-helper">60-second walkthrough of the flow</span>
            </button>
          </section>
          {identityPanel}
        </>
      )}

      {pendingActionIntent && confirmCopy && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setPendingActionIntent(null)}
        >
          <section
            className="panel modal-card home-confirm-modal stack-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="home-confirm-title"
            aria-describedby="home-confirm-description"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="stack-xs">
              <h3 id="home-confirm-title">{confirmCopy.title}</h3>
              <p id="home-confirm-description" className="muted">
                {confirmCopy.body}
              </p>
            </div>
            <div className="onboarding-modal__actions">
              <button
                type="button"
                onClick={() => setPendingActionIntent(null)}
              >
                Cancel
              </button>
              <button
                ref={confirmButtonRef}
                type="button"
                className={confirmCopy.confirmClassName}
                onClick={() => {
                  executeActionIntent(pendingActionIntent)
                  setPendingActionIntent(null)
                }}
              >
                {confirmCopy.confirmLabel}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  )
}

export default HomeScreen
