import type { CSSProperties } from 'react'
import { useEffect, useMemo, useState } from 'react'

const LETTER_REFRESH_INTERVAL_MS = 260
const EXIT_FADE_DURATION_MS = 260
const LETTER_FONT_VARIANTS = [
  'bungee',
  'bungee-inline',
  'bungee-outline',
  'bungee-shade',
] as const

type LetterFontVariant = (typeof LETTER_FONT_VARIANTS)[number]

interface SplashScreenProps {
  backgroundImageSrc: string
  blankLogoSrc: string
  durationMs: number
  onFinish: () => void
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
  { character: 'G', column: 1, row: 3 },
  { character: 'O', column: 2, row: 3 },
  { character: 'L', column: 3, row: 3 },
  { character: 'F', column: 4, row: 3 },
  { character: '.', column: 5, row: 3 },
] as const

function pickRandomFontVariant(variants: readonly LetterFontVariant[]): LetterFontVariant {
  return variants[Math.floor(Math.random() * variants.length)] ?? LETTER_FONT_VARIANTS[0]
}

function getColumnPairIndex(index: number): number | null {
  if (index < 5) {
    return index + 5
  }

  return index >= 5 ? index - 5 : null
}

function createLetterFontLayout(
  previousLayout: readonly LetterFontVariant[] | null,
): LetterFontVariant[] {
  const nextLayout = new Array<LetterFontVariant>(SPLASH_LETTER_CELLS.length)

  SPLASH_LETTER_CELLS.forEach((_cell, index) => {
    const prohibitedVariants = new Set<LetterFontVariant>()
    const hasLeftNeighbor = index % 5 !== 0
    const leftNeighborIndex = hasLeftNeighbor ? index - 1 : null
    const columnPairIndex = getColumnPairIndex(index)

    if (leftNeighborIndex !== null && nextLayout[leftNeighborIndex]) {
      prohibitedVariants.add(nextLayout[leftNeighborIndex])
    }

    if (columnPairIndex !== null && nextLayout[columnPairIndex]) {
      prohibitedVariants.add(nextLayout[columnPairIndex])
    }

    const previousVariant = previousLayout?.[index]
    if (previousVariant) {
      prohibitedVariants.add(previousVariant)
    }

    const isNeighborConflict = (variant: LetterFontVariant) => {
      const isLeftConflict =
        leftNeighborIndex !== null && nextLayout[leftNeighborIndex] === variant
      const isColumnConflict =
        columnPairIndex !== null && nextLayout[columnPairIndex] === variant
      return isLeftConflict || isColumnConflict
    }

    let availableVariants = LETTER_FONT_VARIANTS.filter(
      (variant) => !prohibitedVariants.has(variant),
    )

    if (availableVariants.length === 0) {
      availableVariants = LETTER_FONT_VARIANTS.filter(
        (variant) => !isNeighborConflict(variant) && variant !== previousVariant,
      )
    }

    if (availableVariants.length === 0) {
      availableVariants = LETTER_FONT_VARIANTS.filter((variant) => !isNeighborConflict(variant))
    }

    nextLayout[index] = pickRandomFontVariant(
      availableVariants.length > 0 ? availableVariants : LETTER_FONT_VARIANTS,
    )
  })

  return nextLayout
}

function SplashScreen({ backgroundImageSrc, blankLogoSrc, durationMs, onFinish }: SplashScreenProps) {
  const [isExiting, setIsExiting] = useState(false)
  const [letterFonts, setLetterFonts] = useState<LetterFontVariant[]>(() =>
    createLetterFontLayout(null),
  )

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false
    }

    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  useEffect(() => {
    if (prefersReducedMotion) {
      return
    }

    const intervalId = window.setInterval(() => {
      setLetterFonts((previousFonts) => createLetterFontLayout(previousFonts))
    }, LETTER_REFRESH_INTERVAL_MS)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [prefersReducedMotion])

  useEffect(() => {
    const exitDelayMs = Math.max(durationMs - EXIT_FADE_DURATION_MS, 0)
    const exitTimeoutId = window.setTimeout(() => {
      setIsExiting(true)
    }, exitDelayMs)
    const finishTimeoutId = window.setTimeout(() => {
      onFinish()
    }, durationMs)

    return () => {
      window.clearTimeout(exitTimeoutId)
      window.clearTimeout(finishTimeoutId)
    }
  }, [durationMs, onFinish])

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
