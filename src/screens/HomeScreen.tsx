import { useEffect, useRef, useState } from 'react'
import { ICONS } from '../app/icons.ts'
import AppIcon from '../components/AppIcon.tsx'
import ModeDetailScreen from '../components/ModeDetailScreen.tsx'
import { trackHomeAction } from '../logic/analytics.ts'
import { applyLandingModeToRound, getLandingModeById, LANDING_MODES, type LandingModeId } from '../logic/landingModes.ts'
import { loadLocalIdentityState } from '../logic/localIdentity.ts'
import { hasRoundProgress } from '../logic/roundProgress.ts'
import type { ScreenProps } from './types.ts'

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

function formatRoundHistoryDate(completedAtMs: number): string {
  const completedDate = new Date(completedAtMs)

  return completedDate.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getDefaultLandingModeId(): LandingModeId {
  return LANDING_MODES[0]?.id ?? 'classic'
}

interface HomeScreenProps extends ScreenProps {
  isPastRoundsOpen: boolean
  onPastRoundsOpenChange: (isOpen: boolean) => void
  onModeDetailOpenChange: (isOpen: boolean) => void
}

function HomeScreen({
  roundState,
  hasSavedRound,
  savedRoundUpdatedAtMs,
  isRoundSavePending,
  roundSaveWarning,
  onNavigate,
  onResumeSavedRound,
  onUpdateRoundState,
  isPastRoundsOpen,
  onPastRoundsOpenChange,
  onModeDetailOpenChange,
}: HomeScreenProps) {
  const [activeModeId, setActiveModeId] = useState<LandingModeId | null>(null)
  const [pendingModeId, setPendingModeId] = useState<LandingModeId | null>(null)
  const [selectedModeId, setSelectedModeId] = useState<LandingModeId>(() =>
    getDefaultLandingModeId(),
  )
  const [resumeError, setResumeError] = useState<string | null>(null)
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!pendingModeId) {
      return
    }

    confirmButtonRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPendingModeId(null)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [pendingModeId])

  useEffect(() => {
    if (!isPastRoundsOpen) {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onPastRoundsOpenChange(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isPastRoundsOpen, onPastRoundsOpenChange])

  const hasSavedRoundProgress = hasSavedRound && hasRoundProgress(roundState)
  const totalHoles = roundState.holes.length || roundState.config.holeCount
  const currentHole = Math.min(roundState.currentHoleIndex + 1, totalHoles)
  const saveStatusLabel = isRoundSavePending
    ? 'Saving latest updates locally...'
    : formatSavedRoundLabel(savedRoundUpdatedAtMs)

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

  const openModeDetails = (modeId: LandingModeId) => {
    setResumeError(null)
    setSelectedModeId(modeId)
    onModeDetailOpenChange(true)
    setActiveModeId(modeId)
  }

  const launchModeFlow = (modeId: LandingModeId) => {
    trackHomeAction({
      action: 'start_full_setup',
      hasSavedRound,
      currentScreen: 'home',
    })
    onUpdateRoundState((currentState) => applyLandingModeToRound(currentState, modeId))
    onNavigate('roundSetup')
  }

  const playMode = (modeId: LandingModeId) => {
    if (hasSavedRoundProgress) {
      onModeDetailOpenChange(false)
      setActiveModeId(null)
      setPendingModeId(modeId)
      return
    }

    launchModeFlow(modeId)
  }

  const startSelectedMode = () => {
    playMode(selectedModeId)
  }

  const openRoundSetup = () => {
    setResumeError(null)
    onNavigate('roundSetup')
  }

  const openPastRounds = () => {
    setPendingModeId(null)
    onPastRoundsOpenChange(true)
  }

  const activeMode = activeModeId ? getLandingModeById(activeModeId) : null
  const pendingMode = pendingModeId ? getLandingModeById(pendingModeId) : null
  const roundHistory = isPastRoundsOpen ? loadLocalIdentityState().roundHistory : []

  if (activeMode) {
    return (
      <ModeDetailScreen
        mode={activeMode}
        hasSavedRoundProgress={hasSavedRoundProgress}
        onBack={() => {
          onModeDetailOpenChange(false)
          setActiveModeId(null)
        }}
        onPlay={() => playMode(activeMode.id)}
      />
    )
  }

  return (
    <section className="screen home-screen stack-sm">
      <header className="screen__header home-screen__header">
        <h2>Choose Game Mode</h2>
        <p className="muted">
          Pick a mode to match your round, then set course and golfers.
        </p>
        {roundSaveWarning && <p className="home-warning-text">{roundSaveWarning}</p>}
      </header>

      {hasSavedRound && (
        <section className="panel home-resume-card stack-xs">
          <div className="row-between setup-row-wrap">
            <p className="label">Saved Round</p>
            <span className="chip">
              Hole {currentHole} / {totalHoles}
            </span>
          </div>
          <p className="muted">{saveStatusLabel}</p>
          {hasSavedRoundProgress ? (
            <button type="button" className="button-primary" onClick={continueRound}>
              Continue Current Round
            </button>
          ) : (
            <button type="button" className="button-primary" onClick={startReadyRound}>
              Start Hole 1 With Saved Setup
            </button>
          )}
          {resumeError && (
            <p className="home-warning-text" role="status" aria-live="polite">
              {resumeError}
            </p>
          )}
        </section>
      )}

      <section className="panel stack-xs mode-list-panel">
        <div className="row-between setup-row-wrap">
          <p className="label">Modes</p>
          <span className="chip mode-list-panel__chip">Curated selection</span>
        </div>

        <div className="mode-list-grid" role="list" aria-label="Game modes">
          {LANDING_MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              className={`mode-card mode-tone--${mode.toneClassName} ${
                selectedModeId === mode.id ? 'mode-card--selected' : ''
              }`}
              onClick={() => openModeDetails(mode.id)}
              aria-label={`${mode.name}. ${mode.tagline}`}
            >
              <span className="mode-card__icon-column">
                <span className="mode-card__icon-wrap">
                  <AppIcon className="mode-card__icon" icon={mode.icon} />
                </span>
              </span>
              <span className="mode-card__copy">
                <strong>{mode.name}</strong>
                <span className="mode-card__tagline">{mode.tagline}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <nav className="home-floating-dock" aria-label="Home quick actions">
        <button
          type="button"
          className="home-floating-dock__button"
          aria-label="Open account and past rounds"
          onClick={openPastRounds}
        >
          <AppIcon className="home-floating-dock__icon" icon={ICONS.account} />
        </button>
        <button
          type="button"
          className="home-floating-dock__button home-floating-dock__button--play"
          aria-label={`Play ${getLandingModeById(selectedModeId).name}`}
          onClick={startSelectedMode}
        >
          <AppIcon className="home-floating-dock__icon home-floating-dock__icon--play" icon={ICONS.play} />
        </button>
        <button
          type="button"
          className="home-floating-dock__button"
          aria-label="Open setup settings"
          onClick={openRoundSetup}
        >
          <AppIcon className="home-floating-dock__icon" icon={ICONS.settings} />
        </button>
      </nav>

      {isPastRoundsOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => onPastRoundsOpenChange(false)}
        >
          <section
            className="panel modal-card home-history-modal stack-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="home-history-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="row-between home-history-modal__header">
              <div className="stack-xs">
                <p className="label">Past Rounds</p>
                <h3 id="home-history-modal-title">Recent local rounds</h3>
              </div>
              <button
                type="button"
                className="home-history-modal__close"
                aria-label="Close past rounds"
                onClick={() => onPastRoundsOpenChange(false)}
              >
                <AppIcon className="home-history-modal__close-icon" icon="close" />
              </button>
            </div>

            {roundHistory.length > 0 ? (
              <ol className="list-reset home-history-list">
                {roundHistory.map((historyEntry) => (
                  <li key={historyEntry.roundSignature} className="home-history-list__item">
                    <p className="home-history-list__winner">{historyEntry.winnerNames}</p>
                    <p className="muted home-history-list__meta">
                      {formatRoundHistoryDate(historyEntry.completedAtMs)} • {historyEntry.holeCount} holes •{' '}
                      {historyEntry.gameMode === 'powerUps' ? 'Power Ups' : 'Cards'} • {historyEntry.groupLabel}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="muted home-history-modal__empty">
                No completed rounds yet. Finish a round and it will show up here.
              </p>
            )}
          </section>
        </div>
      )}

      {pendingMode && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setPendingModeId(null)}
        >
          <section
            className={`panel modal-card home-confirm-modal mode-tone--${pendingMode.toneClassName} stack-sm`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="home-mode-confirm-title"
            aria-describedby="home-mode-confirm-description"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="home-confirm-modal__header stack-xs">
              <p className="label">Saved Round In Progress</p>
              <h3 id="home-mode-confirm-title">Start {pendingMode.name} instead?</h3>
            </div>
            <div className="home-confirm-modal__mode">
              <span className="home-confirm-modal__icon-wrap" aria-hidden="true">
                <AppIcon className="home-confirm-modal__icon" icon={pendingMode.icon} />
              </span>
              <div className="stack-xs">
                <p className="home-confirm-modal__mode-title">{pendingMode.name}</p>
                <p className="home-confirm-modal__mode-copy">{pendingMode.tagline}</p>
              </div>
            </div>
            <p id="home-mode-confirm-description" className="muted home-confirm-modal__description">
              This replaces your in-progress local round and opens setup for course type, golfers, and scores.
            </p>
            <p className="home-confirm-modal__footnote">You can still back out on the setup screen.</p>
            <div className="onboarding-modal__actions home-confirm-modal__actions">
              <button type="button" onClick={() => setPendingModeId(null)}>
                Keep Saved Round
              </button>
              <button
                ref={confirmButtonRef}
                type="button"
                className="button-primary"
                onClick={() => {
                  launchModeFlow(pendingMode.id)
                  setPendingModeId(null)
                }}
              >
                Continue to Setup
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  )
}

export default HomeScreen
