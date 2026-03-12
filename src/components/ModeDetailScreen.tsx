import type { ReactNode } from 'react'
import AppIcon from './AppIcon.tsx'
import ChallengeCardView from './ChallengeCardView.tsx'
import PowerUpCard from './PowerUpCard.tsx'
import PublicCardView from './PublicCardView.tsx'
import { PERSONAL_CARDS, PUBLIC_CARDS } from '../data/cards.ts'
import { POWER_UPS } from '../data/powerUps.ts'
import type { LandingModeDefinition, LandingModeId } from '../logic/landingModes.ts'
import type { PersonalCard, PublicCard } from '../types/cards.ts'

interface ModeDetailScreenProps {
  mode: LandingModeDefinition
  hasSavedRoundProgress: boolean
  onBack: () => void
  onPlay: () => void
}

const SAMPLE_CLASSIC_CARD: PersonalCard | null =
  PERSONAL_CARDS.find((card) => card.packId === 'classic') ?? PERSONAL_CARDS[0] ?? null
const SAMPLE_NOVELTY_CARD: PersonalCard | null =
  PERSONAL_CARDS.find((card) => card.cardType === 'novelty') ?? SAMPLE_CLASSIC_CARD
const SAMPLE_CHAOS_CARD: PublicCard | null =
  PUBLIC_CARDS.find((card) => card.cardType === 'chaos') ?? PUBLIC_CARDS[0] ?? null
const SAMPLE_PROP_CARD: PublicCard | null =
  PUBLIC_CARDS.find((card) => card.cardType === 'prop') ?? SAMPLE_CHAOS_CARD
const SAMPLE_POWER_UP = POWER_UPS[0] ?? null

interface ModeSampleCard {
  label: string
  card: ReactNode
}

function getModeSampleCard(modeId: LandingModeId): ModeSampleCard | null {
  if (modeId === 'classic') {
    if (!SAMPLE_CLASSIC_CARD) {
      return null
    }

    return {
      label: 'Example mission card',
      card: <ChallengeCardView card={SAMPLE_CLASSIC_CARD} selected={false} offerKind="single" />,
    }
  }

  if (modeId === 'novelty') {
    if (!SAMPLE_NOVELTY_CARD) {
      return null
    }

    return {
      label: 'Example premium mission card',
      card: <ChallengeCardView card={SAMPLE_NOVELTY_CARD} selected={false} offerKind="single" />,
    }
  }

  if (modeId === 'chaos') {
    if (!SAMPLE_CHAOS_CARD) {
      return null
    }

    return {
      label: 'Example premium public card',
      card: <PublicCardView card={SAMPLE_CHAOS_CARD} />,
    }
  }

  if (modeId === 'props') {
    if (!SAMPLE_PROP_CARD) {
      return null
    }

    return {
      label: 'Example premium prediction card',
      card: <PublicCardView card={SAMPLE_PROP_CARD} />,
    }
  }

  if (!SAMPLE_POWER_UP) {
    return null
  }

  return {
    label: 'Example premium power-up card',
    card: (
      <PowerUpCard
        playerName="Sample Player"
        powerUp={SAMPLE_POWER_UP}
        used={false}
        onUse={() => undefined}
      />
    ),
  }
}

function ModeDetailScreen({
  mode,
  hasSavedRoundProgress,
  onBack,
  onPlay,
}: ModeDetailScreenProps) {
  const modeSampleCard = getModeSampleCard(mode.id)

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

        <section className="mode-spotlight__hero" aria-label={`${mode.name} mode details`}>
          <div className="mode-spotlight__emblem" aria-hidden="true">
            <AppIcon className="mode-spotlight__icon" icon={mode.icon} />
          </div>
          {mode.isPremium && <span className="chip mode-spotlight__premium-chip">Premium</span>}
          <h2 className="mode-spotlight__title">{mode.name}</h2>
          <p className="mode-spotlight__summary">{mode.tagline}</p>
          <p className="mode-spotlight__description">{mode.description}</p>
        </section>

        {modeSampleCard && (
          <section className="mode-spotlight__sample" aria-label={`${mode.name} sample card`}>
            <p className="mode-spotlight__sample-label">{modeSampleCard.label}</p>
            <div className="mode-spotlight__sample-card">{modeSampleCard.card}</div>
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
