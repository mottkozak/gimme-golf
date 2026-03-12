import type { PersonalCard } from '../types/cards.ts'
import BadgeChip from './BadgeChip.tsx'

interface ChallengeCardViewProps {
  card: PersonalCard
  selected: boolean
  offerKind?: 'safe' | 'hard' | 'single'
  offerDetail?: string
  onSelect?: () => void
}

function getOfferKindLabel(offerKind: ChallengeCardViewProps['offerKind']): string | null {
  if (offerKind === 'safe') {
    return 'Option A'
  }

  if (offerKind === 'hard') {
    return 'Option B'
  }

  if (offerKind === 'single') {
    return 'Assigned'
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
  const offerChipTone =
    offerKind === 'safe'
      ? 'safe'
      : offerKind === 'hard'
        ? 'hard'
        : offerKind === 'single'
          ? 'auto'
          : 'default'

  return (
    <article
      className={`panel challenge-card mission-card ${selected ? 'selected' : ''} ${
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
          {selected && (
            <BadgeChip tone="selected" className="challenge-card__selected-chip">
              ✓ Selected
            </BadgeChip>
          )}
          <BadgeChip tone="reward" className="challenge-card__points-chip">
            {pointsLabel}
          </BadgeChip>
        </div>
      </header>
      <p className="challenge-card__description">{card.description}</p>
      {offerDetail && <p className="muted challenge-card__offer-detail">{offerDetail}</p>}
      <div className="challenge-card__badges">
        <BadgeChip tone="subtle">{toLabel(card.cardType)}</BadgeChip>
        {offerKindLabel && (
          <BadgeChip
            tone={offerChipTone}
            className={`challenge-card__offer-chip challenge-card__offer-chip--${offerKind}`}
          >
            {offerKindLabel}
          </BadgeChip>
        )}
        <BadgeChip tone="subtle">{toLabel(card.difficulty)}</BadgeChip>
      </div>
    </article>
  )
}

export default ChallengeCardView
