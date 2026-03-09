import { useEffect, useReducer } from 'react'
import EndRoundScreen from '../screens/EndRoundScreen.tsx'
import HolePlayScreen from '../screens/HolePlayScreen.tsx'
import HoleResultsScreen from '../screens/HoleResultsScreen.tsx'
import HomeScreen from '../screens/HomeScreen.tsx'
import LeaderboardScreen from '../screens/LeaderboardScreen.tsx'
import RoundSetupScreen from '../screens/RoundSetupScreen.tsx'
import type { ScreenProps } from '../screens/types.ts'
import { clearRoundState, loadRoundState, saveRoundState } from '../logic/storage.ts'
import type { AppScreen } from './router.tsx'
import { createInitialAppState, reduceAppState } from './stateMachine.ts'

function App() {
  const [appState, dispatch] = useReducer(
    reduceAppState,
    undefined,
    () => createInitialAppState(loadRoundState()),
  )

  useEffect(() => {
    if (!appState.shouldPersistRoundState) {
      return
    }

    saveRoundState(appState.roundState)
    dispatch({ type: 'mark_persisted' })
  }, [appState.roundState, appState.shouldPersistRoundState])

  const onUpdateRoundState: ScreenProps['onUpdateRoundState'] = (updater) => {
    dispatch({ type: 'update_round_state', updater })
  }

  const onResumeSavedRound = () => {
    dispatch({ type: 'resume_saved_round', savedRoundState: loadRoundState() })
  }

  const onResetRound = () => {
    dispatch({ type: 'reset_round' })
  }

  const onAbandonRound = () => {
    clearRoundState()
    dispatch({ type: 'abandon_round' })
  }

  const onNavigate: ScreenProps['onNavigate'] = (screen: AppScreen) => {
    dispatch({ type: 'navigate', screen })
  }

  const sharedScreenProps: ScreenProps = {
    roundState: appState.roundState,
    hasSavedRound: appState.hasSavedRound,
    onNavigate,
    onResumeSavedRound,
    onResetRound,
    onAbandonRound,
    onUpdateRoundState,
  }

  const content = (() => {
    switch (appState.activeScreen) {
      case 'home':
        return <HomeScreen {...sharedScreenProps} />
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
        return <HomeScreen {...sharedScreenProps} />
    }
  })()

  const safeCurrentHoleIndex = Math.min(
    Math.max(appState.roundState.currentHoleIndex, 0),
    Math.max(appState.roundState.holes.length - 1, 0),
  )
  const currentHole = appState.roundState.holes[safeCurrentHoleIndex]
  const logoSrc = `${import.meta.env.BASE_URL}Gimme-GOLF-logo-GG.png`

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <img
          className="app-logo"
          src={logoSrc}
          alt="GIMME GOLF"
        />
        {appState.activeScreen !== 'home' && (
          <span className="chip app-shell__progress-chip">
            Hole {currentHole?.holeNumber ?? 1} of {appState.roundState.config.holeCount}
          </span>
        )}
      </header>

      <main>{content}</main>
    </div>
  )
}

export default App
