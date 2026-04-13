import { useEffect, useRef, useState, type TouchEvent } from 'react'
import { ICONS } from '../../app/icons.ts'
import AppIcon from '../../components/AppIcon.tsx'
import Modal from '../../components/Modal.tsx'
import { hapticLightImpact, hapticSelection } from '../../capacitor/haptics.ts'
import { applyLandingModeToRound, LANDING_MODES, type LandingModeId } from '../../logic/landingModes.ts'
import { isMultiplayerEnabled } from '../../logic/multiplayer.ts'
import { hasRoundProgress } from '../../logic/roundProgress.ts'
import type { ScreenProps } from '../../app/screenContracts.ts'

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

const PACK_BACK_ASSET_BY_MODE_ID: Record<LandingModeId, string> = {
  classic: 'cards/card_pack_backs/Classic Card Deck.png',
  novelty: 'cards/card_pack_backs/Novelty Card Deck.png',
  chaos: 'cards/card_pack_backs/Chaos Pack Deck.png',
  props: 'cards/card_pack_backs/Props Pack Deck.png',
  powerUps: 'cards/card_pack_backs/Power Up Pack Deck.png',
}

const PACK_BACK_ASSET_FALLBACK_BY_MODE_ID: Record<LandingModeId, string> = {
  classic: 'card/card_pack_backs/Classic Card Deck.png',
  novelty: 'card/card_pack_backs/Novelty Card Deck.png',
  chaos: 'card/card_pack_backs/Chaos Pack Deck.png',
  props: 'card/card_pack_backs/Props Pack Deck.png',
  powerUps: 'card/card_pack_backs/Power Up Pack Deck.png',
}

const PACK_DETAIL_COPY_BY_MODE_ID: Record<LandingModeId, string> = {
  classic:
    'Clean, balanced missions that are easy to teach and quick to run with any group.',
  novelty:
    'Personality-first missions for laughs, creativity, and memorable moments each hole.',
  chaos:
    'Big public effects and momentum swings for groups that enjoy unpredictable pressure.',
  props:
    'Make predictions before tee shots; great for banter, side bets, and table talk.',
  powerUps:
    'Arcade-style boosts and curses for fast rounds with high variance and comeback drama.',
}

const EXAMPLE_CARD_ASSET_BY_MODE_ID: Record<LandingModeId, string> = {
  classic: 'cards/core54/easy/COM-001-Fairway Finder.png',
  novelty: 'cards/Novelty/hard/NOV-023-One-Club Wizard.png',
  chaos: 'cards/Chaos/hard/CHA-015-Chaos Swap.png',
  props: 'cards/Props/medium/PRP-001-Somebody Birdies.png',
  powerUps: 'cards/PowerUp/hard/PWR-002-Backboard.png',
}
const PACK_SWIPE_THRESHOLD_PX = 56
const IMAGE_UNAVAILABLE_FALLBACK_SRC = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="520" viewBox="0 0 360 520">
    <rect width="360" height="520" rx="24" fill="#e9dfd1"/>
    <rect x="12" y="12" width="336" height="496" rx="18" fill="#f5ede3" stroke="#9f917f" stroke-width="2"/>
    <text x="180" y="250" text-anchor="middle" fill="#5f564e" font-family="Arial, sans-serif" font-size="18">
      Image unavailable
    </text>
  </svg>`,
)}`

function toPublicAssetPath(assetPath: string): string {
  const normalizedPath = assetPath.replace(/^\/+/, '')
  const encodedPath = normalizedPath
    .split('/')
    .map((pathPart) => encodeURIComponent(pathPart))
    .join('/')
  return `${import.meta.env.BASE_URL}${encodedPath}`
}

function toLegacyCardFallbackPath(assetPath: string): string {
  return assetPath.replace(/^cards\//, 'card/')
}

function applyImageFallback(image: HTMLImageElement, fallbackSrc: string): void {
  const currentStage = image.dataset.assetFallbackStage ?? 'primary'
  if (currentStage === 'primary') {
    image.dataset.assetFallbackStage = 'fallback'
    image.src = fallbackSrc
    return
  }

  if (currentStage === 'fallback') {
    image.dataset.assetFallbackStage = 'final'
    image.src = IMAGE_UNAVAILABLE_FALLBACK_SRC
  }
}

function trackHomeActionDeferred(action: 'continue_round' | 'start_full_setup', hasSavedRound: boolean): void {
  void import('../../logic/analytics.ts')
    .then(({ trackHomeAction }) => {
      trackHomeAction({
        action,
        hasSavedRound,
        currentScreen: 'home',
      })
    })
    .catch(() => {
      // Analytics remains best-effort and should never affect primary interaction.
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
  onAbandonRound,
  onUpdateRoundState,
  onModeDetailOpenChange,
}: HomeScreenProps) {
  const [selectedModeId, setSelectedModeId] = useState<LandingModeId>(() =>
    getDefaultLandingModeId(),
  )
  const [isSelectedPackFlipped, setIsSelectedPackFlipped] = useState(false)
  const [pendingStartModeId, setPendingStartModeId] = useState<LandingModeId | null>(null)
  const [resumeError, setResumeError] = useState<string | null>(null)
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null)
  const packSwipeStartXRef = useRef<number | null>(null)
  const packSwipeStartYRef = useRef<number | null>(null)
  const packSwipeDidNavigateRef = useRef(false)

  useEffect(() => {
    onModeDetailOpenChange(false)
  }, [onModeDetailOpenChange])

  useEffect(() => {
    if (!pendingStartModeId) {
      return
    }

    confirmButtonRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        hapticSelection()
        setPendingStartModeId(null)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [pendingStartModeId])

  const hasSavedRoundProgress = hasSavedRound && hasRoundProgress(roundState)
  const saveStatusLabel = isRoundSavePending
    ? 'Saving latest updates locally...'
    : formatSavedRoundLabel(savedRoundUpdatedAtMs)
  const selectedModeIndex = LANDING_MODES.findIndex((mode) => mode.id === selectedModeId)
  const resolvedSelectedModeIndex = selectedModeIndex >= 0 ? selectedModeIndex : 0
  const selectedMode = LANDING_MODES[resolvedSelectedModeIndex] ?? LANDING_MODES[0]
  const multiplayerEnabled = isMultiplayerEnabled()

  const launchModeFlow = (modeId: LandingModeId) => {
    hapticLightImpact()
    trackHomeActionDeferred('start_full_setup', hasSavedRound)
    onUpdateRoundState((currentState) => applyLandingModeToRound(currentState, modeId))
    onNavigate('roundSetup')
  }

  const handlePrimaryPlay = () => {
    hapticSelection()
    setResumeError(null)

    if (hasSavedRoundProgress) {
      setPendingStartModeId(selectedMode.id)
      return
    }

    launchModeFlow(selectedMode.id)
  }

  const resumeSavedRound = () => {
    hapticSelection()
    setResumeError(null)
    trackHomeActionDeferred('continue_round', hasSavedRound)
    const didResumeRound = onResumeSavedRound()
    setResumeError(didResumeRound ? null : 'Saved round is no longer available.')
  }

  const cancelSavedRound = () => {
    hapticSelection()
    onAbandonRound()
    setResumeError(null)
  }

  const cycleSelectedMode = (direction: 'previous' | 'next') => {
    hapticSelection()
    setResumeError(null)
    setIsSelectedPackFlipped(false)
    setSelectedModeId((currentModeId) => {
      const currentModeIndex = LANDING_MODES.findIndex((mode) => mode.id === currentModeId)
      const resolvedCurrentModeIndex = currentModeIndex >= 0 ? currentModeIndex : 0
      const nextModeIndex =
        direction === 'next'
          ? (resolvedCurrentModeIndex + 1) % LANDING_MODES.length
          : (resolvedCurrentModeIndex - 1 + LANDING_MODES.length) % LANDING_MODES.length

      return LANDING_MODES[nextModeIndex]?.id ?? currentModeId
    })
  }

  const resetPackSwipeTracking = () => {
    packSwipeStartXRef.current = null
    packSwipeStartYRef.current = null
  }

  const handlePackSwipeStart = (event: TouchEvent<HTMLButtonElement>) => {
    const firstTouch = event.touches[0]
    if (!firstTouch) {
      return
    }

    packSwipeStartXRef.current = firstTouch.clientX
    packSwipeStartYRef.current = firstTouch.clientY
    packSwipeDidNavigateRef.current = false
  }

  const handlePackSwipeEnd = (event: TouchEvent<HTMLButtonElement>) => {
    const firstTouch = event.changedTouches[0]
    const startX = packSwipeStartXRef.current
    const startY = packSwipeStartYRef.current
    resetPackSwipeTracking()

    if (!firstTouch || startX === null || startY === null) {
      return
    }

    const deltaX = firstTouch.clientX - startX
    const deltaY = firstTouch.clientY - startY
    const horizontalDistance = Math.abs(deltaX)
    const verticalDistance = Math.abs(deltaY)
    const isConfidentHorizontalSwipe =
      horizontalDistance >= PACK_SWIPE_THRESHOLD_PX &&
      horizontalDistance > verticalDistance * 1.15
    if (!isConfidentHorizontalSwipe) {
      return
    }

    packSwipeDidNavigateRef.current = true
    cycleSelectedMode(deltaX < 0 ? 'next' : 'previous')
  }

  const handlePackSwipeCancel = () => {
    resetPackSwipeTracking()
    packSwipeDidNavigateRef.current = false
  }

  const togglePackFace = () => {
    if (packSwipeDidNavigateRef.current) {
      packSwipeDidNavigateRef.current = false
      return
    }

    hapticSelection()
    setResumeError(null)
    setIsSelectedPackFlipped((current) => !current)
  }

  const deckBackAssetSrc = toPublicAssetPath(PACK_BACK_ASSET_BY_MODE_ID[selectedMode.id])
  const deckBackAssetFallbackSrc = toPublicAssetPath(
    PACK_BACK_ASSET_FALLBACK_BY_MODE_ID[selectedMode.id],
  )
  const exampleAssetPath = EXAMPLE_CARD_ASSET_BY_MODE_ID[selectedMode.id]
  const exampleAssetSrc = toPublicAssetPath(exampleAssetPath)
  const exampleAssetFallbackSrc = toPublicAssetPath(toLegacyCardFallbackPath(exampleAssetPath))
  const primaryPlayLabel = hasSavedRoundProgress
    ? `Start ${selectedMode.name} and replace saved round`
    : selectedMode.id === 'classic'
      ? 'Start classic round setup'
      : `Start ${selectedMode.name} round setup`
  const pendingStartMode =
    pendingStartModeId !== null
      ? LANDING_MODES.find((mode) => mode.id === pendingStartModeId) ?? null
      : null

  return (
    <section className="screen home-screen stack-sm">
      <header className="screen__header home-screen__header">
        <h2>Choose Game Mode</h2>
        <p className="muted">
          Pick a mode to match your round.
        </p>
        {roundSaveWarning && <p className="home-warning-text">{roundSaveWarning}</p>}
      </header>

      {hasSavedRoundProgress && (
        <section className="home-resume-inline">
          <div className="stack-xs">
            <p className="muted">
              Saved round detected. Starting a new mode will replace it. {saveStatusLabel}
            </p>
            <div className="home-resume-inline__actions">
              <button type="button" onClick={resumeSavedRound}>
                Resume Saved Round
              </button>
              <button type="button" className="home-resume-inline__cancel" onClick={cancelSavedRound}>
                Discard Saved Round
              </button>
            </div>
          </div>
        </section>
      )}

      {resumeError && (
        <p className="home-warning-text" role="status" aria-live="polite">
          {resumeError}
        </p>
      )}

      {multiplayerEnabled && (
        <section className="panel stack-xs home-multiplayer-entry">
          <p className="label">Multiplayer Beta</p>
          <p className="muted">
            Create or join a room code to set up a shared lobby for your foursome.
          </p>
          <button
            type="button"
            className="button-primary"
            data-requires-network="true"
            onClick={() => {
              hapticSelection()
              onNavigate('multiplayerAccess')
            }}
          >
            Create or Join Room
          </button>
        </section>
      )}

      <section className={`stack-sm home-pack-view mode-tone--${selectedMode.toneClassName}`}>
        <div className="home-pack-view__carousel" role="group" aria-label="Game mode pack selector">
          <button
            type="button"
            className="home-pack-view__cycle-button"
            aria-label="Previous pack"
            onClick={() => cycleSelectedMode('previous')}
          >
            <AppIcon className="home-pack-view__cycle-icon" icon="arrow_back_ios_new" />
          </button>

          <button
            type="button"
            className={`home-pack-view__flip-card ${isSelectedPackFlipped ? 'is-flipped' : ''}`}
            aria-label={
              isSelectedPackFlipped
                ? `Show ${selectedMode.name} pack back`
                : `Flip ${selectedMode.name} pack to preview example card`
            }
            onClick={togglePackFace}
            onTouchStart={handlePackSwipeStart}
            onTouchEnd={handlePackSwipeEnd}
            onTouchCancel={handlePackSwipeCancel}
          >
            <span
              className={`home-pack-view__card-face ${
                isSelectedPackFlipped
                  ? 'home-pack-view__card-face--back'
                  : 'home-pack-view__card-face--front'
              }`}
            >
              <img
                className="home-pack-view__card-image"
                src={isSelectedPackFlipped ? exampleAssetSrc : deckBackAssetSrc}
                alt={
                  isSelectedPackFlipped
                    ? `${selectedMode.name} example card`
                    : `${selectedMode.name} deck pack`
                }
                onError={(event) =>
                  applyImageFallback(
                    event.currentTarget,
                    isSelectedPackFlipped ? exampleAssetFallbackSrc : deckBackAssetFallbackSrc,
                  )
                }
              />
            </span>
          </button>

          <button
            type="button"
            className="home-pack-view__cycle-button"
            aria-label="Next pack"
            onClick={() => cycleSelectedMode('next')}
          >
            <AppIcon className="home-pack-view__cycle-icon" icon="arrow_forward_ios" />
          </button>
        </div>

        <div className="home-pack-view__details stack-xs">
          <div className="home-pack-view__name-block">
            <p className="home-pack-view__name">{selectedMode.name}</p>
            <div className="home-pack-view__premium-row">
              {selectedMode.isPremium ? (
                <span className="chip home-pack-view__premium-chip">Premium</span>
              ) : (
                <span className="home-pack-view__premium-placeholder" aria-hidden="true" />
              )}
            </div>
          </div>
          <p className="home-pack-view__description">{PACK_DETAIL_COPY_BY_MODE_ID[selectedMode.id]}</p>
          <p className="muted home-pack-view__hint">
            {isSelectedPackFlipped
              ? 'Tap the card to flip back to the deck.'
              : 'Tap the card to preview an example from this pack.'}
          </p>
        </div>
      </section>

      <nav className="home-floating-dock" aria-label="Home quick actions">
        <button
          type="button"
          className="home-floating-dock__button"
          aria-label="Open profile"
          onClick={() => {
            hapticSelection()
            onNavigate('profile')
          }}
        >
          <AppIcon className="home-floating-dock__icon" icon={ICONS.account} />
        </button>
        <button
          type="button"
          className="home-floating-dock__button home-floating-dock__button--play"
          aria-label={primaryPlayLabel}
          onClick={handlePrimaryPlay}
        >
          <AppIcon className="home-floating-dock__icon home-floating-dock__icon--play" icon={ICONS.play} />
        </button>
        <button
          type="button"
          className="home-floating-dock__button"
          aria-label="Open settings"
          onClick={() => {
            hapticSelection()
            onNavigate('settings')
          }}
        >
          <AppIcon className="home-floating-dock__icon" icon={ICONS.settings} />
        </button>
      </nav>

      {pendingStartMode && (
        <Modal
          onClose={() => {
            hapticSelection()
            setPendingStartModeId(null)
          }}
          labelledBy="home-mode-confirm-title"
          className={`panel modal-card home-confirm-modal mode-tone--${pendingStartMode.toneClassName} stack-sm`}
        >
          <div className="home-confirm-modal__header stack-xs">
            <p className="label">Saved Round In Progress</p>
            <h3 id="home-mode-confirm-title">Start {pendingStartMode.name} instead?</h3>
          </div>
          <p id="home-mode-confirm-description" className="muted home-confirm-modal__description">
            This replaces your in-progress local round and opens setup for the selected mode.
          </p>
          <div className="onboarding-modal__actions home-confirm-modal__actions">
            <button
              type="button"
              onClick={() => {
                hapticSelection()
                setPendingStartModeId(null)
              }}
            >
              Keep Saved Round
            </button>
            <button
              ref={confirmButtonRef}
              type="button"
              className="button-primary"
              onClick={() => {
                launchModeFlow(pendingStartMode.id)
                setPendingStartModeId(null)
              }}
            >
              Continue to Setup
            </button>
          </div>
        </Modal>
      )}
    </section>
  )
}

export default HomeScreen
