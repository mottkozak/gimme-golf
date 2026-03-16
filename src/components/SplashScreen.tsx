import type { CSSProperties } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'

const LETTER_REFRESH_INTERVAL_MS = 320
const EXIT_FADE_DURATION_MS = 420
const LETTERS_PER_ROW = 5
const SMALL_UPDATE_COUNT = 1
const LARGE_UPDATE_COUNT = 3
const LARGE_UPDATE_EVERY_TICKS = 4
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
  { character: 'G', column: 1, row: 2 },
  { character: 'O', column: 2, row: 2 },
  { character: 'L', column: 3, row: 2 },
  { character: 'F', column: 4, row: 2 },
  { character: '.', column: 5, row: 2 },
] as const

function pickRandomFontVariant(variants: readonly LetterFontVariant[]): LetterFontVariant {
  return variants[Math.floor(Math.random() * variants.length)] ?? LETTER_FONT_VARIANTS[0]
}

function shuffleIndices(values: number[]): number[] {
  const nextValues = [...values]
  for (let index = nextValues.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const currentValue = nextValues[index]
    nextValues[index] = nextValues[swapIndex] ?? currentValue
    nextValues[swapIndex] = currentValue
  }
  return nextValues
}

function getNeighborIndices(index: number): number[] {
  const neighbors: number[] = []
  const column = index % LETTERS_PER_ROW
  const row = Math.floor(index / LETTERS_PER_ROW)

  if (column > 0) {
    neighbors.push(index - 1)
  }

  if (column < LETTERS_PER_ROW - 1) {
    neighbors.push(index + 1)
  }

  const rowCount = Math.ceil(SPLASH_LETTER_CELLS.length / LETTERS_PER_ROW)
  if (row > 0) {
    neighbors.push(index - LETTERS_PER_ROW)
  }
  if (row < rowCount - 1) {
    neighbors.push(index + LETTERS_PER_ROW)
  }

  return neighbors.filter((neighborIndex) => neighborIndex < SPLASH_LETTER_CELLS.length)
}

const LETTER_NEIGHBORS = SPLASH_LETTER_CELLS.map((_cell, index) => getNeighborIndices(index))

function getAvailableVariants(
  layout: readonly LetterFontVariant[],
  index: number,
  excludeCurrentValue: boolean,
): LetterFontVariant[] {
  const currentVariant = layout[index]
  return LETTER_FONT_VARIANTS.filter((variant) => {
    if (excludeCurrentValue && variant === currentVariant) {
      return false
    }
    return LETTER_NEIGHBORS[index]?.every((neighborIndex) => layout[neighborIndex] !== variant)
  })
}

function createInitialLetterFontLayout(): LetterFontVariant[] {
  const nextLayout = new Array<LetterFontVariant>(SPLASH_LETTER_CELLS.length)

  for (let index = 0; index < SPLASH_LETTER_CELLS.length; index += 1) {
    const availableVariants = getAvailableVariants(nextLayout, index, false)
    nextLayout[index] = pickRandomFontVariant(
      availableVariants.length > 0 ? availableVariants : LETTER_FONT_VARIANTS,
    )
  }

  return nextLayout
}

function getLetterIndexesForUpdate(changeCount: number): number[] {
  const allIndexes = shuffleIndices(
    Array.from({ length: SPLASH_LETTER_CELLS.length }, (_cell, index) => index),
  )
  const pickedIndexes: number[] = []

  for (const candidateIndex of allIndexes) {
    if (pickedIndexes.length >= changeCount) {
      break
    }

    const hasAdjacentPickedIndex = pickedIndexes.some((pickedIndex) =>
      LETTER_NEIGHBORS[pickedIndex]?.includes(candidateIndex),
    )
    if (!hasAdjacentPickedIndex) {
      pickedIndexes.push(candidateIndex)
    }
  }

  if (pickedIndexes.length < changeCount) {
    for (const candidateIndex of allIndexes) {
      if (pickedIndexes.includes(candidateIndex)) {
        continue
      }
      pickedIndexes.push(candidateIndex)
      if (pickedIndexes.length >= changeCount) {
        break
      }
    }
  }

  return pickedIndexes
}

function evolveLetterFontLayout(
  previousLayout: readonly LetterFontVariant[],
  tickCount: number,
): LetterFontVariant[] {
  const nextLayout = [...previousLayout]
  const changeCount =
    tickCount % LARGE_UPDATE_EVERY_TICKS === 0 ? LARGE_UPDATE_COUNT : SMALL_UPDATE_COUNT
  const changeIndexes = getLetterIndexesForUpdate(Math.min(changeCount, nextLayout.length))

  for (const changeIndex of changeIndexes) {
    const availableVariants = getAvailableVariants(nextLayout, changeIndex, true)
    const fallbackVariants = LETTER_FONT_VARIANTS.filter(
      (variant) => variant !== nextLayout[changeIndex],
    )
    nextLayout[changeIndex] = pickRandomFontVariant(
      availableVariants.length > 0 ? availableVariants : fallbackVariants,
    )
  }

  return nextLayout
}

function SplashScreen({ backgroundImageSrc, blankLogoSrc, durationMs, onFinish }: SplashScreenProps) {
  const [isExiting, setIsExiting] = useState(false)
  const [letterFonts, setLetterFonts] = useState<LetterFontVariant[]>(() =>
    createInitialLetterFontLayout(),
  )
  const updateTickRef = useRef(0)

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
      updateTickRef.current += 1
      setLetterFonts((previousFonts) =>
        evolveLetterFontLayout(previousFonts, updateTickRef.current),
      )
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
