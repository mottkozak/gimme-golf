let darkThemeOverridesPromise: Promise<unknown> | null = null

function ensureDarkThemeOverridesLoaded(): void {
  if (darkThemeOverridesPromise) {
    return
  }

  darkThemeOverridesPromise = import('../styles/layers/theme-overrides.css').catch(() => undefined)
}

export function applyDocumentTheme(theme: 'light' | 'dark'): void {
  if (typeof document === 'undefined') {
    return
  }

  document.documentElement.dataset.theme = theme

  if (theme === 'dark') {
    ensureDarkThemeOverridesLoaded()
  }
}
