import type { PublicCard } from '../types/cards.ts'
import BadgeChip from './BadgeChip.tsx'

interface PublicCardViewProps {
  card: PublicCard
}

function toLabel(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function PublicCardView({ card }: PublicCardViewProps) {
  return (
    <article className="panel public-card public-card--compact public-preview-card">
      <header className="row-between setup-row-wrap public-card__header">
        <strong>{card.name}</strong>
        <div className="button-row">
          <BadgeChip tone="subtle">{toLabel(card.cardType)}</BadgeChip>
          {card.points !== 0 && (
            <BadgeChip tone="reward">
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
