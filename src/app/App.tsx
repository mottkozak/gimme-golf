import { useEffect, useReducer, useState } from 'react'
import OnboardingTutorial from '../components/OnboardingTutorial.tsx'
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
  const shouldShowWordmark = !(appState.activeScreen === 'home' && isModeDetailOpen)
  const isModePreviewActive = appState.activeScreen === 'home' && isModeDetailOpen

  return (
    <div className={`app-shell ${isModePreviewActive ? 'app-shell--mode-preview' : ''}`}>
      {shouldShowGlobalHeader && (
        <header className="app-shell__header">
          <span className="app-shell__header-spacer" aria-hidden="true" />
          <h1 className={`app-wordmark ${shouldShowWordmark ? '' : 'app-wordmark--hidden'}`}>Gimme Golf</h1>
          {shouldShowProgressChip ? (
            <span className="chip app-shell__progress-chip">
              Hole {currentHole?.holeNumber ?? 1} of {appState.roundState.config.holeCount}
            </span>
          ) : (
            <span className="app-shell__header-spacer" aria-hidden="true" />
          )}
        </header>
      )}

      <main>{content}</main>
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
