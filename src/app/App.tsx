import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import AppIcon from '../components/AppIcon.tsx'
import OnboardingTutorial from '../components/OnboardingTutorial.tsx'
import SplashScreen from '../components/SplashScreen.tsx'
import { trackRoundResumed } from '../logic/analytics.ts'
import { applyThemePreference, loadThemePreference } from '../logic/preferences.ts'
import {
  loadOnboardingCompletionStatus,
  saveOnboardingCompletionStatus,
  shouldShowOnboarding,
  type OnboardingCompletionStatus,
} from '../logic/onboarding.ts'
import EndRoundScreen from '../screens/EndRoundScreen.tsx'
import HolePlayScreen from '../screens/HolePlayScreen.tsx'
import HoleResultsScreen from '../screens/HoleResultsScreen.tsx'
import HomeScreen from '../screens/HomeScreen.tsx'
import LeaderboardScreen from '../screens/LeaderboardScreen.tsx'
import ProfileScreen from '../screens/ProfileScreen.tsx'
import RoundSetupScreen from '../screens/RoundSetupScreen.tsx'
import SettingsScreen from '../screens/SettingsScreen.tsx'
import type { ScreenProps } from '../screens/types.ts'
import { clearRoundState, loadRoundStateSnapshot, saveRoundState } from '../logic/storage.ts'
import type { AppScreen } from './router.tsx'
import { createInitialAppState, getResumeScreen, reduceAppState } from './stateMachine.ts'

function getBackTargetScreen(
  activeScreen: AppScreen,
  currentHoleIndex: number,
): AppScreen | null {
  if (activeScreen === 'profile' || activeScreen === 'settings' || activeScreen === 'roundSetup') {
    return 'home'
  }

  if (activeScreen === 'holePlay') {
    return currentHoleIndex > 0 ? 'leaderboard' : 'roundSetup'
  }

  if (activeScreen === 'holeResults') {
    return 'holePlay'
  }

  if (activeScreen === 'leaderboard') {
    return 'holeResults'
  }

  if (activeScreen === 'endRound') {
    return 'home'
  }

  return null
}

function getScreenLabel(screen: AppScreen): string {
  if (screen === 'home') {
    return 'Home'
  }
  if (screen === 'profile') {
    return 'Profile'
  }
  if (screen === 'settings') {
    return 'Settings'
  }
  if (screen === 'roundSetup') {
    return 'Round Config'
  }
  if (screen === 'holePlay') {
    return 'Hole Setup'
  }
  if (screen === 'holeResults') {
    return 'Hole Results'
  }
  if (screen === 'leaderboard') {
    return 'Hole Recap'
  }
  return 'Home'
}

const SCREEN_TRANSITION_ORDER: Record<AppScreen, number> = {
  home: 0,
  profile: 1,
  settings: 1,
  roundSetup: 2,
  holePlay: 3,
  holeResults: 4,
  leaderboard: 5,
  endRound: 6,
}

const SPLASH_VARIANT_STORAGE_KEY = 'gimme-golf-splash-variant-v1'
const SPLASH_DURATION_MS = 3_600
const APP_WORDMARK_SOURCE = `${import.meta.env.BASE_URL}Gimme-Golf-Bold-Logo-app.png`
const APP_WORDMARK_FALLBACK_SOURCES = [
  `${import.meta.env.BASE_URL}Gimme-Golf-Bold-Logo.png`,
  `${import.meta.env.BASE_URL}Gimme-Golf-Bold-Alt-Logo.png`,
] as const
const SPLASH_BACKGROUND_SOURCES = [
  `${import.meta.env.BASE_URL}splash_screen_app.png`,
  `${import.meta.env.BASE_URL}splash_screen_alt_app.png`,
] as const
const SPLASH_LOGO_SOURCES = [
  `${import.meta.env.BASE_URL}Gimme-Golf-Bold-Logo-app.png`,
  `${import.meta.env.BASE_URL}Gimme-Golf-3D-Logo-app.png`,
  `${import.meta.env.BASE_URL}Gimme-Golf-Narrow-Logo-app.png`,
  `${import.meta.env.BASE_URL}Gimme-Golf-Narrow-Alt-Logo-app.png`,
  `${import.meta.env.BASE_URL}Gimme-Golf-Bold-Alt-Logo-app.png`,
] as const
let cachedSplashBackgroundVariant: 0 | 1 | null = null

function getSplashBackgroundVariant(): 0 | 1 {
  if (cachedSplashBackgroundVariant !== null) {
    return cachedSplashBackgroundVariant
  }

  if (typeof window === 'undefined') {
    return 0
  }

  try {
    const nextVariantValue = window.localStorage.getItem(SPLASH_VARIANT_STORAGE_KEY)
    const currentVariant: 0 | 1 = nextVariantValue === '1' ? 1 : 0
    window.localStorage.setItem(
      SPLASH_VARIANT_STORAGE_KEY,
      currentVariant === 0 ? '1' : '0',
    )
    cachedSplashBackgroundVariant = currentVariant
    return currentVariant
  } catch {
    cachedSplashBackgroundVariant = 0
    return 0
  }
}

function getScreenTransitionDirection(
  previousScreen: AppScreen,
  nextScreen: AppScreen,
): 'forward' | 'backward' {
  const previousOrder = SCREEN_TRANSITION_ORDER[previousScreen]
  const nextOrder = SCREEN_TRANSITION_ORDER[nextScreen]

  if (nextOrder === previousOrder) {
    return 'forward'
  }

  return nextOrder > previousOrder ? 'forward' : 'backward'
}

function App() {
  const [onboardingCompletionStatus, setOnboardingCompletionStatus] = useState(() =>
    loadOnboardingCompletionStatus(),
  )
  const [initialRoundSnapshot] = useState(() => loadRoundStateSnapshot())
  const [isModeDetailOpen, setIsModeDetailOpen] = useState(false)
  const [appState, dispatch] = useReducer(
    reduceAppState,
    undefined,
    () =>
      createInitialAppState(
        initialRoundSnapshot.roundState,
        initialRoundSnapshot.savedAtMs,
      ),
  )
  const [screenTransitionDirection, setScreenTransitionDirection] = useState<'forward' | 'backward'>(
    'forward',
  )
  const [screenTransitionRevision, setScreenTransitionRevision] = useState(0)
  const [shouldAnimateScreenTransition, setShouldAnimateScreenTransition] = useState(false)
  const previousScreenRef = useRef<AppScreen>(appState.activeScreen)
  const [isSplashVisible, setIsSplashVisible] = useState(true)
  const [splashBackgroundVariant] = useState<0 | 1>(() => getSplashBackgroundVariant())

  useEffect(() => {
    if (!appState.shouldPersistRoundState) {
      return
    }

    dispatch({ type: 'mark_persisted', savedAtMs: saveRoundState(appState.roundState) })
  }, [appState.roundState, appState.shouldPersistRoundState])

  useEffect(() => {
    applyThemePreference(loadThemePreference())
  }, [])

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'auto',
    })
  }, [appState.activeScreen, isModeDetailOpen])

  useEffect(() => {
    if (appState.activeScreen !== 'endRound') {
      return
    }

    clearRoundState()
    dispatch({ type: 'clear_saved_round_flag' })
  }, [appState.activeScreen])

  useEffect(() => {
    const previousScreen = previousScreenRef.current
    if (previousScreen === appState.activeScreen) {
      return
    }

    setScreenTransitionDirection(
      getScreenTransitionDirection(previousScreen, appState.activeScreen),
    )
    setScreenTransitionRevision((currentValue) => currentValue + 1)
    setShouldAnimateScreenTransition(true)
    previousScreenRef.current = appState.activeScreen
  }, [appState.activeScreen])

  const onUpdateRoundState: ScreenProps['onUpdateRoundState'] = (updater) => {
    dispatch({ type: 'update_round_state', updater })
  }

  const onResumeSavedRound: ScreenProps['onResumeSavedRound'] = () => {
    const savedRoundSnapshot = loadRoundStateSnapshot()
    if (savedRoundSnapshot.roundState) {
      trackRoundResumed(
        savedRoundSnapshot.roundState,
        getResumeScreen(savedRoundSnapshot.roundState),
      )
    }

    dispatch({
      type: 'resume_saved_round',
      savedRoundState: savedRoundSnapshot.roundState,
      savedAtMs: savedRoundSnapshot.savedAtMs,
    })
    return Boolean(savedRoundSnapshot.roundState)
  }

  const onResetRound = () => {
    dispatch({ type: 'reset_round' })
  }

  const onAbandonRound = () => {
    clearRoundState()
    dispatch({ type: 'abandon_round' })
  }

  const onNavigate: ScreenProps['onNavigate'] = (screen: AppScreen) => {
    if (screen !== 'home') {
      setIsModeDetailOpen(false)
    }
    dispatch({ type: 'navigate', screen })
  }

  const closeOnboarding = (completionStatus: OnboardingCompletionStatus) => {
    saveOnboardingCompletionStatus(completionStatus)
    setOnboardingCompletionStatus(completionStatus)
  }

  const isOnboardingVisible = shouldShowOnboarding({
    completionStatus: onboardingCompletionStatus,
    isReplayRequested: false,
  })

  const sharedScreenProps: ScreenProps = {
    roundState: appState.roundState,
    hasSavedRound: appState.hasSavedRound,
    savedRoundUpdatedAtMs: appState.savedRoundUpdatedAtMs,
    isRoundSavePending: appState.shouldPersistRoundState,
    roundSaveWarning: appState.roundSaveWarning,
    onNavigate,
    onResumeSavedRound,
    onResetRound,
    onAbandonRound,
    onUpdateRoundState,
  }

  const content = (() => {
    switch (appState.activeScreen) {
      case 'home':
        return (
          <HomeScreen
            {...sharedScreenProps}
            onModeDetailOpenChange={setIsModeDetailOpen}
          />
        )
      case 'profile':
        return <ProfileScreen {...sharedScreenProps} />
      case 'settings':
        return <SettingsScreen {...sharedScreenProps} />
      case 'roundSetup':
        return <RoundSetupScreen {...sharedScreenProps} />
      case 'holePlay':
        return <HolePlayScreen {...sharedScreenProps} />
      case 'holeResults':
        return <HoleResultsScreen {...sharedScreenProps} />
      case 'leaderboard':
        return <LeaderboardScreen {...sharedScreenProps} />
      case 'endRound':
        return <EndRoundScreen {...sharedScreenProps} />
      default:
        return (
          <HomeScreen
            {...sharedScreenProps}
            onModeDetailOpenChange={setIsModeDetailOpen}
          />
        )
    }
  })()

  const safeCurrentHoleIndex = Math.min(
    Math.max(appState.roundState.currentHoleIndex, 0),
    Math.max(appState.roundState.holes.length - 1, 0),
  )
  const currentHole = appState.roundState.holes[safeCurrentHoleIndex]
  const shouldShowProgressChip = appState.activeScreen === 'endRound'
  const shouldShowGlobalHeader = !(appState.activeScreen === 'home' && isModeDetailOpen)
  const shouldShowWordmark =
    shouldShowGlobalHeader &&
    (appState.activeScreen === 'home' ||
      appState.activeScreen === 'leaderboard' ||
      appState.activeScreen === 'endRound')
  const isModePreviewActive = appState.activeScreen === 'home' && isModeDetailOpen
  const backTargetScreen =
    shouldShowGlobalHeader && !isModePreviewActive
      ? getBackTargetScreen(appState.activeScreen, appState.roundState.currentHoleIndex)
      : null

  const usesCompactHeader = shouldShowGlobalHeader && !shouldShowWordmark
  const shouldRenderGlobalHeader = shouldShowGlobalHeader && !usesCompactHeader
  const shouldRenderInlineBackButton = usesCompactHeader && Boolean(backTargetScreen)
  const onSplashFinish = useCallback(() => {
    setIsSplashVisible(false)
  }, [])

  if (isSplashVisible) {
    return (
      <SplashScreen
        backgroundImageSrc={SPLASH_BACKGROUND_SOURCES[splashBackgroundVariant]}
        logoSources={SPLASH_LOGO_SOURCES}
        durationMs={SPLASH_DURATION_MS}
        onFinish={onSplashFinish}
      />
    )
  }

  return (
    <div
      className={`app-shell ${isModePreviewActive ? 'app-shell--mode-preview' : ''} ${
        usesCompactHeader ? 'app-shell--compact-header' : ''
      }`}
    >
      {shouldRenderGlobalHeader && (
        <header className={`app-shell__header ${usesCompactHeader ? 'app-shell__header--compact' : ''}`}>
          {backTargetScreen ? (
            <button
              type="button"
              className="app-shell__history-button"
              aria-label={`Back to ${getScreenLabel(backTargetScreen)}`}
              onClick={() => onNavigate(backTargetScreen)}
            >
              <AppIcon className="app-shell__history-button-icon" icon="arrow_back" />
            </button>
          ) : (
            <span className="app-shell__header-spacer" aria-hidden="true" />
          )}
          <h1 className={`app-wordmark ${shouldShowWordmark ? '' : 'app-wordmark--hidden'}`}>
            <img
              className="app-wordmark__image"
              src={APP_WORDMARK_SOURCE}
              alt="Gimme Golf"
              onError={(event) => {
                const image = event.currentTarget
                const fallbackStage = Number.parseInt(image.dataset.fallbackStage ?? '0', 10)
                const safeFallbackStage = Number.isNaN(fallbackStage) ? 0 : fallbackStage
                const fallbackSource = APP_WORDMARK_FALLBACK_SOURCES[safeFallbackStage]

                if (fallbackSource) {
                  image.dataset.fallbackStage = String(safeFallbackStage + 1)
                  image.src = fallbackSource
                  return
                }

                if (image.dataset.fallbackApplied === 'true') {
                  return
                }

                image.dataset.fallbackApplied = 'true'
                image.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='
              }}
            />
          </h1>
          {shouldShowProgressChip ? (
            <span className="chip app-shell__progress-chip">
              Hole {currentHole?.holeNumber ?? 1} of {appState.roundState.config.holeCount}
            </span>
          ) : (
            <span className="app-shell__header-spacer" aria-hidden="true" />
          )}
        </header>
      )}

      <main className={`app-shell__main ${usesCompactHeader ? 'app-shell__main--compact' : ''}`}>
        {shouldRenderInlineBackButton && backTargetScreen && (
          <button
            type="button"
            className="app-shell__history-button app-shell__history-button--inline"
            aria-label={`Back to ${getScreenLabel(backTargetScreen)}`}
            onClick={() => onNavigate(backTargetScreen)}
          >
            <AppIcon className="app-shell__history-button-icon" icon="arrow_back" />
          </button>
        )}
        <div
          key={`${appState.activeScreen}-${screenTransitionRevision}`}
          className={`app-shell__screen-frame ${
            shouldAnimateScreenTransition
              ? `app-shell__screen-frame--${screenTransitionDirection}`
              : ''
          }`}
        >
          {content}
        </div>
      </main>
      {appState.roundSaveWarning && appState.activeScreen !== 'home' && (
        <aside className="app-save-warning" role="status" aria-live="polite">
          {appState.roundSaveWarning}
        </aside>
      )}
      {isOnboardingVisible && <OnboardingTutorial onClose={closeOnboarding} />}
    </div>
  )
}

export default App
