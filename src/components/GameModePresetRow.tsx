import type { GameModePresetDefinition } from '../data/gameModePresets.ts'

interface GameModePresetRowProps {
  preset: GameModePresetDefinition
  selected: boolean
  onSelect: () => void
  onOpenInfo: () => void
}

function GameModePresetRow({
  preset,
  selected,
  onSelect,
  onOpenInfo,
}: GameModePresetRowProps) {
  return (
    <article
      className={`preset-row ${selected ? 'preset-row--selected' : ''}`}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect()
        }
      }}
    >
      <div className="preset-row__details">
        <div className="row-between">
          <div className="preset-row__title">
            <strong>{preset.name}</strong>
            {preset.badgeLabel && <span className="chip">{preset.badgeLabel}</span>}
            {selected && <span className="chip">Active</span>}
          </div>
          <button
            type="button"
            className="preset-row__info-button"
            aria-label={`About ${preset.name}`}
            onClick={(event) => {
              event.stopPropagation()
              onOpenInfo()
            }}
          >
            i
          </button>
        </div>
        <p className="muted">{preset.shortDescription}</p>
        <p className="muted">Includes: {preset.includesLabel}</p>
        <p className="muted">Best for: {preset.bestForLabel}</p>
      </div>
    </article>
  )
}

export default GameModePresetRow
