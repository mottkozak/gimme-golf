import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'
import { isNative } from '../capacitor.ts'

function canUseHaptics(): boolean {
  return isNative()
}

export function hapticSelection(): void {
  if (!canUseHaptics()) {
    return
  }

  void Haptics.selectionChanged().catch(() => {})
}

export function hapticLightImpact(): void {
  if (!canUseHaptics()) {
    return
  }

  void Haptics.impact({ style: ImpactStyle.Light }).catch(() => {})
}

export function hapticSuccess(): void {
  if (!canUseHaptics()) {
    return
  }

  void Haptics.notification({ type: NotificationType.Success }).catch(() => {})
}

export function hapticWarning(): void {
  if (!canUseHaptics()) {
    return
  }

  void Haptics.notification({ type: NotificationType.Warning }).catch(() => {})
}

export function hapticError(): void {
  if (!canUseHaptics()) {
    return
  }

  void Haptics.notification({ type: NotificationType.Error }).catch(() => {})
}
