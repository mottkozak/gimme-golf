import { dispatchWindowCustomEvent } from '../platform/events.ts'
import { mirrorStorageDelete, mirrorStorageWrite } from '../platform/nativeMirrorStorage.ts'
import { readStorageItem, removeStorageItem, writeStorageItem } from '../platform/storage.ts'
import { applyDocumentTheme } from '../platform/theme.ts'
import type { ChallengeLayout } from './account.ts'

export const THEME_PREFERENCE_STORAGE_KEY = 'gimme-golf-theme-preference-v1'
export const NOTIFICATIONS_PREFERENCE_STORAGE_KEY = 'gimme-golf-notifications-preference-v1'
export const CHALLENGE_LAYOUT_PREFERENCE_STORAGE_KEY = 'gimme-golf-challenge-layout-preference-v1'
export const NOTIFICATIONS_PREFERENCE_CHANGED_EVENT = 'gimme-golf:notifications-preference-changed'

export type ThemePreference = 'light' | 'dark'

/** Theme is currently locked to light mode. */
export function loadThemePreference(): ThemePreference {
  return 'light'
}

export function saveThemePreference(theme: ThemePreference): void {
  void theme
  if (!writeStorageItem(THEME_PREFERENCE_STORAGE_KEY, 'light')) {
    return
  }

  mirrorStorageWrite(THEME_PREFERENCE_STORAGE_KEY, 'light')
}

/** Applies light theme and overrides system appearance. */
export function applyThemePreference(theme: ThemePreference): void {
  void theme
  applyDocumentTheme('light')
}

export function loadNotificationsPreference(): boolean {
  const storedValue = readStorageItem(NOTIFICATIONS_PREFERENCE_STORAGE_KEY)
  return storedValue === 'enabled'
}

export function saveNotificationsPreference(enabled: boolean): void {
  const serializedValue = enabled ? 'enabled' : 'disabled'
  if (!writeStorageItem(NOTIFICATIONS_PREFERENCE_STORAGE_KEY, serializedValue)) {
    return
  }

  mirrorStorageWrite(NOTIFICATIONS_PREFERENCE_STORAGE_KEY, serializedValue)
  dispatchWindowCustomEvent(NOTIFICATIONS_PREFERENCE_CHANGED_EVENT)
}

export function loadChallengeLayoutPreference(): ChallengeLayout {
  return 'illustrative'
}

/**
 * Layout for hole play / challenge cards. Always reads the dedicated preference key so it cannot
 * flip mid-round when account profile is refreshed from server metadata (which may omit layout).
 */
export function getEffectiveChallengeLayout(): ChallengeLayout {
  return 'illustrative'
}

export function saveChallengeLayoutPreference(challengeLayout: ChallengeLayout): void {
  void challengeLayout
  if (!writeStorageItem(CHALLENGE_LAYOUT_PREFERENCE_STORAGE_KEY, 'illustrative')) {
    return
  }

  mirrorStorageWrite(CHALLENGE_LAYOUT_PREFERENCE_STORAGE_KEY, 'illustrative')
}

export function clearPreferences(): void {
  removeStorageItem(THEME_PREFERENCE_STORAGE_KEY)
  removeStorageItem(NOTIFICATIONS_PREFERENCE_STORAGE_KEY)
  removeStorageItem(CHALLENGE_LAYOUT_PREFERENCE_STORAGE_KEY)
  mirrorStorageDelete(THEME_PREFERENCE_STORAGE_KEY)
  mirrorStorageDelete(NOTIFICATIONS_PREFERENCE_STORAGE_KEY)
  mirrorStorageDelete(CHALLENGE_LAYOUT_PREFERENCE_STORAGE_KEY)
  dispatchWindowCustomEvent(NOTIFICATIONS_PREFERENCE_CHANGED_EVENT)
}
