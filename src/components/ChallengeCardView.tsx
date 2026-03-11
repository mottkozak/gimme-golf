import type { PersonalCard } from '../types/cards.ts'

interface ChallengeCardViewProps {
  card: PersonalCard
  selected: boolean
  offerKind?: 'safe' | 'hard' | 'single'
  offerDetail?: string
  onSelect?: () => void
}

function getOfferKindLabel(offerKind: ChallengeCardViewProps['offerKind']): string | null {
  if (offerKind === 'safe') {
    return 'Safe Line'
  }

  if (offerKind === 'hard') {
    return 'Upside Line'
  }

  if (offerKind === 'single') {
    return 'Auto Line'
  }

  return null
}

function toLabel(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function ChallengeCardView({ card, selected, offerKind, offerDetail, onSelect }: ChallengeCardViewProps) {
  const offerKindLabel = getOfferKindLabel(offerKind)
  const isSelectable = typeof onSelect === 'function'
  const pointsLabel = `${card.points >= 0 ? '+' : ''}${card.points} pts`

  return (
    <article
      className={`panel challenge-card ${selected ? 'selected' : ''} ${
        isSelectable ? 'challenge-card--selectable' : ''
      } offer-${offerKind ?? 'none'}`}
      role={isSelectable ? 'button' : undefined}
      tabIndex={isSelectable ? 0 : undefined}
      aria-pressed={isSelectable ? selected : undefined}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (!onSelect) {
          return
        }

        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect()
        }
      }}
    >
      <header className="row-between setup-row-wrap">
        <strong>{card.name}</strong>
        <div className="button-row challenge-card__meta">
          {selected && <span className="chip challenge-card__selected-chip">✓ Selected</span>}
          <span className="chip challenge-card__points-chip">{pointsLabel}</span>
        </div>
      </header>
      <p className="challenge-card__description">{card.description}</p>
      {offerDetail && <p className="muted challenge-card__offer-detail">{offerDetail}</p>}
      <div className="challenge-card__badges">
        <span className="chip">{toLabel(card.cardType)}</span>
        {offerKindLabel && (
          <span className={`chip challenge-card__offer-chip challenge-card__offer-chip--${offerKind}`}>
            {offerKindLabel}
          </span>
        )}
        <span className="chip">{toLabel(card.difficulty)}</span>
      </div>
    </article>
  )
}

export default ChallengeCardView
