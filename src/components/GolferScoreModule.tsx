import type { ReactNode } from 'react'

interface GolferScoreModuleProps {
  playerName: string
  statusSlot?: ReactNode
  missionLabel?: string
  missionSlot: ReactNode
  helperText?: string
  footerSlot?: ReactNode
  children: ReactNode
}

function GolferScoreModule({
  playerName,
  statusSlot,
  missionLabel,
  missionSlot,
  helperText,
  footerSlot,
  children,
}: GolferScoreModuleProps) {
  return (
    <article className="panel inset stack-xs hole-score-module">
      <header className="row-between hole-score-module__header">
        <strong className="hole-score-module__name">{playerName}</strong>
        {statusSlot ? <div className="hole-score-module__status">{statusSlot}</div> : null}
      </header>
      {missionLabel ? <p className="label hole-score-module__section-label">{missionLabel}</p> : null}
      <div className="hole-score-module__mission">{missionSlot}</div>
      {helperText ? <p className="muted hole-score-module__helper">{helperText}</p> : null}
      <section className="stack-xs hole-score-module__controls">{children}</section>
      {footerSlot ? <div className="hole-score-module__footer">{footerSlot}</div> : null}
    </article>
  )
}

export default GolferScoreModule
