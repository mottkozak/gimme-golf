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
    <article className={`preset-row ${selected ? 'preset-row--selected' : ''}`}>
      <div className="preset-row__details">
        <div className="row-between">
          <div className="preset-row__title">
            <strong>{preset.name}</strong>
            {preset.badgeLabel && <span className="chip">{preset.badgeLabel}</span>}
          </div>
          <button
            type="button"
            className="preset-row__info-button"
            aria-label={`About ${preset.name}`}
            onClick={onOpenInfo}
          >
            i
          </button>
        </div>
        <p className="muted">{preset.shortDescription}</p>
        <p className="muted">Includes: {preset.includesLabel}</p>
        <p className="muted">Best for: {preset.bestForLabel}</p>
      </div>
      <button
        type="button"
        className={selected ? 'button-primary' : ''}
        onClick={onSelect}
      >
        {selected ? 'Selected' : 'Choose'}
      </button>
    </article>
  )
}

export default GameModePresetRow
