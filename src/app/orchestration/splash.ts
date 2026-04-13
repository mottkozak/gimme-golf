import { readStorageItem, writeStorageItem } from '../../platform/storage.ts'

const SPLASH_VARIANT_STORAGE_KEY = 'gimme-golf-splash-variant-v1'

export const APP_WORDMARK_SOURCE = `${import.meta.env.BASE_URL}Gimme-Golf-Bold-Logo-app.png`
export const APP_WORDMARK_FALLBACK_SOURCES = [
  `${import.meta.env.BASE_URL}Gimme-Golf-Bold-Logo.png`,
  `${import.meta.env.BASE_URL}Gimme-Golf-Bold-Alt-Logo.png`,
] as const
export const SPLASH_BACKGROUND_SOURCES = [
  `${import.meta.env.BASE_URL}splash_screen_app.png`,
  `${import.meta.env.BASE_URL}splash_screen_alt_app.png`,
] as const
export const AUTH_GATE_BACKGROUND_FALLBACK_SOURCES = [
  `${import.meta.env.BASE_URL}Gimme-Golf-Bold-Logo-app.png`,
  `${import.meta.env.BASE_URL}Gimme-Golf-Bold-Alt-Logo-app.png`,
] as const
export const SPLASH_BLANK_LOGO_SOURCE = `${import.meta.env.BASE_URL}Logo_blank-app.png`

let cachedSplashBackgroundVariant: 0 | 1 | null = null

export function getSplashBackgroundVariant(): 0 | 1 {
  if (cachedSplashBackgroundVariant !== null) {
    return cachedSplashBackgroundVariant
  }

  const nextVariantValue = readStorageItem(SPLASH_VARIANT_STORAGE_KEY)
  const currentVariant: 0 | 1 = nextVariantValue === '1' ? 1 : 0
  writeStorageItem(
    SPLASH_VARIANT_STORAGE_KEY,
    currentVariant === 0 ? '1' : '0',
  )

  cachedSplashBackgroundVariant = currentVariant
  return currentVariant
}
