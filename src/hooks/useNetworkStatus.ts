import { useCallback, useEffect, useState } from 'react'
import { reportTelemetryEvent } from '../platform/telemetry.ts'

interface NetworkInformationLike extends EventTarget {
  effectiveType?: string
  saveData?: boolean
  addEventListener: (type: 'change', listener: () => void) => void
  removeEventListener: (type: 'change', listener: () => void) => void
}

export interface NetworkStatusState {
  isOnline: boolean
  isSlowConnection: boolean
  networkSummary: string
  isRechecking: boolean
  recheckConnectivity: () => Promise<void>
}

function getConnection(): NetworkInformationLike | null {
  if (typeof navigator === 'undefined') {
    return null
  }

  const candidate = (navigator as Navigator & {
    connection?: NetworkInformationLike
    mozConnection?: NetworkInformationLike
    webkitConnection?: NetworkInformationLike
  }).connection
    ?? (navigator as Navigator & {
      connection?: NetworkInformationLike
      mozConnection?: NetworkInformationLike
      webkitConnection?: NetworkInformationLike
    }).mozConnection
    ?? (navigator as Navigator & {
      connection?: NetworkInformationLike
      mozConnection?: NetworkInformationLike
      webkitConnection?: NetworkInformationLike
    }).webkitConnection

  return candidate ?? null
}

function buildSummary(isOnline: boolean, isSlowConnection: boolean): string {
  if (!isOnline) {
    return 'Offline'
  }

  if (isSlowConnection) {
    return 'Poor connection'
  }

  return 'Online'
}

function detectSlowConnection(connection: NetworkInformationLike | null): boolean {
  if (!connection) {
    return false
  }

  if (connection.saveData === true) {
    return true
  }

  return connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g'
}

export function useNetworkStatus(): NetworkStatusState {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  )
  const [isSlowConnection, setIsSlowConnection] = useState(() =>
    detectSlowConnection(getConnection()),
  )
  const [isRechecking, setIsRechecking] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const connection = getConnection()
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    const handleConnectionChange = () => setIsSlowConnection(detectSlowConnection(connection))

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    connection?.addEventListener('change', handleConnectionChange)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      connection?.removeEventListener('change', handleConnectionChange)
    }
  }, [])

  const recheckConnectivity = useCallback(async () => {
    if (typeof window === 'undefined') {
      return
    }

    setIsRechecking(true)
    try {
      const response = await fetch(`${window.location.origin}/manifest.webmanifest?ts=${Date.now()}`, {
        cache: 'no-store',
      })
      setIsOnline(response.ok)
    } catch (error) {
      reportTelemetryEvent({
        scope: 'network_status',
        level: 'warn',
        message: 'Connectivity recheck failed',
        error,
      })
      setIsOnline(false)
    } finally {
      setIsRechecking(false)
      setIsSlowConnection(detectSlowConnection(getConnection()))
    }
  }, [])

  return {
    isOnline,
    isSlowConnection,
    networkSummary: buildSummary(isOnline, isSlowConnection),
    isRechecking,
    recheckConnectivity,
  }
}
