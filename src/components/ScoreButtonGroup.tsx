interface ScoreButtonGroupProps {
  options: readonly number[]
  selectedScore: number | null
  onToggle: (scoreOption: number, isSelected: boolean) => void
  variant?: 'base' | 'high'
}

function ScoreButtonGroup({
  options,
  selectedScore,
  onToggle,
  variant = 'base',
}: ScoreButtonGroupProps) {
  return (
    <div className={`button-row hole-score-button-group hole-score-button-group--${variant}`}>
      {options.map((strokeOption) => {
        const isSelected = selectedScore === strokeOption

        return (
          <button
            key={strokeOption}
            type="button"
            className={`hole-score-button ${isSelected ? 'hole-score-button--selected' : ''}`}
            onClick={() => onToggle(strokeOption, isSelected)}
            aria-pressed={isSelected}
          >
            {strokeOption}
          </button>
        )
      })}
    </div>
  )
}

export default ScoreButtonGroup
