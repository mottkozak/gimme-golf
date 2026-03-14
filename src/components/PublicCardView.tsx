import type { CSSProperties } from 'react'
import useInViewport from '../hooks/useInViewport.ts'
import type { PublicCard } from '../types/cards.ts'
import BadgeChip from './BadgeChip.tsx'

interface PublicCardViewProps {
  card: PublicCard
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

function PublicCardView({ card, entryOrder }: PublicCardViewProps) {
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

  return (
    <article
      className={`panel public-card public-card--compact public-preview-card card-category card-category--${card.cardType} ${
        hasEntryAnimation ? 'public-preview-card--deal-in' : ''
      } ${hasEntryAnimation && isInViewport ? 'is-in-view' : ''}`}
      ref={hasEntryAnimation ? setInViewportRef : undefined}
      style={entryStyle}
    >
      <header className="row-between setup-row-wrap public-card__header">
        <strong>{card.name}</strong>
        <div className="button-row">
          <BadgeChip
            tone="subtle"
            className={`public-card__type-chip public-card__type-chip--${card.cardType}`}
          >
            {getCardTypeLabel(card.cardType)}
          </BadgeChip>
          {card.points !== 0 && (
            <BadgeChip tone="reward" className="public-card__points-chip">
              {card.points >= 0 ? '+' : ''}
              {card.points} pts
            </BadgeChip>
          )}
        </div>
      </header>
      <p className="public-card__description">{card.description}</p>
    </article>
  )
}

export default PublicCardView
