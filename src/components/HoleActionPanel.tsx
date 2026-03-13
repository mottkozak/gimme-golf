import { useEffect, useRef, useState, type ReactNode } from 'react'

interface HoleActionPanelProps {
  summary: string
  buttonLabel: string
  disabled: boolean
  helperText?: string
  statusSlot?: ReactNode
  buttonIcon?: ReactNode
  onContinue: () => void
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
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
  const [readyPulseRevision, setReadyPulseRevision] = useState(0)
  const previousDisabledRef = useRef(disabled)
  const pulseFrameRef = useRef<number | null>(null)

  useEffect(() => {
    if (pulseFrameRef.current !== null) {
      window.cancelAnimationFrame(pulseFrameRef.current)
      pulseFrameRef.current = null
    }

    const wasDisabled = previousDisabledRef.current
    previousDisabledRef.current = disabled

    if (disabled || !wasDisabled || prefersReducedMotion()) {
      return
    }

    pulseFrameRef.current = window.requestAnimationFrame(() => {
      setReadyPulseRevision((currentValue) => currentValue + 1)
      pulseFrameRef.current = null
    })

    return () => {
      if (pulseFrameRef.current !== null) {
        window.cancelAnimationFrame(pulseFrameRef.current)
        pulseFrameRef.current = null
      }
    }
  }, [disabled])

  const shouldAnimateReadyPulse = readyPulseRevision > 0 && !disabled

  return (
    <section className={`panel stack-xs hole-action-panel ${shouldAnimateReadyPulse ? 'hole-action-panel--ready' : ''}`}>
      <div className="row-between hole-action-panel__summary-row">
        <p className="value hole-action-panel__summary">{summary}</p>
        {statusSlot}
      </div>
      <button
        key={`hole-action-${readyPulseRevision}`}
        type="button"
        className={`button-primary hole-action-panel__button ${
          shouldAnimateReadyPulse ? 'hole-action-panel__button--ready-pulse' : ''
        }`}
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
