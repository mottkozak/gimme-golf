import { useEffect } from 'react'
import { isNative } from '../../capacitor.ts'
import { reportTelemetryEvent } from '../../platform/telemetry.ts'

const NATIVE_DIAGNOSTICS_EVENT_NAME = 'gimmegolf:native-diagnostics'

interface NativeDiagnosticsDetail {
  event: string
  platform: string
  timestampMs: number
  payload: Record<string, unknown>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function toNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function parseDiagnosticsDetail(rawDetail: unknown): NativeDiagnosticsDetail | null {
  if (!isRecord(rawDetail)) {
    return null
  }

  const event = typeof rawDetail.event === 'string' ? rawDetail.event : null
  const platform = typeof rawDetail.platform === 'string' ? rawDetail.platform : 'unknown'
  const timestampMs = toNumber(rawDetail.timestampMs)
  const payload = isRecord(rawDetail.payload) ? rawDetail.payload : {}

  if (!event || timestampMs === null) {
    return null
  }

  return {
    event,
    platform,
    timestampMs,
    payload,
  }
}

function getTelemetryLevelForEvent(eventName: string): 'info' | 'warn' {
  return eventName.includes('memory') ? 'warn' : 'info'
}

export function useNativeDiagnostics(): void {
  useEffect(() => {
    if (typeof window === 'undefined' || !isNative()) {
      return
    }

    const onDiagnosticsEvent = (event: Event) => {
      if (!(event instanceof CustomEvent)) {
        return
      }

      const detail = parseDiagnosticsDetail(event.detail)
      if (!detail) {
        return
      }

      reportTelemetryEvent({
        scope: 'native_diagnostics',
        level: getTelemetryLevelForEvent(detail.event),
        message: `Native ${detail.platform} diagnostic: ${detail.event}`,
        data: {
          ...detail.payload,
          nativeTimestampMs: detail.timestampMs,
        },
      })
    }

    window.addEventListener(NATIVE_DIAGNOSTICS_EVENT_NAME, onDiagnosticsEvent as EventListener)
    return () => {
      window.removeEventListener(NATIVE_DIAGNOSTICS_EVENT_NAME, onDiagnosticsEvent as EventListener)
    }
  }, [])
}
