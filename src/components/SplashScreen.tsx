import type { CSSProperties } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'

/** Delay before the letter fill animation starts (splash visible with static hollow logo). */
const DELAY_BEFORE_ANIMATION_MS = 120
/** Total time for the logo fill (all letters hollow → solid). */
const LOGO_FILL_DURATION_MS = 900
/** Pause with logo fully visible before starting transition to main screen. */
const PAUSE_AFTER_FILL_MS = 120

/** Time between advancing one letter one step (hollow → … → solid). Derived so last letter completes at LOGO_FILL_DURATION_MS. */
const LETTER_STEP_INTERVAL_MS = Math.round(LOGO_FILL_DURATION_MS / 13)
/** Delay before each letter starts its progression (cascade). Same as step so fill spans LOGO_FILL_DURATION_MS. */
const LETTER_STAGGER_MS = LETTER_STEP_INTERVAL_MS
const EXIT_FADE_DURATION_MS = 220

/** Order: hollow / negative-space first → solid last. */
const FONT_PROGRESSION = [
  'bungee-outline',
  'bungee-inline',
  'bungee-shade',
  'bungee',
] as const

type LetterFontVariant = (typeof FONT_PROGRESSION)[number]

interface SplashScreenProps {
  backgroundImageSrc: string
  blankLogoSrc: string
  onFinish: () => void
  hold?: boolean
}

interface SplashLetterCell {
  character: string
  column: number
  row: number
}

const SPLASH_LETTER_CELLS: readonly SplashLetterCell[] = [
  { character: 'G', column: 1, row: 1 },
  { character: 'I', column: 2, row: 1 },
  { character: 'M', column: 3, row: 1 },
  { character: 'M', column: 4, row: 1 },
  { character: 'E', column: 5, row: 1 },
  { character: 'G', column: 1, row: 2 },
  { character: 'O', column: 2, row: 2 },
  { character: 'L', column: 3, row: 2 },
  { character: 'F', column: 4, row: 2 },
  { character: '.', column: 5, row: 2 },
] as const

const SOLID_STEP_INDEX = FONT_PROGRESSION.length - 1

/** One step index per letter (0 = hollow, SOLID_STEP_INDEX = solid). All start at 0. */
function createInitialLetterSteps(): number[] {
  return Array.from({ length: SPLASH_LETTER_CELLS.length }, () => 0)
}

function stepIndexToVariant(step: number): LetterFontVariant {
  const index = Math.min(Math.max(0, step), SOLID_STEP_INDEX)
  return FONT_PROGRESSION[index] ?? FONT_PROGRESSION[0]
}

function SplashScreen({ backgroundImageSrc, blankLogoSrc, onFinish, hold = false }: SplashScreenProps) {
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false
    }

    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])
  const [isExiting, setIsExiting] = useState(false)
  const [letterSteps, setLetterSteps] = useState<number[]>(() =>
    prefersReducedMotion
      ? Array(SPLASH_LETTER_CELLS.length).fill(SOLID_STEP_INDEX)
      : createInitialLetterSteps(),
  )
  const cascadeStartRef = useRef<number | null>(null)

  useEffect(() => {
    if (prefersReducedMotion) {
      return
    }

    cascadeStartRef.current = performance.now()
    const tick = () => {
      const start = cascadeStartRef.current
      if (start === null) return
      const elapsed = performance.now() - start
      const animationElapsed = elapsed - DELAY_BEFORE_ANIMATION_MS
      setLetterSteps(() =>
        SPLASH_LETTER_CELLS.map((_, i) => {
          const effectiveElapsed = animationElapsed - i * LETTER_STAGGER_MS
          if (effectiveElapsed < 0) return 0
          const step = Math.floor(effectiveElapsed / LETTER_STEP_INTERVAL_MS)
          return Math.min(step, SOLID_STEP_INDEX)
        }),
      )
    }
    tick()
    const intervalId = window.setInterval(tick, LETTER_STEP_INTERVAL_MS / 2)
    return () => window.clearInterval(intervalId)
  }, [prefersReducedMotion])

  const letterFonts: LetterFontVariant[] = letterSteps.map(stepIndexToVariant)

  useEffect(() => {
    if (hold) {
      return
    }

    /* Start exit fade after delay + fill + pause; then call onFinish after fade completes. */
    const exitStartMs = DELAY_BEFORE_ANIMATION_MS + LOGO_FILL_DURATION_MS + PAUSE_AFTER_FILL_MS
    const exitTimeoutId = window.setTimeout(() => {
      setIsExiting(true)
    }, exitStartMs)
    const finishTimeoutId = window.setTimeout(() => {
      onFinish()
    }, exitStartMs + EXIT_FADE_DURATION_MS)

    return () => {
      window.clearTimeout(exitTimeoutId)
      window.clearTimeout(finishTimeoutId)
    }
  }, [hold, onFinish])

  return (
    <div
      className={`splash-screen ${isExiting ? 'splash-screen--exit' : ''}`}
      style={{ backgroundImage: `url("${backgroundImageSrc}")` }}
      role="status"
      aria-live="polite"
      aria-label="Loading Gimme Golf"
    >
      <div className="splash-screen__logo-stack" aria-hidden="true">
        <img
          className="splash-screen__blank-logo"
          src={blankLogoSrc}
          alt=""
          loading="eager"
          decoding="async"
          fetchPriority="high"
        />
        <div className="splash-screen__letter-grid">
          {SPLASH_LETTER_CELLS.map((cell, index) => {
            const letterStyle = {
              '--logo-col': String(cell.column),
              '--logo-row': String(cell.row),
            } as CSSProperties

            return (
              <span
                key={`${cell.character}-${cell.column}-${cell.row}`}
                className={`splash-screen__letter splash-screen__letter--${letterFonts[index]}`}
                style={letterStyle}
              >
                {cell.character}
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default SplashScreen
