import type { ReactNode } from 'react'

interface RecapBreakdownPanelProps {
  expanded: boolean
  onToggle: () => void
  summary: string
  statusChip: ReactNode
}

function RecapBreakdownPanel({ expanded, onToggle, summary, statusChip }: RecapBreakdownPanelProps) {
  return (
    <section className="panel stack-xs recap-breakdown-panel">
      <div className="row-between">
        <h3>Breakdown</h3>
        {statusChip}
      </div>
      <p className="muted">{summary}</p>
      <button
        type="button"
        className={`recap-breakdown-panel__toggle ${expanded ? 'recap-breakdown-panel__toggle--active' : ''}`}
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls="hole-recap-breakdown"
      >
        {expanded ? 'Hide Breakdown' : 'Show Breakdown'}
      </button>
    </section>
  )
}

export default RecapBreakdownPanel
