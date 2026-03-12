import type { ReactNode } from 'react'

type BadgeChipTone =
  | 'default'
  | 'subtle'
  | 'selected'
  | 'reward'
  | 'safe'
  | 'hard'
  | 'auto'
  | 'count'

interface BadgeChipProps {
  children: ReactNode
  tone?: BadgeChipTone
  className?: string
}

function BadgeChip({ children, tone = 'default', className }: BadgeChipProps) {
  const classes = [
    'chip',
    'badge-chip',
    tone === 'default' ? '' : `badge-chip--${tone}`,
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  return <span className={classes}>{children}</span>
}

export default BadgeChip
