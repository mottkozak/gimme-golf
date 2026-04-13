import { Preferences } from '@capacitor/preferences'
import { isNative } from '../capacitor.ts'
import { reportTelemetryEvent } from '../platform/telemetry.ts'

async function readNativeItem(key: string): Promise<string | null> {
  if (!isNative()) {
    return null
  }

  try {
    const { value } = await Preferences.get({ key })
    return value ?? null
  } catch (error) {
    reportTelemetryEvent({
      scope: 'native_storage',
      level: 'warn',
      message: 'Failed to read native storage key',
      data: { key },
      error,
    })
    return null
  }
}

export async function hydrateMirroredStorageKeys(keys: string[]): Promise<void> {
  if (!isNative()) {
    return
  }

  for (const key of keys) {
    try {
      const localValue = localStorage.getItem(key)
      if (localValue !== null) {
        continue
      }

      const nativeValue = await readNativeItem(key)
      if (nativeValue !== null) {
        localStorage.setItem(key, nativeValue)
      }
    } catch (error) {
      reportTelemetryEvent({
        scope: 'native_storage',
        level: 'warn',
        message: 'Failed hydrating mirrored native storage key',
        data: { key },
        error,
      })
    }
  }
}

export function mirrorStorageSetItem(key: string, value: string): void {
  if (!isNative()) {
    return
  }

  void Preferences.set({ key, value }).catch((error) => {
    reportTelemetryEvent({
      scope: 'native_storage',
      level: 'warn',
      message: 'Failed mirroring write to native storage',
      data: { key },
      error,
    })
  })
}

export function mirrorStorageRemoveItem(key: string): void {
  if (!isNative()) {
    return
  }

  void Preferences.remove({ key }).catch((error) => {
    reportTelemetryEvent({
      scope: 'native_storage',
      level: 'warn',
      message: 'Failed mirroring delete to native storage',
      data: { key },
      error,
    })
  })
}
