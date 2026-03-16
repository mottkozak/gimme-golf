import type { ReactNode } from 'react'

interface RecapPublicImpactCardProps {
  title: string
  modeLabel: ReactNode
  summaryLine: string
  description?: string | null
  rulesText?: string | null
  children: ReactNode
}

function RecapPublicImpactCard({
  title,
  modeLabel,
  summaryLine,
  description,
  rulesText,
  children,
}: RecapPublicImpactCardProps) {
  const hasExpandableDetails = Boolean(description ?? rulesText)

  const content = (
    <>
      {children}
      {(description ?? rulesText) && (
        <div className="recap-public-impact-card__details stack-xs">
          {description && <p className="recap-public-impact-card__description">{description}</p>}
          {rulesText && (
            <p className="recap-public-impact-card__rules muted">{rulesText}</p>
          )}
        </div>
      )}
    </>
  )

  if (hasExpandableDetails) {
    return (
      <details className="recap-item recap-public-impact-card recap-public-impact-card--expandable">
        <summary className="recap-public-impact-card__summary">
          <span className="recap-public-impact-card__summary-inner row-between">
            <strong>{title}</strong>
            {modeLabel}
          </span>
          <p className="muted recap-public-impact-card__summary-line">{summaryLine}</p>
          <span className="recap-public-impact-card__toggle-hint">
            <span className="recap-public-impact-card__hint recap-public-impact-card__hint--closed">
              Expand details ▾
            </span>
            <span className="recap-public-impact-card__hint recap-public-impact-card__hint--open">
              Collapse details ▴
            </span>
          </span>
        </summary>
        <div className="recap-public-impact-card__body stack-xs">{content}</div>
      </details>
    )
  }

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
