import type { ReactNode } from 'react'
import BadgeChip from './BadgeChip.tsx'

interface HolePublicCardSectionProps {
  title: string
  count: number
  emptyMessage: string
  helperText?: string
  children?: ReactNode
}

function HolePublicCardSection({
  title,
  count,
  emptyMessage,
  helperText,
  children,
}: HolePublicCardSectionProps) {
  return (
    <section className="panel stack-xs hole-public-section">
      <div className="row-between setup-row-wrap hole-public-section__header">
        <h3>{title}</h3>
        <BadgeChip tone="count" className="hole-public-section__count">
          {count}
        </BadgeChip>
      </div>

      {count === 0 ? (
        <p className="muted hole-public-section__empty">{emptyMessage}</p>
      ) : (
        <div className="stack-xs hole-public-section__list">{children}</div>
      )}

      {count > 0 && helperText ? (
        <p className="muted hole-public-section__helper">{helperText}</p>
      ) : null}
    </section>
  )
}

export default HolePublicCardSection
