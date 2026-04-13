import type { ReactNode } from 'react'

type RecapPlayerOutcomeTone = 'default' | 'success' | 'failed'

interface RecapPlayerOutcomeCardProps {
  playerName: string
  chips: ReactNode
  children: ReactNode
  tone?: RecapPlayerOutcomeTone
  toggleLabel?: string
  collapsible?: boolean
}

function RecapPlayerOutcomeCard({
  playerName,
  chips,
  children,
  tone = 'default',
  toggleLabel = 'Details',
  collapsible = true,
}: RecapPlayerOutcomeCardProps) {
  if (!collapsible) {
    return (
      <article
        className={`recap-item recap-player-outcome-card recap-player-outcome-card--${tone} recap-player-outcome-card--static`}
      >
        <div className="recap-player-outcome-card__summary">
          <div className="row-between recap-player-outcome-card__summary-top">
            <span className="recap-player-outcome-card__name">{playerName}</span>
          </div>
          <div className="recap-metrics recap-player-outcome-card__chips">{chips}</div>
        </div>
      </article>
    )
  }

  return (
    <details className={`recap-item recap-player-outcome-card recap-player-outcome-card--${tone}`}>
      <summary className="recap-player-outcome-card__summary">
        <div className="row-between recap-player-outcome-card__summary-top">
          <span className="recap-player-outcome-card__name">{playerName}</span>
          <span className="recap-player-outcome-card__toggle-hint">
            <span className="recap-player-outcome-card__hint recap-player-outcome-card__hint--closed">
              Expand {toggleLabel} ▾
            </span>
            <span className="recap-player-outcome-card__hint recap-player-outcome-card__hint--open">
              Collapse {toggleLabel} ▴
            </span>
          </span>
        </div>
        <div className="recap-metrics recap-player-outcome-card__chips">{chips}</div>
      </summary>
      <div className="stack-xs recap-player-outcome-card__details">{children}</div>
    </details>
  )
}

export default RecapPlayerOutcomeCard
