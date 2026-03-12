import { useEffect, useRef, useState } from 'react'
import { ICONS } from '../app/icons.ts'
import AppIcon from '../components/AppIcon.tsx'
import ModeDetailScreen from '../components/ModeDetailScreen.tsx'
import { trackHomeAction } from '../logic/analytics.ts'
import { applyLandingModeToRound, getLandingModeById, LANDING_MODES, type LandingModeId } from '../logic/landingModes.ts'
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

function formatEditorialTodayLabel(): string {
  return new Date().toLocaleDateString([], {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
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
}: ScreenProps) {
  const [activeModeId, setActiveModeId] = useState<LandingModeId | null>(null)
  const [pendingModeId, setPendingModeId] = useState<LandingModeId | null>(null)
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

  const hasSavedRoundProgress = hasSavedRound && hasRoundProgress(roundState)
  const totalHoles = roundState.holes.length || roundState.config.holeCount
  const currentHole = Math.min(roundState.currentHoleIndex + 1, totalHoles)
  const saveStatusLabel = isRoundSavePending
    ? 'Saving latest updates locally...'
    : formatSavedRoundLabel(savedRoundUpdatedAtMs)
  const todayLabel = formatEditorialTodayLabel()

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
      setPendingModeId(modeId)
      return
    }

    launchModeFlow(modeId)
  }

  const activeMode = activeModeId ? getLandingModeById(activeModeId) : null
  const pendingMode = pendingModeId ? getLandingModeById(pendingModeId) : null

  if (activeMode) {
    return (
      <ModeDetailScreen
        mode={activeMode}
        stepLabel="Step 2 of 3"
        contextLabel={todayLabel || activeMode.contextLabel}
        hasSavedRoundProgress={hasSavedRoundProgress}
        onBack={() => setActiveModeId(null)}
        onPlay={() => playMode(activeMode.id)}
      />
    )
  }

  return (
    <section className="screen home-screen stack-sm">
      <header className="screen__header home-screen__header mode-list-header">
        <div className="screen-title">
          <AppIcon className="screen-title__icon" icon={ICONS.golfFlag} />
          <h2>Choose Game Mode</h2>
        </div>
        <p className="muted">
          Step 1 of 3: pick a mode, review it, then set course and golfers.
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
              className={`mode-card mode-tone--${mode.toneClassName}`}
              onClick={() => openModeDetails(mode.id)}
              aria-label={`${mode.name}. ${mode.tagline}`}
            >
              <span className="mode-card__icon-wrap">
                <AppIcon className="mode-card__icon" icon={mode.icon} />
              </span>
              <span className="mode-card__copy">
                <strong>{mode.name}</strong>
                <span className="mode-card__tagline">{mode.tagline}</span>
                <span className="mode-card__meta">{mode.packsLabel}</span>
              </span>
              <AppIcon className="mode-card__chevron" icon="chevron_right" />
            </button>
          ))}
        </div>
      </section>

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
