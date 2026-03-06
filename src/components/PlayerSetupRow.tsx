import { useEffect, useState } from 'react'
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
  const [expectedScoreDraft, setExpectedScoreDraft] = useState(String(player.expectedScore18))

  useEffect(() => {
    setExpectedScoreDraft(String(player.expectedScore18))
  }, [player.expectedScore18])

  const commitExpectedScore = () => {
    if (expectedScoreDraft.trim() === '') {
      setExpectedScoreDraft(String(player.expectedScore18))
      return
    }

    onUpdateExpectedScore(Number(expectedScoreDraft))
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
          type="text"
          inputMode="numeric"
          value={expectedScoreDraft}
          onChange={(event) => {
            const digitsOnly = event.target.value.replace(/[^\d]/g, '')
            setExpectedScoreDraft(digitsOnly)
          }}
          onBlur={commitExpectedScore}
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
