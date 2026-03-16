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

function getModeSampleCardStrip(modeId: LandingModeId): ModeSampleStrip | null {
  if (modeId === 'classic') {
    const sampleCards = takeCardsWithFallback(
      PERSONAL_CARDS.filter((card) => card.packId === 'classic'),
      PERSONAL_CARDS,
      MODE_SAMPLE_CARD_COUNT,
    )

    if (sampleCards.length === 0) {
      return null
    }

    return {
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
    }
  }

  if (modeId === 'novelty') {
    const sampleCards = takeCardsWithFallback(
      PERSONAL_CARDS.filter((card) => card.packId === 'novelty'),
      PERSONAL_CARDS,
      MODE_SAMPLE_CARD_COUNT,
    )

    if (sampleCards.length === 0) {
      return null
    }

    return {
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
    }
  }

  if (modeId === 'chaos') {
    const sampleCards = takeCardsWithFallback(
      PUBLIC_CARDS.filter((card) => card.cardType === 'chaos'),
      PUBLIC_CARDS,
      MODE_SAMPLE_CARD_COUNT,
    )

    if (sampleCards.length === 0) {
      return null
    }

    return {
      label: 'Example Wildcard cards',
      cards: sampleCards.map((card) => ({
        id: card.id,
        card: <PublicCardView card={card} showTypeChip={false} />,
      })),
    }
  }

  if (modeId === 'props') {
    const sampleCards = takeCardsWithFallback(
      PUBLIC_CARDS.filter((card) => card.cardType === 'prop'),
      PUBLIC_CARDS,
      MODE_SAMPLE_CARD_COUNT,
    )

    if (sampleCards.length === 0) {
      return null
    }

    return {
      label: 'Example Forecast cards',
      cards: sampleCards.map((card) => ({
        id: card.id,
        card: <PublicCardView card={card} showTypeChip={false} />,
      })),
    }
  }

  const samplePowerUps = takeCardsWithFallback(
    POWER_UPS.filter((powerUp) => powerUp.isActive),
    POWER_UPS,
    2,
  )
  const sampleCurses = takeCardsWithFallback(
    CURSE_CARDS.filter((curse) => curse.isActive),
    CURSE_CARDS,
    1,
  )

  if (samplePowerUps.length === 0 && sampleCurses.length === 0) {
    return null
  }

  const sampleCards: ModeSampleCard[] = []

  for (const powerUp of samplePowerUps) {
    sampleCards.push({
      id: powerUp.id,
      card: (
        <PowerUpCard
          powerUp={powerUp}
          showPlayerName={false}
          showCategoryChips={false}
          showUseButton={false}
        />
      ),
    })
  }

  for (const curse of sampleCurses) {
    sampleCards.push({
      id: curse.id,
      card: (
        <section className="panel inset stack-xs mode-spotlight__sample-curse">
          <h3 className="power-up-title">{curse.title}</h3>
          <p>{curse.description}</p>
          <p className="muted">Curse applies for this hole only.</p>
        </section>
      ),
    })
  }

  return {
    label: 'Example Arcade cards',
    cards: sampleCards.slice(0, MODE_SAMPLE_CARD_COUNT),
  }
}

function ModeDetailScreen({
  mode,
  hasSavedRoundProgress,
  onBack,
  onPlay,
  sharedCardTransitionStyle,
  sharedIconTransitionStyle,
}: ModeDetailScreenProps) {
  const modeSampleCardStrip = getModeSampleCardStrip(mode.id)

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

        {modeSampleCardStrip && (
          <section className="mode-spotlight__sample" aria-label={`${mode.name} sample cards`}>
            <p className="mode-spotlight__sample-label">{modeSampleCardStrip.label}</p>
            <div className="mode-spotlight__sample-scroll" role="list" aria-label={`${mode.name} examples`}>
              {modeSampleCardStrip.cards.map((sampleCard) => (
                <article key={sampleCard.id} className="mode-spotlight__sample-item" role="listitem">
                  <div className="mode-spotlight__sample-card">{sampleCard.card}</div>
                </article>
              ))}
            </div>
          </section>
        )}

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
