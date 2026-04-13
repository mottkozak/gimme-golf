import {
  Suspense,
  lazy,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type TouchEvent,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'
import AppIcon from '../components/AppIcon.tsx'
import SplashScreen from '../components/SplashScreen.tsx'
import type { AuthGateState } from '../components/auth-gate/authGateState.ts'
import { hapticLightImpact, hapticSelection, hapticWarning } from '../capacitor/haptics.ts'
import { useKeyboardAvoidance } from '../hooks/useKeyboardAvoidance.ts'
import { useNetworkStatus } from '../hooks/useNetworkStatus.ts'
import { useOrientationMode } from '../hooks/useOrientationMode.ts'
import {
  clearRoundState,
  loadRoundStateSnapshot,
} from '../logic/storage.ts'
import { resetRoundProgress } from '../logic/roundLifecycle.ts'
import type { ScreenProps } from './screenContracts.ts'
import { getBackTargetScreen, getScreenLabel } from './orchestration/navigation.ts'
import {
  APP_WORDMARK_FALLBACK_SOURCES,
  APP_WORDMARK_SOURCE,
  AUTH_GATE_BACKGROUND_FALLBACK_SOURCES,
  SPLASH_BACKGROUND_SOURCES,
  SPLASH_BLANK_LOGO_SOURCE,
  getSplashBackgroundVariant,
} from './orchestration/splash.ts'
import { useAutoClearMessage } from './orchestration/useAutoClearMessage.ts'
import { useAppLifecycleOrchestration } from './orchestration/useAppLifecycleOrchestration.ts'
import { useNativeDiagnostics } from './orchestration/useNativeDiagnostics.ts'
import { useRoundStateRefs } from './orchestration/useRoundStateRefs.ts'
import { useScreenTransitionState } from './orchestration/useScreenTransitionState.ts'
import { useAppStartupOrchestration } from './orchestration/useAppStartupOrchestration.ts'
import { useMultiplayerRoundSync } from './orchestration/useMultiplayerRoundSync.ts'
import type { AppScreen } from './router.tsx'
import { createInitialAppState, getResumeScreen, reduceAppState } from './stateMachine.ts'

const RoundSetupScreen = lazy(async () => {
  const module = await import('../features/setup/index.ts')
  return { default: module.RoundSetupScreen }
})
const HomeScreen = lazy(async () => {
  const module = await import('../features/home/index.ts')
  return { default: module.HomeScreen }
})
const MultiplayerAccessScreen = lazy(async () => {
  const module = await import('../features/multiplayer/index.ts')
  return { default: module.MultiplayerAccessScreen }
})
const MultiplayerLobbyScreen = lazy(async () => {
  const module = await import('../features/multiplayer/index.ts')
  return { default: module.MultiplayerLobbyScreen }
})
const AuthOnboardingGate = lazy(() => import('../components/AuthOnboardingGate.tsx'))
const HolePlayScreen = lazy(async () => {
  const module = await import('../features/hole-play/index.ts')
  return { default: module.HolePlayScreen }
})
const HoleResultsScreen = lazy(async () => {
  const module = await import('../features/results/index.ts')
  return { default: module.HoleResultsScreen }
})
const LeaderboardScreen = lazy(async () => {
  const module = await import('../features/recap/LeaderboardScreen.tsx')
  return { default: module.default }
})
const EndRoundScreen = lazy(async () => {
  const module = await import('../features/recap/EndRoundScreen.tsx')
  return { default: module.default }
})
const ProfileScreen = lazy(() => import('../screens/ProfileScreen.tsx'))
const SettingsScreen = lazy(() => import('../screens/SettingsScreen.tsx'))
const SPLASH_AUTH_HOLD_TIMEOUT_MS = 12_000
const SWIPE_BACK_ENABLED_SCREENS = new Set<AppScreen>([
  'multiplayerAccess',
  'multiplayerLobby',
  'profile',
  'settings',
  'roundSetup',
  'holePlay',
  'holeResults',
])
const SWIPE_BACK_EDGE_GUTTER_PX = 112
const SWIPE_BACK_TRIGGER_DISTANCE_PX = 44
const SWIPE_BACK_HORIZONTAL_DOMINANCE_RATIO = 1
const SWIPE_BACK_DIRECTION_LOCK_DISTANCE_PX = 8
type SwipeBackDirection = 'undecided' | 'horizontal' | 'vertical'

function resolveSwipeBackTargetScreen(
  activeScreen: AppScreen,
  backTargetScreen: AppScreen | null,
): AppScreen | null {
  if (!SWIPE_BACK_ENABLED_SCREENS.has(activeScreen)) {
    return null
  }

  return backTargetScreen
}

function shouldRenderBackArrowButton(
  activeScreen: AppScreen,
  currentHoleIndex: number,
  backTargetScreen: AppScreen | null,
): boolean {
  if (activeScreen === 'leaderboard' && currentHoleIndex === 0) {
    return false
  }
  if (activeScreen === 'endRound') {
    return false
  }

  return Boolean(backTargetScreen)
}

function isBackSwipeGesture(deltaX: number, deltaY: number): boolean {
  const horizontalDistance = Math.abs(deltaX)
  const verticalDistance = Math.abs(deltaY)
  return (
    deltaX >= SWIPE_BACK_TRIGGER_DISTANCE_PX &&
    horizontalDistance > verticalDistance * SWIPE_BACK_HORIZONTAL_DOMINANCE_RATIO
  )
}

// eslint-disable-next-line complexity -- app shell coordinates navigation, gestures, auth gate, and runtime banners.
function App() {
  useNativeDiagnostics()
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
  const {
    screenTransitionDirection,
    screenTransitionRevision,
    shouldAnimateScreenTransition,
  } = useScreenTransitionState(appState.activeScreen)
  const [hasSplashIntroFinished, setHasSplashIntroFinished] = useState(false)
  const [authGateState, setAuthGateState] = useState<AuthGateState>('loading')
  const [hasSplashAuthHoldTimedOut, setHasSplashAuthHoldTimedOut] = useState(false)
  const [splashBackgroundVariant] = useState<0 | 1>(() => getSplashBackgroundVariant())
  const { isKeyboardVisible, keyboardInsetPx } = useKeyboardAvoidance()
  const orientationMode = useOrientationMode()
  const { isOnline, isSlowConnection, isRechecking, recheckConnectivity } = useNetworkStatus()

  const [lifecycleMessage, setLifecycleMessage] = useState<string | null>(null)
  const [offlineActionMessage, setOfflineActionMessage] = useState<string | null>(null)
  const swipeBackStartXRef = useRef<number | null>(null)
  const swipeBackStartYRef = useRef<number | null>(null)
  const swipeBackEligibleRef = useRef(false)
  const swipeBackDirectionRef = useRef<SwipeBackDirection>('undecided')
  const swipeBackDidNavigateRef = useRef(false)
  const { roundStateRef, hasSavedRoundRef, savedRoundUpdatedAtMsRef } = useRoundStateRefs(
    appState.roundState,
    appState.hasSavedRound,
    appState.savedRoundUpdatedAtMs,
  )
  const clearLifecycleMessage = useCallback(() => {
    setLifecycleMessage(null)
  }, [])
  const clearOfflineActionMessage = useCallback(() => {
    setOfflineActionMessage(null)
  }, [])
  useAutoClearMessage(lifecycleMessage, clearLifecycleMessage, 3000)
  useAutoClearMessage(offlineActionMessage, clearOfflineActionMessage, 2600)
  useAppStartupOrchestration({
    appState,
    dispatch,
    hasSplashIntroFinished,
    hasSavedRoundRef,
    isModeDetailOpen,
    setLifecycleMessage,
  })
  const {
    activeMultiplayerSession,
    multiplayerSyncState,
    multiplayerStatusMessage,
    pendingUpdateCount,
    conflictReviewMessage,
    clearConflictReview,
    onUpdateRoundState,
  } = useMultiplayerRoundSync({
    activeScreen: appState.activeScreen,
    dispatch,
    isOnline,
    roundStateRef,
  })

  const onResumeSavedRound: ScreenProps['onResumeSavedRound'] = () => {
    const savedRoundSnapshot = loadRoundStateSnapshot()
    if (savedRoundSnapshot.roundState) {
      const resumedRoundState = savedRoundSnapshot.roundState
      void import('../logic/analytics.ts')
        .then(({ trackRoundResumed }) => {
          trackRoundResumed(
            resumedRoundState,
            getResumeScreen(resumedRoundState),
          )
        })
        .catch(() => {
          // Analytics should stay best-effort and never block resume.
        })
    }

    dispatch({
      type: 'resume_saved_round',
      savedRoundState: savedRoundSnapshot.roundState,
      savedAtMs: savedRoundSnapshot.savedAtMs,
    })
    return Boolean(savedRoundSnapshot.roundState)
  }

  const onResetRound = () => {
    onUpdateRoundState((currentState) => resetRoundProgress(currentState))
    onNavigate('home')
  }

  const onAbandonRound = () => {
    clearRoundState()
    dispatch({ type: 'abandon_round' })
  }

  const onNavigate: ScreenProps['onNavigate'] = useCallback(
    (screen: AppScreen) => {
      if (screen !== 'home') {
        setIsModeDetailOpen(false)
      }
      dispatch({ type: 'navigate', screen })
    },
    [dispatch],
  )
  const retryNetworkConnectivity = useCallback(() => {
    hapticSelection()
    void recheckConnectivity()
  }, [recheckConnectivity])
  const onNetworkRequiredActionCapture = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (isOnline) {
        return
      }

      const targetElement = event.target
      if (!(targetElement instanceof Element)) {
        return
      }

      const restrictedAction = targetElement.closest('[data-requires-network="true"]')
      if (!restrictedAction) {
        return
      }

      event.preventDefault()
      event.stopPropagation()
      hapticWarning()
      setOfflineActionMessage('You are offline. Reconnect and retry this action.')
    },
    [isOnline],
  )
  const onNetworkRequiredActionKeyCapture = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (isOnline || (event.key !== 'Enter' && event.key !== ' ')) {
        return
      }

      const targetElement = event.target
      if (!(targetElement instanceof Element)) {
        return
      }

      const restrictedAction = targetElement.closest('[data-requires-network="true"]')
      if (!restrictedAction) {
        return
      }

      event.preventDefault()
      event.stopPropagation()
      hapticWarning()
      setOfflineActionMessage('You are offline. Reconnect and retry this action.')
    },
    [isOnline],
  )

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
  const screenLoadingFallback = (
    <section className="screen stack-sm" role="status" aria-live="polite">
      <p className="muted">Loading screen…</p>
    </section>
  )

  const content = (() => {
    switch (appState.activeScreen) {
      case 'home':
        return (
          <Suspense fallback={screenLoadingFallback}>
            <HomeScreen
              {...sharedScreenProps}
              onModeDetailOpenChange={setIsModeDetailOpen}
            />
          </Suspense>
        )
      case 'multiplayerAccess':
        return (
          <Suspense fallback={screenLoadingFallback}>
            <MultiplayerAccessScreen {...sharedScreenProps} />
          </Suspense>
        )
      case 'multiplayerLobby':
        return (
          <Suspense fallback={screenLoadingFallback}>
            <MultiplayerLobbyScreen {...sharedScreenProps} />
          </Suspense>
        )
      case 'profile':
        return (
          <Suspense fallback={screenLoadingFallback}>
            <ProfileScreen {...sharedScreenProps} />
          </Suspense>
        )
      case 'settings':
        return (
          <Suspense fallback={screenLoadingFallback}>
            <SettingsScreen {...sharedScreenProps} />
          </Suspense>
        )
      case 'roundSetup':
        return (
          <Suspense fallback={screenLoadingFallback}>
            <RoundSetupScreen {...sharedScreenProps} />
          </Suspense>
        )
      case 'holePlay':
        return (
          <Suspense fallback={screenLoadingFallback}>
            <HolePlayScreen {...sharedScreenProps} />
          </Suspense>
        )
      case 'holeResults':
        return (
          <Suspense fallback={screenLoadingFallback}>
            <HoleResultsScreen {...sharedScreenProps} />
          </Suspense>
        )
      case 'leaderboard':
        return (
          <Suspense fallback={screenLoadingFallback}>
            <LeaderboardScreen {...sharedScreenProps} />
          </Suspense>
        )
      case 'endRound':
        return (
          <Suspense fallback={screenLoadingFallback}>
            <EndRoundScreen {...sharedScreenProps} />
          </Suspense>
        )
      default:
        return (
          <Suspense fallback={screenLoadingFallback}>
            <HomeScreen
              {...sharedScreenProps}
              onModeDetailOpenChange={setIsModeDetailOpen}
            />
          </Suspense>
        )
    }
  })()

  const shouldShowGlobalHeader = appState.activeScreen !== 'home'
  const shouldShowWordmark =
    shouldShowGlobalHeader &&
    (appState.activeScreen === 'leaderboard' || appState.activeScreen === 'endRound')
  const isModePreviewActive = appState.activeScreen === 'home' && isModeDetailOpen
  const backTargetScreen =
    shouldShowGlobalHeader && !isModePreviewActive
      ? getBackTargetScreen(
          appState.activeScreen,
          appState.roundState.currentHoleIndex,
          appState.roundState.config.gameMode,
        )
      : null
  const swipeBackTargetScreen = resolveSwipeBackTargetScreen(appState.activeScreen, backTargetScreen)
  useAppLifecycleOrchestration({
    backTargetScreen,
    dispatch,
    hasSavedRoundRef,
    onNavigate,
    roundStateRef,
    savedRoundUpdatedAtMsRef,
    setLifecycleMessage,
  })

  const usesCompactHeader = shouldShowGlobalHeader && !shouldShowWordmark
  const shouldRenderGlobalHeader = shouldShowGlobalHeader && !usesCompactHeader
  const shouldRenderBackButton = shouldRenderBackArrowButton(
    appState.activeScreen,
    appState.roundState.currentHoleIndex,
    backTargetScreen,
  )
  const shouldRenderInlineBackButton = usesCompactHeader && shouldRenderBackButton
  const appShellStyle = useMemo(
    () =>
      ({
        '--keyboard-inset': `${keyboardInsetPx}px`,
      }) as CSSProperties,
    [keyboardInsetPx],
  )
  const shouldShowNetworkBanner = !isOnline || isSlowConnection
  const shouldShowMultiplayerBanner = Boolean(activeMultiplayerSession)
  const shouldShowConflictReviewPanel = Boolean(conflictReviewMessage)
  const multiplayerBannerToneClass =
    multiplayerSyncState === 'offline'
      ? 'multiplayer-status-banner--offline'
      : multiplayerSyncState === 'conflict'
        ? 'multiplayer-status-banner--conflict'
        : multiplayerSyncState === 'syncing'
          ? 'multiplayer-status-banner--syncing'
          : 'multiplayer-status-banner--synced'
  const onSplashFinish = useCallback(() => {
    setHasSplashIntroFinished(true)
  }, [])
  const resetSwipeBackTracking = useCallback(() => {
    swipeBackStartXRef.current = null
    swipeBackStartYRef.current = null
    swipeBackEligibleRef.current = false
    swipeBackDirectionRef.current = 'undecided'
  }, [])
  const onSwipeBackTouchStartCapture = useCallback(
    (event: TouchEvent<HTMLElement>) => {
      if (!swipeBackTargetScreen || event.touches.length !== 1) {
        resetSwipeBackTracking()
        return
      }

      const firstTouch = event.touches[0]
      if (!firstTouch) {
        resetSwipeBackTracking()
        return
      }

      const targetElement = event.target
      if (targetElement instanceof Element && targetElement.closest('[data-swipe-back-exempt="true"]')) {
        resetSwipeBackTracking()
        return
      }

      swipeBackEligibleRef.current = firstTouch.clientX <= SWIPE_BACK_EDGE_GUTTER_PX
      if (!swipeBackEligibleRef.current) {
        resetSwipeBackTracking()
        return
      }

      swipeBackStartXRef.current = firstTouch.clientX
      swipeBackStartYRef.current = firstTouch.clientY
      swipeBackDidNavigateRef.current = false
    },
    [resetSwipeBackTracking, swipeBackTargetScreen],
  )
  const onSwipeBackTouchMoveCapture = useCallback(
    (event: TouchEvent<HTMLElement>) => {
      const targetScreen = swipeBackTargetScreen
      if (
        !targetScreen ||
        !swipeBackEligibleRef.current ||
        swipeBackStartXRef.current === null ||
        swipeBackStartYRef.current === null
      ) {
        return
      }

      const firstTouch = event.touches[0]
      if (!firstTouch) {
        return
      }

      const deltaX = firstTouch.clientX - swipeBackStartXRef.current
      const deltaY = firstTouch.clientY - swipeBackStartYRef.current
      const horizontalDistance = Math.abs(deltaX)
      const verticalDistance = Math.abs(deltaY)

      if (
        swipeBackDirectionRef.current === 'undecided' &&
        (horizontalDistance >= SWIPE_BACK_DIRECTION_LOCK_DISTANCE_PX ||
          verticalDistance >= SWIPE_BACK_DIRECTION_LOCK_DISTANCE_PX)
      ) {
        swipeBackDirectionRef.current =
          horizontalDistance > verticalDistance * SWIPE_BACK_HORIZONTAL_DOMINANCE_RATIO
            ? 'horizontal'
            : 'vertical'
      }

      if (swipeBackDirectionRef.current !== 'horizontal' || swipeBackDidNavigateRef.current) {
        return
      }

      if (!isBackSwipeGesture(deltaX, deltaY)) {
        return
      }

      swipeBackDidNavigateRef.current = true
      resetSwipeBackTracking()
      hapticLightImpact()
      onNavigate(targetScreen)
    },
    [onNavigate, resetSwipeBackTracking, swipeBackTargetScreen],
  )
  const onSwipeBackTouchEndCapture = useCallback(
    (event: TouchEvent<HTMLElement>) => {
      if (swipeBackDidNavigateRef.current) {
        swipeBackDidNavigateRef.current = false
        resetSwipeBackTracking()
        return
      }

      const targetScreen = swipeBackTargetScreen
      if (
        !targetScreen ||
        !swipeBackEligibleRef.current ||
        swipeBackStartXRef.current === null ||
        swipeBackStartYRef.current === null
      ) {
        resetSwipeBackTracking()
        return
      }

      const firstTouch = event.changedTouches[0]
      if (!firstTouch) {
        resetSwipeBackTracking()
        return
      }

      const deltaX = firstTouch.clientX - swipeBackStartXRef.current
      const deltaY = firstTouch.clientY - swipeBackStartYRef.current
      const isBackSwipe = isBackSwipeGesture(deltaX, deltaY)

      resetSwipeBackTracking()
      if (!isBackSwipe) {
        return
      }

      hapticLightImpact()
      onNavigate(targetScreen)
    },
    [onNavigate, resetSwipeBackTracking, swipeBackTargetScreen],
  )
  const onSwipeBackTouchCancelCapture = useCallback(() => {
    resetSwipeBackTracking()
    swipeBackDidNavigateRef.current = false
  }, [resetSwipeBackTracking])
  useEffect(() => {
    if (!hasSplashIntroFinished || authGateState !== 'loading') {
      setHasSplashAuthHoldTimedOut(false)
      return
    }

    const timeoutId = window.setTimeout(() => {
      setHasSplashAuthHoldTimedOut(true)
    }, SPLASH_AUTH_HOLD_TIMEOUT_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [authGateState, hasSplashIntroFinished])
  const shouldHoldSplashForAuth =
    hasSplashIntroFinished && authGateState === 'loading' && !hasSplashAuthHoldTimedOut
  const shouldShowSplash = !hasSplashIntroFinished || shouldHoldSplashForAuth

  return (
    <>
      <Suspense fallback={null}>
        <AuthOnboardingGate
          splashBackgroundImageSrc={SPLASH_BACKGROUND_SOURCES[splashBackgroundVariant]}
          splashBackgroundFallbackImageSrc={AUTH_GATE_BACKGROUND_FALLBACK_SOURCES[splashBackgroundVariant]}
          onStateChange={setAuthGateState}
        >
          <div
            className={`app-shell app-shell--post-splash ${isModePreviewActive ? 'app-shell--mode-preview' : ''} ${
              usesCompactHeader ? 'app-shell--compact-header' : ''
            } ${shouldRenderInlineBackButton ? 'app-shell--with-inline-back' : ''} ${
              isKeyboardVisible ? 'app-shell--keyboard-visible' : ''
            } ${
              orientationMode === 'landscape' ? 'app-shell--landscape' : 'app-shell--portrait'
            } ${!isOnline ? 'app-shell--offline' : ''} ${
              isSlowConnection ? 'app-shell--poor-network' : ''
            }`}
            style={appShellStyle}
            data-network-online={isOnline ? 'true' : 'false'}
            onClickCapture={onNetworkRequiredActionCapture}
            onKeyDownCapture={onNetworkRequiredActionKeyCapture}
          >
          {shouldShowNetworkBanner && (
            <aside
              className={`network-status-banner ${
                !isOnline ? 'network-status-banner--offline' : 'network-status-banner--slow'
              }`}
              role="status"
              aria-live="polite"
            >
              <span className="network-status-banner__message">
                {!isOnline
                  ? 'You are offline. Network actions are paused until reconnection.'
                  : 'Connection is poor. Requests may take longer than usual.'}
              </span>
              {!isOnline && (
                <button
                  type="button"
                  className="network-status-banner__retry"
                  onClick={retryNetworkConnectivity}
                  disabled={isRechecking}
                >
                  {isRechecking ? 'Checking…' : 'Retry'}
                </button>
              )}
            </aside>
          )}
          {shouldShowMultiplayerBanner && activeMultiplayerSession && (
            <aside
              className={`multiplayer-status-banner ${multiplayerBannerToneClass}`}
              role="status"
              aria-live="polite"
            >
              <span className="multiplayer-status-banner__message">
                Room {activeMultiplayerSession.roomCode} • {multiplayerSyncState}
                {pendingUpdateCount > 0 ? ` • queued ${pendingUpdateCount}` : ''}
              </span>
              {multiplayerStatusMessage && (
                <span className="multiplayer-status-banner__detail">{multiplayerStatusMessage}</span>
              )}
            </aside>
          )}
          {shouldRenderGlobalHeader && (
            <header className={`app-shell__header ${usesCompactHeader ? 'app-shell__header--compact' : ''}`}>
              {shouldRenderBackButton && backTargetScreen ? (
                <button
                  type="button"
                  className="app-shell__history-button"
                  aria-label={`Back to ${getScreenLabel(backTargetScreen)}`}
                  onClick={() => {
                    hapticLightImpact()
                    onNavigate(backTargetScreen)
                  }}
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
              <span className="app-shell__header-spacer" aria-hidden="true" />
            </header>
          )}

          <main
            className={`app-shell__main ${usesCompactHeader ? 'app-shell__main--compact' : ''}`}
            onTouchStartCapture={onSwipeBackTouchStartCapture}
            onTouchMoveCapture={onSwipeBackTouchMoveCapture}
            onTouchEndCapture={onSwipeBackTouchEndCapture}
            onTouchCancelCapture={onSwipeBackTouchCancelCapture}
          >
            {shouldRenderInlineBackButton && backTargetScreen && (
              <button
                type="button"
                className="app-shell__history-button app-shell__history-button--inline"
                aria-label={`Back to ${getScreenLabel(backTargetScreen)}`}
                onClick={() => {
                  hapticLightImpact()
                  onNavigate(backTargetScreen)
                }}
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
          {lifecycleMessage && (
            <aside className="app-save-warning" role="status" aria-live="polite">
              {lifecycleMessage}
            </aside>
          )}
          {offlineActionMessage && (
            <aside className="network-action-feedback" role="status" aria-live="polite">
              {offlineActionMessage}
            </aside>
          )}
          {shouldShowConflictReviewPanel && (
            <aside className="multiplayer-conflict-review" role="alert" aria-live="assertive">
              <p className="multiplayer-conflict-review__title">Multiplayer Review Needed</p>
              <p className="multiplayer-conflict-review__message">{conflictReviewMessage}</p>
              <div className="multiplayer-conflict-review__actions">
                <button
                  type="button"
                  onClick={() => {
                    hapticLightImpact()
                    onNavigate('multiplayerLobby')
                  }}
                >
                  Open Lobby
                </button>
                <button
                  type="button"
                  className="button-primary"
                  onClick={() => {
                    hapticSelection()
                    clearConflictReview()
                  }}
                >
                  Continue with Latest State
                </button>
              </div>
            </aside>
          )}
          {orientationMode === 'landscape' && (
            <aside className="app-orientation-lock" role="alert" aria-live="assertive">
              <div className="app-orientation-lock__card">
                <p className="label">Portrait Only</p>
                <p>Rotate your device back to portrait to continue.</p>
              </div>
            </aside>
          )}
          </div>
        </AuthOnboardingGate>
      </Suspense>
      {shouldShowSplash && (
        <SplashScreen
          key={shouldHoldSplashForAuth ? 'splash-hold' : 'splash-intro'}
          backgroundImageSrc={SPLASH_BACKGROUND_SOURCES[splashBackgroundVariant]}
          blankLogoSrc={SPLASH_BLANK_LOGO_SOURCE}
          onFinish={onSplashFinish}
          hold={shouldHoldSplashForAuth}
        />
      )}
    </>
  )
}

export default App
