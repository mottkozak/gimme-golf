import { useEffect, useRef, useState } from 'react'
import EndRoundScreen from '../screens/EndRoundScreen.tsx'
import HolePlayScreen from '../screens/HolePlayScreen.tsx'
import HoleResultsScreen from '../screens/HoleResultsScreen.tsx'
import HoleSetupScreen from '../screens/HoleSetupScreen.tsx'
import HomeScreen from '../screens/HomeScreen.tsx'
import LeaderboardScreen from '../screens/LeaderboardScreen.tsx'
import RoundSetupScreen from '../screens/RoundSetupScreen.tsx'
import type { ScreenProps } from '../screens/types.ts'
import { createNewRoundState, resetRoundProgress } from '../logic/roundLifecycle.ts'
import { recalculateRoundTotals } from '../logic/scoring.ts'
import { clearRoundState, loadRoundState, saveRoundState } from '../logic/storage.ts'
import type { AppScreen } from './router.tsx'

function getInitialAppState() {
  const savedRound = loadRoundState()

  if (savedRound) {
    return {
      roundState: recalculateRoundTotals(savedRound),
      hasSavedRound: true,
    }
  }

  return {
    roundState: recalculateRoundTotals(createNewRoundState()),
    hasSavedRound: false,
  }
}

function App() {
  const [initialAppState] = useState(() => getInitialAppState())
  const [activeScreen, setActiveScreen] = useState<AppScreen>('home')
  const [roundState, setRoundState] = useState(() => initialAppState.roundState)
  const [hasSavedRound, setHasSavedRound] = useState(() => initialAppState.hasSavedRound)
  const shouldPersistRoundStateRef = useRef(false)

  useEffect(() => {
    if (!shouldPersistRoundStateRef.current) {
      return
    }

    saveRoundState(roundState)
    shouldPersistRoundStateRef.current = false
  }, [roundState])

  const onUpdateRoundState: ScreenProps['onUpdateRoundState'] = (updater) => {
    shouldPersistRoundStateRef.current = true
    setHasSavedRound(true)
    setRoundState((currentState) => recalculateRoundTotals(updater(currentState)))
  }

  const onResumeSavedRound = () => {
    const savedRoundState = loadRoundState()

    if (!savedRoundState) {
      setHasSavedRound(false)
      return
    }

    shouldPersistRoundStateRef.current = false
    setRoundState(recalculateRoundTotals(savedRoundState))
    setActiveScreen('home')
    setHasSavedRound(true)
  }

  const onResetRound = () => {
    shouldPersistRoundStateRef.current = true
    setHasSavedRound(true)
    setRoundState((currentState) => recalculateRoundTotals(resetRoundProgress(currentState)))
    setActiveScreen('home')
  }

  const onAbandonRound = () => {
    clearRoundState()
    shouldPersistRoundStateRef.current = false
    setRoundState(recalculateRoundTotals(createNewRoundState()))
    setHasSavedRound(false)
    setActiveScreen('home')
  }

  const sharedScreenProps: ScreenProps = {
    roundState,
    hasSavedRound,
    onNavigate: setActiveScreen,
    onResumeSavedRound,
    onResetRound,
    onAbandonRound,
    onUpdateRoundState,
  }

  const content = (() => {
    switch (activeScreen) {
      case 'home':
        return <HomeScreen {...sharedScreenProps} />
      case 'roundSetup':
        return <RoundSetupScreen {...sharedScreenProps} />
      case 'holeSetup':
        return <HoleSetupScreen {...sharedScreenProps} />
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

  const currentHole = roundState.holes[roundState.currentHoleIndex]

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <picture>
          <source
            media="(prefers-color-scheme: light)"
            srcSet="/gimme-golf-logo-dark-black.png"
          />
          <img
            className="app-logo"
            src="/gimme-golf-logo-light-grey.png"
            alt="GIMME GOLF"
          />
        </picture>
        {activeScreen !== 'home' && (
          <span className="chip">
            Hole {currentHole.holeNumber} / {roundState.config.holeCount}
          </span>
        )}
      </header>

      <main>{content}</main>
    </div>
  )
}

export default App
