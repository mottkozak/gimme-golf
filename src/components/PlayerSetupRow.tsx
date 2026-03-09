import { useState } from 'react'
import { normalizeExpectedScore } from '../logic/roundSetup.ts'
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

  const [expectedScoreInput, setExpectedScoreInput] = useState(() =>
    String(player.expectedScore18),
  )

  const parseExpectedScore = (rawValue: string): number | null => {
    const digitsOnly = rawValue.replace(/[^\d]/g, '')
    if (!digitsOnly) {
      return null
    }

    return Number(digitsOnly)
  }

  return (
    <article className="panel inset stack-xs setup-player-card">
      <header className="row-between setup-row-wrap setup-player-card__header">
        <strong className="setup-player-card__title">Golfer {position}</strong>
        {canRemove ? (
          <button type="button" className="setup-player-card__remove" onClick={onRemove}>
            Remove
          </button>
        ) : (
          <span className="chip setup-player-card__required">Required</span>
        )}
      </header>

      <label className="field setup-player-field">
        <span className="label setup-player-field__label">Name</span>
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

      <label className="field setup-player-field">
        <span className="label setup-player-field__label">Expected 18-hole score</span>
        <input
          type="text"
          inputMode="numeric"
          value={expectedScoreInput}
          onChange={(event) => {
            setExpectedScoreInput(event.target.value.replace(/[^\d]/g, ''))
          }}
          onBlur={(event) => {
            const parsedScore = parseExpectedScore(event.target.value)
            if (parsedScore === null) {
              setExpectedScoreInput(String(player.expectedScore18))
              return
            }

            const normalizedScore = normalizeExpectedScore(parsedScore)
            onUpdateExpectedScore(normalizedScore)
            setExpectedScoreInput(String(normalizedScore))
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
