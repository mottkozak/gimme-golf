import type { ReactNode } from 'react'

interface GolferScoreModuleProps {
  playerName: string
  statusSlot: ReactNode
  missionSlot: ReactNode
  helperText: string
  children: ReactNode
}

function GolferScoreModule({
  playerName,
  statusSlot,
  missionSlot,
  helperText,
  children,
}: GolferScoreModuleProps) {
  return (
    <article className="panel inset stack-xs hole-score-module">
      <header className="row-between hole-score-module__header">
        <strong className="hole-score-module__name">{playerName}</strong>
        <div className="hole-score-module__status">{statusSlot}</div>
      </header>
      <div className="hole-score-module__mission">{missionSlot}</div>
      <p className="muted hole-score-module__helper">{helperText}</p>
      <section className="stack-xs hole-score-module__controls">{children}</section>
    </article>
  )
}

export default GolferScoreModule
