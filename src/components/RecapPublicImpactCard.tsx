import type { ReactNode } from 'react'

interface RecapPublicImpactCardProps {
  title: string
  modeLabel: ReactNode
  summaryLine: string
  children: ReactNode
}

function RecapPublicImpactCard({ title, modeLabel, summaryLine, children }: RecapPublicImpactCardProps) {
  return (
    <article className="recap-item recap-public-impact-card stack-xs">
      <div className="row-between">
        <strong>{title}</strong>
        {modeLabel}
      </div>
      <p className="muted">{summaryLine}</p>
      {children}
    </article>
  )
}

export default RecapPublicImpactCard
