import { HOLE_TAG_OPTIONS } from '../logic/roundSetup.ts'
import type { HoleTag } from '../types/cards.ts'
import type { HoleDefinition } from '../types/game.ts'

interface HoleSetupCardProps {
  hole: HoleDefinition
  onUpdatePar: (par: number) => void
  onToggleTag: (tag: HoleTag) => void
}

function HoleSetupCard({ hole, onUpdatePar, onToggleTag }: HoleSetupCardProps) {
  return (
    <article className="panel inset stack-xs">
      <div className="row-between">
        <strong>Hole {hole.holeNumber}</strong>
        <span className="chip">Par {hole.par}</span>
      </div>

      <div className="button-row">
        {[3, 4, 5].map((par) => (
          <button
            key={par}
            type="button"
            className={hole.par === par ? 'button-primary' : ''}
            onClick={() => onUpdatePar(par)}
          >
            Par {par}
          </button>
        ))}
      </div>

      <label className="field field--inline">
        <span className="label">Custom Par</span>
        <input
          type="number"
          inputMode="numeric"
          min={3}
          max={6}
          value={hole.par}
          onChange={(event) => onUpdatePar(Number(event.target.value))}
        />
      </label>

      <div className="stack-xs">
        <span className="label">Tags</span>
        <div className="tag-grid">
          {HOLE_TAG_OPTIONS.map((option) => {
            const isActive = hole.tags.includes(option.tag)
            return (
              <button
                key={option.tag}
                type="button"
                className={`tag-pill ${isActive ? 'active' : ''}`}
                onClick={() => onToggleTag(option.tag)}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>
    </article>
  )
}

export default HoleSetupCard
