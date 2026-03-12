export const THEME_PREFERENCE_STORAGE_KEY = 'gimme-golf-theme-preference-v1'
export const NOTIFICATIONS_PREFERENCE_STORAGE_KEY = 'gimme-golf-notifications-preference-v1'

export type ThemePreference = 'light' | 'dark'

export function loadThemePreference(): ThemePreference {
  try {
    const storedValue = localStorage.getItem(THEME_PREFERENCE_STORAGE_KEY)
    return storedValue === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function saveThemePreference(theme: ThemePreference): void {
  try {
    localStorage.setItem(THEME_PREFERENCE_STORAGE_KEY, theme)
  } catch {
    // Keep preferences optional.
  }
}

export function applyThemePreference(theme: ThemePreference): void {
  document.documentElement.dataset.theme = theme
}

export function loadNotificationsPreference(): boolean {
  try {
    const storedValue = localStorage.getItem(NOTIFICATIONS_PREFERENCE_STORAGE_KEY)
    return storedValue === 'enabled'
  } catch {
    return false
  }
}

export function saveNotificationsPreference(enabled: boolean): void {
  try {
    localStorage.setItem(NOTIFICATIONS_PREFERENCE_STORAGE_KEY, enabled ? 'enabled' : 'disabled')
  } catch {
    // Keep preferences optional.
  }
}

export function clearPreferences(): void {
  try {
    localStorage.removeItem(THEME_PREFERENCE_STORAGE_KEY)
    localStorage.removeItem(NOTIFICATIONS_PREFERENCE_STORAGE_KEY)
  } catch {
    // Keep preferences optional.
  }
}
