import type { ReactNode } from 'react'

interface PublicCardResolutionPanelProps {
  title: string
  statusSlot: ReactNode
  metadataSlot: ReactNode
  description: string
  children: ReactNode
}

function PublicCardResolutionPanel({
  title,
  statusSlot,
  metadataSlot,
  description,
  children,
}: PublicCardResolutionPanelProps) {
  return (
    <article className="panel inset stack-xs hole-public-resolution-card">
      <div className="row-between">
        <strong>{title}</strong>
        {statusSlot}
      </div>
      <div className="button-row hole-public-resolution-card__meta">{metadataSlot}</div>
      <p className="muted">{description}</p>
      <div className="stack-xs hole-public-resolution-card__controls">{children}</div>
    </article>
  )
}

export default PublicCardResolutionPanel
