import type { CardPackDefinition } from '../data/cardPacks.ts'

interface CardPackToggleRowProps {
  pack: CardPackDefinition
  enabled: boolean
  unlocked: boolean
  onToggle: (enabled: boolean) => void
  onOpenInfo: () => void
}

function CardPackToggleRow({
  pack,
  enabled,
  unlocked,
  onToggle,
  onOpenInfo,
}: CardPackToggleRowProps) {
  return (
    <article className="pack-row">
      <div className="pack-row__details">
        <div className="row-between">
          <div className="pack-row__title">
            <strong>{pack.name}</strong>
            {pack.badgeLabel && <span className="chip">{pack.badgeLabel}</span>}
          </div>
          <button
            type="button"
            className="pack-row__info-button"
            aria-label={`About ${pack.name}`}
            onClick={onOpenInfo}
          >
            i
          </button>
        </div>
        <p className="muted">{pack.shortDescription}</p>
      </div>
      <button
        type="button"
        className={enabled ? 'button-primary' : ''}
        disabled={!unlocked}
        onClick={() => onToggle(!enabled)}
      >
        {unlocked ? (enabled ? 'On' : 'Off') : 'Locked'}
      </button>
    </article>
  )
}

export default CardPackToggleRow
