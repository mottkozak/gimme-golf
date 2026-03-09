import { useEffect, useRef, useState } from 'react'
import EndRoundScreen from '../screens/EndRoundScreen.tsx'
import HolePlayScreen from '../screens/HolePlayScreen.tsx'
import HoleResultsScreen from '../screens/HoleResultsScreen.tsx'
import HoleSetupScreen from '../screens/HoleSetupScreen.tsx'
import HomeScreen from '../screens/HomeScreen.tsx'
import LeaderboardScreen from '../screens/LeaderboardScreen.tsx'
import RoundSetupScreen from '../screens/RoundSetupScreen.tsx'
import {
  isPublicCardResolutionComplete,
  normalizePublicCardResolutions,
} from '../logic/publicCardResolution.ts'
import type { ScreenProps } from '../screens/types.ts'
import { createNewRoundState, resetRoundProgress } from '../logic/roundLifecycle.ts'
import { recalculateRoundTotals } from '../logic/scoring.ts'
import { clearRoundState, loadRoundState, saveRoundState } from '../logic/storage.ts'
import type { RoundState } from '../types/game.ts'
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

function hasAnyDealtCardsForHole(roundState: RoundState, holeIndex: number): boolean {
  const holeCardState = roundState.holeCards[holeIndex]
  const hasPersonalCards = roundState.players.some((player) => {
    const dealtCards = holeCardState?.dealtPersonalCardsByPlayerId[player.id] ?? []
    return dealtCards.length > 0
  })

  return hasPersonalCards || (holeCardState?.publicCards.length ?? 0) > 0
}

function hasAnyAssignedPowerUpsForHole(roundState: RoundState, holeIndex: number): boolean {
  const holePowerUpState = roundState.holePowerUps[holeIndex]

  return roundState.players.some((player) =>
    Boolean(holePowerUpState?.assignedPowerUpIdByPlayerId[player.id]),
  )
}

function hasAnyHoleStarted(roundState: RoundState): boolean {
  return roundState.holes.some((_hole, holeIndex) => {
    const holeResultState = roundState.holeResults[holeIndex]
    const hasAnyStrokes = roundState.players.some(
      (player) => typeof holeResultState?.strokesByPlayerId[player.id] === 'number',
    )

    return (
      hasAnyStrokes ||
      hasAnyDealtCardsForHole(roundState, holeIndex) ||
      hasAnyAssignedPowerUpsForHole(roundState, holeIndex)
    )
  })
}

function hasAnyHoleResultsProgress(roundState: RoundState, holeIndex: number): boolean {
  const holeResultState = roundState.holeResults[holeIndex]

  if (!holeResultState) {
    return false
  }

  const hasAnyStrokes = roundState.players.some(
    (player) => typeof holeResultState.strokesByPlayerId[player.id] === 'number',
  )
  const hasAnyMissionResolution = roundState.players.some((player) => {
    const missionStatus = holeResultState.missionStatusByPlayerId[player.id]
    return missionStatus === 'success' || missionStatus === 'failed'
  })
  const hasAnyPublicResolution = Object.keys(holeResultState.publicCardResolutionsByCardId).length > 0

  return hasAnyStrokes || hasAnyMissionResolution || hasAnyPublicResolution
}

function areHoleStrokesComplete(roundState: RoundState, holeIndex: number): boolean {
  const holeResultState = roundState.holeResults[holeIndex]

  return roundState.players.every(
    (player) => typeof holeResultState?.strokesByPlayerId[player.id] === 'number',
  )
}

function areMissionsResolved(roundState: RoundState, holeIndex: number): boolean {
  if (roundState.config.gameMode === 'powerUps') {
    return true
  }

  const holeResultState = roundState.holeResults[holeIndex]
  const holeCardState = roundState.holeCards[holeIndex]

  return roundState.players.every((player) => {
    const dealtCards = holeCardState?.dealtPersonalCardsByPlayerId[player.id] ?? []
    if (dealtCards.length === 0) {
      return true
    }

    const missionStatus = holeResultState?.missionStatusByPlayerId[player.id]
    return missionStatus === 'success' || missionStatus === 'failed'
  })
}

function arePublicCardsResolved(roundState: RoundState, holeIndex: number): boolean {
  if (roundState.config.gameMode === 'powerUps') {
    return true
  }

  const holeCardState = roundState.holeCards[holeIndex]
  const holeResultState = roundState.holeResults[holeIndex]
  const publicCards = holeCardState?.publicCards ?? []

  if (publicCards.length === 0) {
    return true
  }

  const normalizedResolutions = normalizePublicCardResolutions(
    publicCards,
    holeResultState?.publicCardResolutionsByCardId,
  )
  const playerIds = roundState.players.map((player) => player.id)

  return publicCards.every((card) =>
    isPublicCardResolutionComplete(card, normalizedResolutions[card.id], playerIds),
  )
}

function isHoleComplete(roundState: RoundState, holeIndex: number): boolean {
  return (
    areHoleStrokesComplete(roundState, holeIndex) &&
    areMissionsResolved(roundState, holeIndex) &&
    arePublicCardsResolved(roundState, holeIndex)
  )
}

function getResumeScreen(roundState: RoundState): AppScreen {
  if (roundState.holes.length === 0) {
    return 'roundSetup'
  }

  const currentHoleIndex = Math.min(
    Math.max(roundState.currentHoleIndex, 0),
    roundState.holes.length - 1,
  )

  if (!hasAnyHoleStarted(roundState)) {
    return 'roundSetup'
  }

  if (isHoleComplete(roundState, currentHoleIndex)) {
    const isLastHole = currentHoleIndex === roundState.holes.length - 1
    return isLastHole ? 'endRound' : 'leaderboard'
  }

  const isHoleStarted =
    hasAnyDealtCardsForHole(roundState, currentHoleIndex) ||
    hasAnyAssignedPowerUpsForHole(roundState, currentHoleIndex)

  if (isHoleStarted) {
    return hasAnyHoleResultsProgress(roundState, currentHoleIndex)
      ? 'holeResults'
      : 'holePlay'
  }

  return 'holeSetup'
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

    const resumedRoundState = recalculateRoundTotals(savedRoundState)
    shouldPersistRoundStateRef.current = false
    setRoundState(resumedRoundState)
    setActiveScreen(getResumeScreen(resumedRoundState))
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

  const safeCurrentHoleIndex = Math.min(
    Math.max(roundState.currentHoleIndex, 0),
    Math.max(roundState.holes.length - 1, 0),
  )
  const currentHole = roundState.holes[safeCurrentHoleIndex]
  const logoSrc = `${import.meta.env.BASE_URL}Gimme-GOLF-logo-GG.png`

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <img
          className="app-logo"
          src={logoSrc}
          alt="GIMME GOLF"
        />
        {activeScreen !== 'home' && (
          <span className="chip">
            Hole {currentHole?.holeNumber ?? 1} / {roundState.config.holeCount}
          </span>
        )}
      </header>

      <main>{content}</main>
    </div>
  )
}

export default App
