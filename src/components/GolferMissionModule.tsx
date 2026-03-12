import type { ReactNode } from 'react'
import MissionStatusPill from './MissionStatusPill.tsx'

type GolferMissionStatusTone = 'ready' | 'pending'

interface GolferMissionModuleProps {
  golferName: string
  statusTone?: GolferMissionStatusTone
  statusLabel?: string
  summaryLine?: string
  children: ReactNode
}

function GolferMissionModule({
  golferName,
  statusTone,
  statusLabel,
  summaryLine,
  children,
}: GolferMissionModuleProps) {
  return (
    <article className="panel stack-xs hole-golfer-module">
      <header className="row-between setup-row-wrap hole-golfer-module__header">
        <div className="hole-golfer-module__identity">
          <strong className="hole-golfer-module__name">{golferName}</strong>
          {summaryLine && <p className="muted hole-golfer-module__summary">{summaryLine}</p>}
        </div>
        {statusTone && statusLabel ? <MissionStatusPill label={statusLabel} tone={statusTone} /> : null}
      </header>
      <div className="stack-xs hole-golfer-module__mission-stack">
        {children}
      </div>
    </article>
  )
}

export default GolferMissionModule
