import type { ReactNode } from 'react'

interface HoleActionPanelProps {
  summary: string
  buttonLabel: string
  disabled: boolean
  helperText?: string
  statusSlot?: ReactNode
  buttonIcon?: ReactNode
  onContinue: () => void
}

function HoleActionPanel({
  summary,
  buttonLabel,
  disabled,
  helperText,
  statusSlot,
  buttonIcon,
  onContinue,
}: HoleActionPanelProps) {
  return (
    <section className="panel stack-xs hole-action-panel">
      <div className="row-between hole-action-panel__summary-row">
        <p className="value hole-action-panel__summary">{summary}</p>
        {statusSlot}
      </div>
      <button
        type="button"
        className="button-primary hole-action-panel__button"
        disabled={disabled}
        onClick={onContinue}
      >
        {buttonIcon}
        {buttonLabel}
      </button>
      {helperText ? <p className="muted hole-action-panel__helper">{helperText}</p> : null}
    </section>
  )
}

export default HoleActionPanel
