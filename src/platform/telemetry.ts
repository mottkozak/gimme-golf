export type TelemetryLevel = 'info' | 'warn' | 'error'

export interface TelemetryEvent {
  scope: string
  level: TelemetryLevel
  message: string
  data?: Record<string, unknown>
  error?: unknown
}

type TelemetryReporter = (event: TelemetryEvent) => void

let reporter: TelemetryReporter | null = null

export function setTelemetryReporter(nextReporter: TelemetryReporter | null): void {
  reporter = nextReporter
}

export function reportTelemetryEvent(event: TelemetryEvent): void {
  try {
    reporter?.(event)
  } catch (reporterError) {
    if (typeof console !== 'undefined') {
      console.error('[telemetry] reporter failed', reporterError)
    }
  }

  void event
}
