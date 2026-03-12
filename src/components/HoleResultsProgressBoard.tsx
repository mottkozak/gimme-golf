interface HoleResultsProgressItem {
  id: string
  label: string
  complete: boolean
  progressText: string
}

interface HoleResultsProgressBoardProps {
  items: HoleResultsProgressItem[]
  helperText: string
}

function HoleResultsProgressBoard({ items, helperText }: HoleResultsProgressBoardProps) {
  return (
    <section className="panel hole-results-progress-board" aria-label="Hole result steps">
      <ol className="list-reset hole-results-progress-board__list">
        {items.map((step, index) => (
          <li
            key={step.id}
            className={`hole-results-progress-board__item ${
              step.complete ? 'hole-results-progress-board__item--complete' : ''
            }`}
          >
            <span className="hole-results-progress-board__index" aria-hidden="true">
              {step.complete ? '✓' : index + 1}
            </span>
            <div className="hole-results-progress-board__copy">
              <span className="hole-results-progress-board__label">{step.label}</span>
              <span className="hole-results-progress-board__detail">
                {step.complete ? `${step.label} complete` : step.progressText}
              </span>
            </div>
          </li>
        ))}
      </ol>
      <p className="muted hole-results-progress-board__helper">{helperText}</p>
    </section>
  )
}

export type { HoleResultsProgressItem }
export default HoleResultsProgressBoard
