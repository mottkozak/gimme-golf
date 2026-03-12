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

function getDefaultLandingModeId(): LandingModeId {
  return LANDING_MODES[0]?.id ?? 'classic'
}

interface HomeScreenProps extends ScreenProps {
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
  onAbandonRound,
  onUpdateRoundState,
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

  const hasSavedRoundProgress = hasSavedRound && hasRoundProgress(roundState)
  const saveStatusLabel = isRoundSavePending
    ? 'Saving latest updates locally...'
    : formatSavedRoundLabel(savedRoundUpdatedAtMs)

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

  const handlePrimaryPlay = () => {
    setResumeError(null)

    if (hasSavedRoundProgress) {
      trackHomeAction({
        action: 'continue_round',
        hasSavedRound,
        currentScreen: 'home',
      })
      const didResumeRound = onResumeSavedRound()
      setResumeError(didResumeRound ? null : 'Saved round is no longer available.')
      return
    }

    launchModeFlow('classic')
  }

  const cancelSavedRound = () => {
    onAbandonRound()
    setResumeError(null)
  }

  const openModeDetails = (modeId: LandingModeId) => {
    setResumeError(null)
    setSelectedModeId(modeId)
    onModeDetailOpenChange(true)
    setActiveModeId(modeId)
  }

  const activeMode = activeModeId ? getLandingModeById(activeModeId) : null
  const pendingMode = pendingModeId ? getLandingModeById(pendingModeId) : null

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

      {hasSavedRoundProgress && (
        <section className="home-resume-inline">
          <p className="muted">
            Play will resume your previous round. {saveStatusLabel}
          </p>
          <button type="button" className="home-resume-inline__cancel" onClick={cancelSavedRound}>
            Cancel Saved Round
          </button>
        </section>
      )}

      {resumeError && (
        <p className="home-warning-text" role="status" aria-live="polite">
          {resumeError}
        </p>
      )}

      <section className="panel stack-xs mode-list-panel">
        <p className="label">Modes</p>

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
                {mode.isPremium && <span className="chip mode-card__premium-chip">Premium</span>}
              </span>
            </button>
          ))}
        </div>
      </section>

      <nav className="home-floating-dock" aria-label="Home quick actions">
        <button
          type="button"
          className="home-floating-dock__button"
          aria-label="Open profile"
          onClick={() => onNavigate('profile')}
        >
          <AppIcon className="home-floating-dock__icon" icon={ICONS.account} />
        </button>
        <button
          type="button"
          className="home-floating-dock__button home-floating-dock__button--play"
          aria-label={hasSavedRoundProgress ? 'Resume previous round' : 'Start classic round setup'}
          onClick={handlePrimaryPlay}
        >
          <AppIcon className="home-floating-dock__icon home-floating-dock__icon--play" icon={ICONS.play} />
        </button>
        <button
          type="button"
          className="home-floating-dock__button"
          aria-label="Open settings"
          onClick={() => onNavigate('settings')}
        >
          <AppIcon className="home-floating-dock__icon" icon={ICONS.settings} />
        </button>
      </nav>

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
