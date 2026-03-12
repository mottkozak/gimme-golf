import type { ReactNode } from 'react'

type HoleInfoTone = 'default' | 'accent'

interface HoleInfoCardProps {
  title: string
  children: ReactNode
  tone?: HoleInfoTone
  className?: string
}

function HoleInfoCard({ title, children, tone = 'default', className }: HoleInfoCardProps) {
  const classes = ['panel', 'inset', 'stack-xs', 'hole-info-card', `hole-info-card--${tone}`, className ?? '']
    .filter(Boolean)
    .join(' ')

  return (
    <section className={classes}>
      <p className="label hole-info-card__label">{title}</p>
      <div className="hole-info-card__content">
        {children}
      </div>
    </section>
  )
}

export default HoleInfoCard
