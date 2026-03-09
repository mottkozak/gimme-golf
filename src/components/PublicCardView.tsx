import type { PublicCard } from '../types/cards.ts'

interface PublicCardViewProps {
  card: PublicCard
}

function PublicCardView({ card }: PublicCardViewProps) {
  return (
    <article className="panel public-card">
      <header className="row-between">
        <strong>{card.name}</strong>
        <span className="chip">{card.cardType.toUpperCase()}</span>
      </header>
      <p>{card.description}</p>
      <div className="row-between">
        <span>
          {card.interaction?.mode
            ? `Manual resolve (${card.interaction.mode.replaceAll('_', ' ')})`
            : 'Manual resolve'}
        </span>
        <span>{card.points >= 0 ? '+' : ''}{card.points} pts</span>
      </div>
    </article>
  )
}

export default PublicCardView
