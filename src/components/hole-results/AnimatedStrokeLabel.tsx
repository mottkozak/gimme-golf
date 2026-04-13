import { useEffect, useRef, useState } from 'react'

const SCORE_VALUE_ANIMATION_DURATION_MS = 360
const SCORE_VALUE_FLASH_DURATION_MS = 620

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function easeOutCubic(value: number): number {
  return 1 - (1 - value) ** 3
}

interface AnimatedStrokeLabelProps {
  strokes: number | null
}

function AnimatedStrokeLabel({ strokes }: AnimatedStrokeLabelProps) {
  const [displayedStrokes, setDisplayedStrokes] = useState<number | null>(strokes)
  const [flashTone, setFlashTone] = useState<'increase' | 'decrease' | null>(null)
  const previousStrokesRef = useRef<number | null>(strokes)
  const animationFrameRef = useRef<number | null>(null)
  const flashTimeoutRef = useRef<number | null>(null)
  const pendingStateFrameRef = useRef<number | null>(null)

  const scheduleStateUpdate = (updateCallback: () => void) => {
    if (pendingStateFrameRef.current !== null) {
      window.cancelAnimationFrame(pendingStateFrameRef.current)
    }

    pendingStateFrameRef.current = window.requestAnimationFrame(() => {
      updateCallback()
      pendingStateFrameRef.current = null
    })
  }

  useEffect(() => {
    if (pendingStateFrameRef.current !== null) {
      window.cancelAnimationFrame(pendingStateFrameRef.current)
      pendingStateFrameRef.current = null
    }

    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    if (flashTimeoutRef.current !== null) {
      window.clearTimeout(flashTimeoutRef.current)
      flashTimeoutRef.current = null
    }

    if (typeof strokes !== 'number') {
      previousStrokesRef.current = null
      scheduleStateUpdate(() => {
        setDisplayedStrokes(null)
        setFlashTone(null)
      })
      return
    }

    const previousStrokes = previousStrokesRef.current
    previousStrokesRef.current = strokes

    if (typeof previousStrokes !== 'number' || previousStrokes === strokes) {
      scheduleStateUpdate(() => {
        setDisplayedStrokes(strokes)
        setFlashTone(null)
      })
      return
    }

    const nextFlashTone = strokes > previousStrokes ? 'increase' : 'decrease'
    scheduleStateUpdate(() => {
      setFlashTone(nextFlashTone)
    })
    flashTimeoutRef.current = window.setTimeout(() => {
      setFlashTone(null)
      flashTimeoutRef.current = null
    }, SCORE_VALUE_FLASH_DURATION_MS)

    if (prefersReducedMotion()) {
      scheduleStateUpdate(() => {
        setDisplayedStrokes(strokes)
      })
      return
    }

    const startedAt = performance.now()
    const delta = strokes - previousStrokes

    const tick = (currentTime: number) => {
      const elapsed = currentTime - startedAt
      const progress = Math.min(1, elapsed / SCORE_VALUE_ANIMATION_DURATION_MS)
      const easedProgress = easeOutCubic(progress)
      const nextDisplayedValue = Math.round(previousStrokes + delta * easedProgress)
      setDisplayedStrokes(nextDisplayedValue)

      if (progress < 1) {
        animationFrameRef.current = window.requestAnimationFrame(tick)
        return
      }

      animationFrameRef.current = null
    }

    animationFrameRef.current = window.requestAnimationFrame(tick)

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }

      if (flashTimeoutRef.current !== null) {
        window.clearTimeout(flashTimeoutRef.current)
        flashTimeoutRef.current = null
      }

      if (pendingStateFrameRef.current !== null) {
        window.cancelAnimationFrame(pendingStateFrameRef.current)
        pendingStateFrameRef.current = null
      }
    }
  }, [strokes])

  if (typeof displayedStrokes !== 'number') {
    return <>Pending</>
  }

  return (
    <span
      className={`hole-score-value ${
        flashTone === 'increase'
          ? 'hole-score-value--flash-increase'
          : flashTone === 'decrease'
            ? 'hole-score-value--flash-decrease'
            : ''
      }`}
    >
      {displayedStrokes} strokes
    </span>
  )
}

export default AnimatedStrokeLabel
