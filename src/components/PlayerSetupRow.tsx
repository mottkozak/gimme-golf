import { useId, useState } from 'react'
import {
  formatOfferPointRangeLabel,
  getOfferPointRange,
  getSkillBandForExpectedScore,
  getSkillBandLabel,
} from '../logic/gameBalance.ts'
import { normalizeExpectedScore } from '../logic/roundSetup.ts'
import type { Player } from '../types/game.ts'

interface PlayerSetupRowProps {
  player: Player
  position: number
  canRemove: boolean
  nameSuggestions: readonly string[]
  onUpdateName: (name: string) => void
  onUpdateExpectedScore: (expectedScore: number) => void
  onRemove: () => void
}

function PlayerSetupRow({
  player,
  position,
  canRemove,
  nameSuggestions,
  onUpdateName,
  onUpdateExpectedScore,
  onRemove,
}: PlayerSetupRowProps) {
  const fallbackName = `Golfer ${position}`
  const nameSuggestionsListId = useId()
  const hasNameSuggestions = nameSuggestions.length > 0

  const [expectedScoreInput, setExpectedScoreInput] = useState(() =>
    String(player.expectedScore18),
  )
  const skillBand = getSkillBandForExpectedScore(player.expectedScore18)
  const safeRangeLabel = formatOfferPointRangeLabel(
    getOfferPointRange(player.expectedScore18, true, 'safe'),
  )
  const hardRangeLabel = formatOfferPointRangeLabel(
    getOfferPointRange(player.expectedScore18, true, 'hard'),
  )
  const skillBandLabel = getSkillBandLabel(skillBand)

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
          list={hasNameSuggestions ? nameSuggestionsListId : undefined}
          onChange={(event) => onUpdateName(event.target.value)}
          onFocus={(event) => {
            if (player.name === fallbackName) {
              onUpdateName('')
            }
            event.currentTarget.select()
          }}
          placeholder={fallbackName}
        />
        {hasNameSuggestions && (
          <datalist id={nameSuggestionsListId}>
            {nameSuggestions.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        )}
      </label>

      <label className="field setup-player-field">
        <span className="label setup-player-field__label">Expected 18-hole score (optional)</span>
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
        <p className="muted setup-player-field__helper">
          Used only for fair card offers. {skillBandLabel} band: Safe {safeRangeLabel} • Upside {hardRangeLabel}.
          Real golf strokes are never modified.
        </p>
      </label>
    </article>
  )
}

export default PlayerSetupRow
