import * as CapacitorSentry from '@sentry/capacitor'
import { init as initReactSentry } from '@sentry/react'
import { setTelemetryReporter, type TelemetryEvent } from '../platform/telemetry.ts'

const rawSentryDsn = import.meta.env.VITE_SENTRY_DSN
const sentryDsn = typeof rawSentryDsn === 'string' ? rawSentryDsn.trim() : ''

function toError(value: unknown): Error {
  if (value instanceof Error) {
    return value
  }

  if (typeof value === 'string') {
    return new Error(value)
  }

  return new Error('Unknown error')
}

function eventToError(event: TelemetryEvent): Error {
  if (event.error instanceof Error) {
    return event.error
  }

  return new Error(`[${event.scope}] ${event.message}`)
}

function setupTelemetryBridge(): void {
  setTelemetryReporter((event) => {
    if (!sentryDsn || event.level === 'info') {
      return
    }

    const telemetryError = eventToError(event)
    const telemetryContext = {
      scope: event.scope,
      level: event.level,
      data: event.data ?? null,
    }

    try {
      Object.defineProperty(telemetryError, 'telemetryContext', {
        value: telemetryContext,
        configurable: true,
      })
    } catch (error) {
      if (typeof console !== 'undefined') {
        console.warn('[telemetry] failed to attach telemetry context', error)
      }
    }

    CapacitorSentry.captureException(telemetryError)
  })
}

export function initErrorReporting(): void {
  setupTelemetryBridge()

  if (!sentryDsn) {
    return
  }

  CapacitorSentry.init(
    {
      dsn: sentryDsn,
      environment: import.meta.env.MODE,
      enableAutoSessionTracking: true,
    },
    initReactSentry,
  )

  if (typeof window === 'undefined') {
    return
  }

  window.addEventListener('error', (event) => {
    CapacitorSentry.captureException(
      event.error instanceof Error ? event.error : new Error(event.message || 'Unhandled error event'),
    )
  })

  window.addEventListener('unhandledrejection', (event) => {
    CapacitorSentry.captureException(toError(event.reason))
  })
}
