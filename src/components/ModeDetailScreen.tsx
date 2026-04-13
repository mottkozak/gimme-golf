import { useCallback, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import AppIcon from './AppIcon.tsx'
import ChallengeCardView from './ChallengeCardView.tsx'
import PowerUpCard from './PowerUpCard.tsx'
import PublicCardView from './PublicCardView.tsx'
import { PERSONAL_CARDS, PUBLIC_CARDS } from '../data/cards.ts'
import { CURSE_CARDS, POWER_UPS } from '../data/powerUps.ts'
import type { LandingModeDefinition, LandingModeId } from '../logic/landingModes.ts'

interface ModeDetailScreenProps {
  mode: LandingModeDefinition
  hasSavedRoundProgress: boolean
  onBack: () => void
  onPlay: () => void
  sharedCardTransitionStyle?: CSSProperties
  sharedIconTransitionStyle?: CSSProperties
}

const MODE_SAMPLE_CARD_COUNT = 3

/** Ordered sample card codes per mode for the mode detail preview. */
const SAMPLE_CARD_CODES = {
  classic: ['COM-003', 'SKL-004', 'RSK-007'] as const,
  novelty: ['NOV-023', 'NOV-001', 'NOV-002'] as const, // One-Club Wizard, One-Hand Wonder, Opposite-Hand Escape
  chaos: ['CHA-005', 'CHA-002', 'CHA-013'] as const, // Sabotage Token, Longest Drive Bonus, Long Putt Special
  props: ['PRP-007', 'PRP-019', 'PRP-003'] as const, // Trouble Hole, Fairway Sweep, Green Hit (Player Pick)
  powerUps: ['PWR-002', 'PWR-034', 'PWR-019'] as const, // Backboard, Hand Wedge, Power Drive
  curses: ['CUR-002', 'CUR-018', 'CUR-003'] as const, // Three-Club Limit, No Favorite Club, Back Tee Penalty
} as const

interface ModeSampleCard {
  id: string
  card: ReactNode
}

interface ModeSampleStrip {
  label: string
  cards: ModeSampleCard[]
}

function pickCardsByCode<T extends { code: string; id: string }>(
  pool: T[],
  codes: readonly string[],
): T[] {
  const byCode = new Map(pool.map((c) => [c.code, c]))
  const result: T[] = []
  for (const code of codes) {
    const card = byCode.get(code)
    if (card) result.push(card)
  }
  return result
}

function takeCardsWithFallback<T extends { id: string }>(
  primaryCards: T[],
  fallbackCards: T[],
  count: number,
): T[] {
  const selectedCards: T[] = []
  const selectedCardIds = new Set<string>()

  for (const card of primaryCards) {
    if (selectedCards.length >= count) {
      return selectedCards
    }
    if (selectedCardIds.has(card.id)) {
      continue
    }
    selectedCardIds.add(card.id)
    selectedCards.push(card)
  }

  for (const card of fallbackCards) {
    if (selectedCards.length >= count) {
      return selectedCards
    }
    if (selectedCardIds.has(card.id)) {
      continue
    }
    selectedCardIds.add(card.id)
    selectedCards.push(card)
  }

  return selectedCards
}

function getModeSampleCardStrips(modeId: LandingModeId): ModeSampleStrip[] {
  if (modeId === 'classic') {
    const byCode = pickCardsByCode(PERSONAL_CARDS, SAMPLE_CARD_CODES.classic)
    const sampleCards = byCode.length >= MODE_SAMPLE_CARD_COUNT
      ? byCode
      : takeCardsWithFallback(
          PERSONAL_CARDS.filter((card) => card.packId === 'classic'),
          PERSONAL_CARDS,
          MODE_SAMPLE_CARD_COUNT,
        )

    if (sampleCards.length === 0) return []

    return [
      {
        label: 'Example mission challenges',
        cards: sampleCards.map((card) => ({
          id: card.id,
          card: (
            <ChallengeCardView
              card={card}
              selected={false}
              offerKind="single"
              showSupplementaryBadges={false}
            />
          ),
        })),
      },
    ]
  }

  if (modeId === 'novelty') {
    const byCode = pickCardsByCode(PERSONAL_CARDS, SAMPLE_CARD_CODES.novelty)
    const sampleCards = byCode.length >= MODE_SAMPLE_CARD_COUNT
      ? byCode
      : takeCardsWithFallback(
          PERSONAL_CARDS.filter((card) => card.packId === 'novelty'),
          PERSONAL_CARDS,
          MODE_SAMPLE_CARD_COUNT,
        )

    if (sampleCards.length === 0) return []

    return [
      {
        label: 'Example Showtime challenges',
        cards: sampleCards.map((card) => ({
          id: card.id,
          card: (
            <ChallengeCardView
              card={card}
              selected={false}
              offerKind="single"
              showSupplementaryBadges={false}
            />
          ),
        })),
      },
    ]
  }

  if (modeId === 'chaos') {
    const byCode = pickCardsByCode(PUBLIC_CARDS, SAMPLE_CARD_CODES.chaos)
    const sampleCards = byCode.length >= MODE_SAMPLE_CARD_COUNT
      ? byCode
      : takeCardsWithFallback(
          PUBLIC_CARDS.filter((card) => card.cardType === 'chaos'),
          PUBLIC_CARDS,
          MODE_SAMPLE_CARD_COUNT,
        )

    if (sampleCards.length === 0) return []

    return [
      {
        label: 'Example Wildcard cards',
        cards: sampleCards.map((card) => ({
          id: card.id,
          card: <PublicCardView card={card} showTypeChip={false} />,
        })),
      },
    ]
  }

  if (modeId === 'props') {
    const byCode = pickCardsByCode(PUBLIC_CARDS, SAMPLE_CARD_CODES.props)
    const sampleCards = byCode.length >= MODE_SAMPLE_CARD_COUNT
      ? byCode
      : takeCardsWithFallback(
          PUBLIC_CARDS.filter((card) => card.cardType === 'prop'),
          PUBLIC_CARDS,
          MODE_SAMPLE_CARD_COUNT,
        )

    if (sampleCards.length === 0) return []

    return [
      {
        label: 'Example Forecast cards',
        cards: sampleCards.map((card) => ({
          id: card.id,
          card: <PublicCardView card={card} showTypeChip={false} />,
        })),
      },
    ]
  }

  if (modeId === 'powerUps') {
    const byCodePowerUps = pickCardsByCode(POWER_UPS, SAMPLE_CARD_CODES.powerUps)
    const byCodeCurses = pickCardsByCode(CURSE_CARDS, SAMPLE_CARD_CODES.curses)
    const samplePowerUps =
      byCodePowerUps.length >= MODE_SAMPLE_CARD_COUNT
        ? byCodePowerUps
        : takeCardsWithFallback(
            POWER_UPS.filter((p) => p.isActive),
            POWER_UPS,
            MODE_SAMPLE_CARD_COUNT,
          )
    const sampleCurses =
      byCodeCurses.length >= MODE_SAMPLE_CARD_COUNT
        ? byCodeCurses
        : takeCardsWithFallback(
            CURSE_CARDS.filter((c) => c.isActive),
            CURSE_CARDS,
            MODE_SAMPLE_CARD_COUNT,
          )

    const strips: ModeSampleStrip[] = []

    if (samplePowerUps.length > 0) {
      strips.push({
        label: 'Example power-ups',
        cards: samplePowerUps.map((powerUp) => ({
          id: powerUp.id,
          card: (
            <PowerUpCard
              powerUp={powerUp}
              showPlayerName={false}
              showCategoryChips={false}
              showUseButton={false}
            />
          ),
        })),
      })
    }

    if (sampleCurses.length > 0) {
      strips.push({
        label: 'Example curses',
        cards: sampleCurses.map((curse) => ({
          id: curse.id,
          card: (
            <section className="panel inset stack-xs mode-spotlight__sample-curse">
              <h3 className="power-up-title">{curse.title}</h3>
              <p>{curse.description}</p>
              <p className="muted">Curse applies for this hole only.</p>
            </section>
          ),
        })),
      })
    }

    return strips
  }

  return []
}

const SWIPE_BACK_THRESHOLD_PX = 80

function ModeDetailScreen({
  mode,
  hasSavedRoundProgress,
  onBack,
  onPlay,
  sharedCardTransitionStyle,
  sharedIconTransitionStyle,
}: ModeDetailScreenProps) {
  const modeSampleCardStrips = getModeSampleCardStrips(mode.id)
  const [sampleIndices, setSampleIndices] = useState<number[]>(() =>
    modeSampleCardStrips.map(() => 0),
  )

  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const touchLast = useRef<{ x: number; y: number } | null>(null)

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const t = e.targetTouches[0]
      if (!t) return
      touchStart.current = { x: t.clientX, y: t.clientY }
      touchLast.current = { x: t.clientX, y: t.clientY }
    },
    [],
  )

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const t = e.targetTouches[0]
    if (!t || !touchLast.current) return
    touchLast.current = { x: t.clientX, y: t.clientY }
  }, [])

  const handleTouchEnd = useCallback(() => {
    const start = touchStart.current
    const last = touchLast.current
    touchStart.current = null
    touchLast.current = null
    if (!start || !last) return
    const deltaX = last.x - start.x
    const deltaY = last.y - start.y
    const absX = Math.abs(deltaX)
    const absY = Math.abs(deltaY)
    if (deltaX > SWIPE_BACK_THRESHOLD_PX && absX > absY) {
      onBack()
    }
  }, [onBack])

  return (
    <section
      className={`screen mode-detail-screen mode-tone--${mode.toneClassName}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <article className="mode-spotlight">
        <button
          type="button"
          className="mode-spotlight__back mode-spotlight__back--floating"
          aria-label="Back"
          onClick={onBack}
        >
          <AppIcon className="mode-spotlight__back-icon" icon="arrow_back" />
        </button>

        <div className="mode-spotlight__body">
          <section
            className="mode-spotlight__hero mode-spotlight__hero--shared"
            aria-label={`${mode.name} mode details`}
            style={sharedCardTransitionStyle}
          >
            <div className="mode-spotlight__emblem" aria-hidden="true" style={sharedIconTransitionStyle}>
              <AppIcon className="mode-spotlight__icon" icon={mode.icon} />
            </div>
            {mode.isPremium && <span className="chip mode-spotlight__premium-chip">Premium</span>}
            <h2 className="mode-spotlight__title">{mode.name}</h2>
            <p className="mode-spotlight__summary">{mode.tagline}</p>
            <p className="mode-spotlight__description">{mode.description}</p>
          </section>

          {modeSampleCardStrips.map((strip, stripIndex) => {
          const currentIndex = sampleIndices[stripIndex] ?? 0
          const setCurrentIndex = (idx: number) => {
            setSampleIndices((prev) => {
              const next = [...prev]
              next[stripIndex] = Math.max(0, Math.min(idx, strip.cards.length - 1))
              return next
            })
          }
          const currentCard = strip.cards[currentIndex]
          const canGoPrev = currentIndex > 0
          const canGoNext = currentIndex < strip.cards.length - 1
          return (
            <section
              key={strip.label}
              className="mode-spotlight__sample"
              aria-label={`${mode.name} ${strip.label}`}
            >
              <p className="mode-spotlight__sample-label">{strip.label}</p>
              <div
                className="mode-spotlight__sample-carousel"
                role="group"
                aria-label={`${strip.label} examples`}
              >
                <div className="mode-spotlight__sample-carousel-row">
                  <button
                    type="button"
                    className="mode-spotlight__sample-arrow"
                    aria-label="Previous example"
                    disabled={!canGoPrev}
                    onClick={() => setCurrentIndex(currentIndex - 1)}
                  >
                    <AppIcon icon="chevron_left" />
                  </button>
                  <article
                    key={currentCard?.id}
                    className="mode-spotlight__sample-item mode-spotlight__sample-item--single"
                    role="listitem"
                  >
                    <div className="mode-spotlight__sample-card">
                      {currentCard?.card}
                    </div>
                  </article>
                  <button
                    type="button"
                    className="mode-spotlight__sample-arrow"
                    aria-label="Next example"
                    disabled={!canGoNext}
                    onClick={() => setCurrentIndex(currentIndex + 1)}
                  >
                    <AppIcon icon="chevron_right" />
                  </button>
                </div>
                {strip.cards.length > 1 && (
                  <div
                    className="mode-spotlight__sample-dots"
                    role="tablist"
                    aria-label="Example cards"
                  >
                    {strip.cards.map((_, dotIndex) => (
                      <button
                        key={dotIndex}
                        type="button"
                        role="tab"
                        aria-selected={dotIndex === currentIndex}
                        aria-label={`Example ${dotIndex + 1} of ${strip.cards.length}`}
                        className={`mode-spotlight__sample-dot ${
                          dotIndex === currentIndex ? 'mode-spotlight__sample-dot--active' : ''
                        }`}
                        onClick={() => setCurrentIndex(dotIndex)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </section>
          )
        })}

          {hasSavedRoundProgress && (
            <section className="mode-spotlight__callout" role="status" aria-live="polite">
              <p className="label">Saved Round In Progress</p>
              <p>
                Starting {mode.name} opens a new setup and replaces in-progress local hole data.
              </p>
            </section>
          )}

          <section className="mode-spotlight__footer">
            <button
              type="button"
              className="mode-spotlight__cta"
              onClick={onPlay}
            >
              {mode.ctaLabel}
              <AppIcon className="button-icon" icon="play_arrow" />
            </button>
          </section>
        </div>
      </article>
    </section>
  )
}

export default ModeDetailScreen
