import type { PublicCard } from '../types/cards.ts'

interface PublicCardViewProps {
  card: PublicCard
}

function toLabel(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function PublicCardView({ card }: PublicCardViewProps) {
  return (
    <article className="panel public-card public-card--compact">
      <header className="row-between setup-row-wrap public-card__header">
        <strong>{card.name}</strong>
        <div className="button-row">
          <span className="chip">{toLabel(card.cardType)}</span>
          {card.points !== 0 && (
            <span className="chip">
              {card.points >= 0 ? '+' : ''}
              {card.points} pts
            </span>
          )}
        </div>
      </header>
      <p className="public-card__description">{card.description}</p>
    </article>
  )
}

export default PublicCardView
