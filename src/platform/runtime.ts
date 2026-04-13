import { isNative } from '../capacitor.ts'

export function isNativePlatform(): boolean {
  return isNative()
}

export function isRuntimeOnline(): boolean {
  if (typeof navigator === 'undefined') {
    return true
  }

  return navigator.onLine !== false
}
