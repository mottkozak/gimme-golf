/**
 * Capacitor native bridge. All functions no-op when not running in a native shell (web).
 */

import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { SplashScreen } from '@capacitor/splash-screen'
import { StatusBar, Style } from '@capacitor/status-bar'
import { reportTelemetryEvent } from './platform/telemetry.ts'

export function isNative(): boolean {
  return Capacitor.getPlatform() !== 'web'
}

export async function hideSplashScreen(): Promise<void> {
  if (!isNative()) return
  try {
    await SplashScreen.hide()
  } catch (error) {
    reportTelemetryEvent({
      scope: 'capacitor_bridge',
      level: 'warn',
      message: 'Failed to hide native splash screen',
      error,
    })
  }
}

export async function setStatusBarStyle(theme: 'light' | 'dark'): Promise<void> {
  if (!isNative()) return
  try {
    await StatusBar.setStyle({
      style: theme === 'dark' ? Style.Light : Style.Dark,
    })
  } catch (error) {
    reportTelemetryEvent({
      scope: 'capacitor_bridge',
      level: 'warn',
      message: 'Failed to set status bar style',
      data: { theme },
      error,
    })
  }
}

export function addAppStateChangeListener(
  onChange: (isActive: boolean) => void,
): () => void {
  if (!isNative()) return () => {}

  const listenerPromise = App.addListener('appStateChange', ({ isActive }) => {
    onChange(isActive)
  })

  return () => {
    listenerPromise.then((handle) =>
      handle.remove().catch((error) => {
        reportTelemetryEvent({
          scope: 'capacitor_bridge',
          level: 'warn',
          message: 'Failed removing app state listener',
          error,
        })
      }),
    )
  }
}

export function addAppUrlOpenListener(onOpen: (url: string) => void): () => void {
  if (!isNative()) return () => {}

  const listenerPromise = App.addListener('appUrlOpen', ({ url }) => {
    if (typeof url === 'string' && url.length > 0) {
      onOpen(url)
    }
  })

  return () => {
    listenerPromise.then((handle) =>
      handle.remove().catch((error) => {
        reportTelemetryEvent({
          scope: 'capacitor_bridge',
          level: 'warn',
          message: 'Failed removing app URL listener',
          error,
        })
      }),
    )
  }
}

export async function getLaunchUrl(): Promise<string | null> {
  if (!isNative()) {
    return null
  }

  try {
    const launchInfo = await App.getLaunchUrl()
    return typeof launchInfo?.url === 'string' ? launchInfo.url : null
  } catch (error) {
    reportTelemetryEvent({
      scope: 'capacitor_bridge',
      level: 'warn',
      message: 'Failed to resolve launch URL',
      error,
    })
    return null
  }
}

/**
 * Register a listener for the Android hardware back button.
 * When the listener is active, default back behavior is disabled.
 * onBack() should return true if in-app navigation was performed, false to exit the app.
 */
export function addBackButtonListener(onBack: () => boolean): () => void {
  if (!isNative()) return () => {}

  const listenerPromise = App.addListener('backButton', () => {
    if (onBack()) {
      // Handled in-app; nothing else to do
    } else {
      App.exitApp()
    }
  })

  return () => {
    listenerPromise.then((handle) =>
      handle.remove().catch((error) => {
        reportTelemetryEvent({
          scope: 'capacitor_bridge',
          level: 'warn',
          message: 'Failed removing hardware back listener',
          error,
        })
      }),
    )
  }
}
