import type { ReactNode } from 'react'

type RecapStatusTone =
  | 'default'
  | 'subtle'
  | 'count'
  | 'quick'
  | 'snapshot'
  | 'winner'
  | 'success'
  | 'failed'
  | 'total'
  | 'optional'
  | 'expanded'

interface RecapStatusChipProps {
  children: ReactNode
  tone?: RecapStatusTone
  className?: string
}

function RecapStatusChip({ children, tone = 'default', className }: RecapStatusChipProps) {
  const classes = ['chip', 'recap-status-chip', tone === 'default' ? '' : `recap-status-chip--${tone}`, className ?? '']
    .filter(Boolean)
    .join(' ')

  return <span className={classes}>{children}</span>
}

export default RecapStatusChip
