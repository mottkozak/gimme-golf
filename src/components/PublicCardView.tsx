import { useState, type CSSProperties } from 'react'
import useInViewport from '../hooks/useInViewport.ts'
import type { ChallengeLayout } from '../logic/account.ts'
import type { PublicCard } from '../types/cards.ts'
import BadgeChip from './BadgeChip.tsx'

interface PublicCardViewProps {
  card: PublicCard
  showTypeChip?: boolean
  showMetadataLine?: boolean
  layout?: ChallengeLayout
  illustrativeImageSrc?: string | null
  illustrativeImageAlt?: string
  entryOrder?: number
}

function toLabel(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function getCardTypeLabel(cardType: PublicCard['cardType']): string {
  if (cardType === 'prop') {
    return 'Props'
  }

  return toLabel(cardType)
}

function PublicCardView({
  card,
  showTypeChip = true,
  showMetadataLine = false,
  layout = 'compact',
  illustrativeImageSrc,
  illustrativeImageAlt,
  entryOrder,
}: PublicCardViewProps) {
  const [setInViewportRef, isInViewport] = useInViewport<HTMLElement>({
    once: true,
    threshold: 0.24,
    rootMargin: '0px 0px -8% 0px',
  })
  const hasEntryAnimation = typeof entryOrder === 'number'
  const entryStyle =
    hasEntryAnimation
      ? ({
          '--deal-order': String(entryOrder),
        } as CSSProperties)
      : undefined
  const typeLabel = getCardTypeLabel(card.cardType)
  const [failedIllustrativeImageSrc, setFailedIllustrativeImageSrc] = useState<string | null>(null)
  const hasIllustrativeImage =
    layout === 'illustrative' &&
    typeof illustrativeImageSrc === 'string' &&
    illustrativeImageSrc.length > 0 &&
    illustrativeImageSrc !== failedIllustrativeImageSrc

  return (
    <article
      className={`panel public-card ${
        layout === 'illustrative' ? 'public-card--illustrative' : 'public-card--compact'
      } public-preview-card mission-card card-category card-category--${card.cardType} ${
        hasEntryAnimation ? 'public-preview-card--deal-in' : ''
      } ${hasEntryAnimation && isInViewport ? 'is-in-view' : ''}`}
      ref={hasEntryAnimation ? setInViewportRef : undefined}
      style={entryStyle}
    >
      {hasIllustrativeImage && (
        <figure className="public-card__illustration-frame">
          <img
            className="public-card__illustration"
            src={illustrativeImageSrc}
            alt={illustrativeImageAlt ?? `${card.name} public card`}
            loading="lazy"
            onError={() => setFailedIllustrativeImageSrc(illustrativeImageSrc)}
          />
        </figure>
      )}
      <header className="row-between setup-row-wrap public-card__header challenge-card__meta">
        <strong>{card.name}</strong>
        <div className="button-row">
          {showTypeChip && (
            <BadgeChip
              tone="subtle"
              className={`public-card__type-chip public-card__type-chip--${card.cardType}`}
            >
              {typeLabel}
            </BadgeChip>
          )}
          {card.points !== 0 && (
            <BadgeChip tone="reward" className="public-card__points-chip">
              {card.points >= 0 ? '+' : ''}
              {card.points} pts
            </BadgeChip>
          )}
        </div>
      </header>
      <p className="public-card__description challenge-card__description">{card.description}</p>
      {showMetadataLine && typeLabel && (
        <p className="public-card__meta-line challenge-card__meta-line muted">{typeLabel}</p>
      )}
    </article>
  )
}

export default PublicCardView
