import type { PersonalCard } from '../types/cards.ts'

interface ChallengeCardViewProps {
  card: PersonalCard
  selected: boolean
}

function ChallengeCardView({ card, selected }: ChallengeCardViewProps) {
  return (
    <article className={`panel challenge-card ${selected ? 'selected' : ''}`}>
      <header className="row-between">
        <strong>{card.name}</strong>
        <span className="chip">{card.cardType.toUpperCase()}</span>
      </header>
      <p>{card.description}</p>
      <div className="row-between">
        <span>Difficulty: {card.difficulty}</span>
        <span>+{card.points} pts</span>
      </div>
    </article>
  )
}

export default ChallengeCardView
