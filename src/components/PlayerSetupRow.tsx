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
  const fallbackName = `Golfer ${position}`
  const parseExpectedScore = (rawValue: string): number | null => {
    const digitsOnly = rawValue.replace(/[^\d]/g, '')
    if (!digitsOnly) {
      return null
    }

    return Number(digitsOnly)
  }

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
          onFocus={(event) => {
            if (player.name === fallbackName) {
              onUpdateName('')
            }
            event.currentTarget.select()
          }}
          placeholder={fallbackName}
        />
      </label>

      <label className="field">
        <span className="label">Expected 18-hole score</span>
        <input
          key={`${player.id}-${player.expectedScore18}`}
          type="text"
          inputMode="numeric"
          defaultValue={String(player.expectedScore18)}
          onChange={(event) => {
            event.target.value = event.target.value.replace(/[^\d]/g, '')
          }}
          onBlur={(event) => {
            const parsedScore = parseExpectedScore(event.target.value)
            if (parsedScore === null) {
              event.target.value = String(player.expectedScore18)
              return
            }

            onUpdateExpectedScore(parsedScore)
          }}
          onFocus={(event) => event.currentTarget.select()}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.currentTarget.blur()
            }
          }}
        />
      </label>
    </article>
  )
}

export default PlayerSetupRow
