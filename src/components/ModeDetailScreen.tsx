import type { CSSProperties, ReactNode } from 'react'
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

interface ModeSampleCard {
  id: string
  card: ReactNode
}

interface ModeSampleStrip {
  label: string
  cards: ModeSampleCard[]
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
    const sampleCards = takeCardsWithFallback(
      PERSONAL_CARDS.filter((card) => card.packId === 'classic'),
      PERSONAL_CARDS,
      MODE_SAMPLE_CARD_COUNT,
    )

    if (sampleCards.length === 0) {
      return []
    }

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
    const sampleCards = takeCardsWithFallback(
      PERSONAL_CARDS.filter((card) => card.packId === 'novelty'),
      PERSONAL_CARDS,
      MODE_SAMPLE_CARD_COUNT,
    )

    if (sampleCards.length === 0) {
      return []
    }

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
    const sampleCards = takeCardsWithFallback(
      PUBLIC_CARDS.filter((card) => card.cardType === 'chaos'),
      PUBLIC_CARDS,
      MODE_SAMPLE_CARD_COUNT,
    )

    if (sampleCards.length === 0) {
      return []
    }

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
    const sampleCards = takeCardsWithFallback(
      PUBLIC_CARDS.filter((card) => card.cardType === 'prop'),
      PUBLIC_CARDS,
      MODE_SAMPLE_CARD_COUNT,
    )

    if (sampleCards.length === 0) {
      return []
    }

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
    const samplePowerUps = takeCardsWithFallback(
      POWER_UPS.filter((powerUp) => powerUp.isActive),
      POWER_UPS,
      MODE_SAMPLE_CARD_COUNT,
    )
    const sampleCurses = takeCardsWithFallback(
      CURSE_CARDS.filter((curse) => curse.isActive),
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

function ModeDetailScreen({
  mode,
  hasSavedRoundProgress,
  onBack,
  onPlay,
  sharedCardTransitionStyle,
  sharedIconTransitionStyle,
}: ModeDetailScreenProps) {
  const modeSampleCardStrips = getModeSampleCardStrips(mode.id)

  return (
    <section className={`screen mode-detail-screen mode-tone--${mode.toneClassName}`}>
      <article className="mode-spotlight">
        <button
          type="button"
          className="mode-spotlight__back mode-spotlight__back--floating"
          aria-label="Back"
          onClick={onBack}
        >
          <AppIcon className="mode-spotlight__back-icon" icon="arrow_back" />
        </button>

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

        {modeSampleCardStrips.map((strip) => (
          <section
            key={strip.label}
            className="mode-spotlight__sample"
            aria-label={`${mode.name} ${strip.label}`}
          >
            <p className="mode-spotlight__sample-label">{strip.label}</p>
            <div className="mode-spotlight__sample-scroll" role="list" aria-label={`${strip.label} examples`}>
              {strip.cards.map((sampleCard) => (
                <article key={sampleCard.id} className="mode-spotlight__sample-item" role="listitem">
                  <div className="mode-spotlight__sample-card">{sampleCard.card}</div>
                </article>
              ))}
            </div>
          </section>
        ))}

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
      </article>
    </section>
  )
}

export default ModeDetailScreen
