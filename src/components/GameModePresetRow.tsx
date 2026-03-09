import { PRESET_ICON_BY_ID } from '../app/icons.ts'
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
        <div className="row-between preset-row__top">
          <div className="preset-row__title">
            <img
              className="preset-row__icon"
              src={PRESET_ICON_BY_ID[preset.id]}
              alt=""
              aria-hidden="true"
            />
            <strong>{preset.name}</strong>
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
        <p className="muted preset-row__description">{preset.shortDescription}</p>
        <div className="preset-row__chips">
          {preset.badgeLabel && <span className="chip preset-row__chip">{preset.badgeLabel}</span>}
          {selected && <span className="chip preset-row__chip preset-row__chip--active">Active</span>}
        </div>
      </div>
    </article>
  )
}

export default GameModePresetRow
