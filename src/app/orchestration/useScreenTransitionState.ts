import { useEffect, useRef, useState } from 'react'
import type { AppScreen } from '../router.tsx'
import { getScreenTransitionDirection } from './navigation.ts'

export interface ScreenTransitionState {
  screenTransitionDirection: 'forward' | 'backward'
  screenTransitionRevision: number
  shouldAnimateScreenTransition: boolean
}

export function useScreenTransitionState(activeScreen: AppScreen): ScreenTransitionState {
  const [screenTransitionDirection, setScreenTransitionDirection] = useState<'forward' | 'backward'>(
    'forward',
  )
  const [screenTransitionRevision, setScreenTransitionRevision] = useState(0)
  const [shouldAnimateScreenTransition, setShouldAnimateScreenTransition] = useState(false)
  const previousScreenRef = useRef<AppScreen>(activeScreen)

  useEffect(() => {
    const previousScreen = previousScreenRef.current
    if (previousScreen === activeScreen) {
      return
    }

    setScreenTransitionDirection(getScreenTransitionDirection(previousScreen, activeScreen))
    setScreenTransitionRevision((currentValue) => currentValue + 1)
    setShouldAnimateScreenTransition(true)
    previousScreenRef.current = activeScreen
  }, [activeScreen])

  return {
    screenTransitionDirection,
    screenTransitionRevision,
    shouldAnimateScreenTransition,
  }
}
