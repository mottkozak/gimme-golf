import type { PersonalCard } from '../types/cards.ts'

interface ChallengeCardViewProps {
  card: PersonalCard
  selected: boolean
  offerKind?: 'safe' | 'hard' | 'single'
}

function getOfferKindLabel(offerKind: ChallengeCardViewProps['offerKind']): string | null {
  if (offerKind === 'safe') {
    return 'Safe'
  }

  if (offerKind === 'hard') {
    return 'Hard'
  }

  if (offerKind === 'single') {
    return 'Auto'
  }

  return null
}

function ChallengeCardView({ card, selected, offerKind }: ChallengeCardViewProps) {
  const offerKindLabel = getOfferKindLabel(offerKind)

  return (
    <article className={`panel challenge-card ${selected ? 'selected' : ''} offer-${offerKind ?? 'none'}`}>
      <header className="row-between">
        <strong>{card.name}</strong>
        <div className="button-row">
          <span className="chip">{card.cardType.toUpperCase()}</span>
          {offerKindLabel && <span className="chip">{offerKindLabel}</span>}
        </div>
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
