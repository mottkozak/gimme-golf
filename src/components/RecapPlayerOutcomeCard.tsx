import type { ReactNode } from 'react'

type RecapPlayerOutcomeTone = 'default' | 'success' | 'failed'

interface RecapPlayerOutcomeCardProps {
  playerName: string
  chips: ReactNode
  children: ReactNode
  tone?: RecapPlayerOutcomeTone
}

function RecapPlayerOutcomeCard({
  playerName,
  chips,
  children,
  tone = 'default',
}: RecapPlayerOutcomeCardProps) {
  return (
    <details className={`recap-item recap-player-outcome-card recap-player-outcome-card--${tone}`}>
      <summary className="recap-player-outcome-card__summary">
        <span className="recap-player-outcome-card__name">{playerName}</span>
        <div className="recap-metrics recap-player-outcome-card__chips">{chips}</div>
      </summary>
      <div className="stack-xs recap-player-outcome-card__details">{children}</div>
    </details>
  )
}

export default RecapPlayerOutcomeCard
