import type { Player } from '../types/game.ts'

interface PlayerSetupRowProps {
  player: Player
  position: number
  canRemove: boolean
  onUpdateName: (name: string) => void
  onUpdateExpectedScore: (expectedScore: number) => void
  onRemove: () => void
}

function PlayerSetupRow({
  player,
  position,
  canRemove,
  onUpdateName,
  onUpdateExpectedScore,
  onRemove,
}: PlayerSetupRowProps) {
  return (
    <article className="panel inset stack-xs">
      <div className="row-between">
        <strong>Golfer {position}</strong>
        {canRemove ? (
          <button type="button" className="button-danger" onClick={onRemove}>
            Remove
          </button>
        ) : (
          <span className="chip">Required</span>
        )}
      </div>

      <label className="field">
        <span className="label">Name</span>
        <input
          type="text"
          value={player.name}
          onChange={(event) => onUpdateName(event.target.value)}
          placeholder={`Golfer ${position}`}
        />
      </label>

      <label className="field">
        <span className="label">Expected 18-hole score</span>
        <input
          type="number"
          inputMode="numeric"
          min={54}
          max={180}
          value={player.expectedScore18}
          onChange={(event) => onUpdateExpectedScore(Number(event.target.value))}
        />
      </label>
    </article>
  )
}

export default PlayerSetupRow
