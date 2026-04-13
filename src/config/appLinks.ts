const DEFAULT_PUBLIC_APP_URL = 'https://mottkozak.github.io/gimme-golf/'
const DEFAULT_PRIVACY_URL = 'https://mottkozak.github.io/gimme-golf/privacy-policy'
const DEFAULT_TERMS_URL = 'https://mottkozak.github.io/gimme-golf/terms-of-use'
const DEFAULT_BILLING_URL = 'https://mottkozak.github.io/gimme-golf/purchases'
const DEFAULT_IOS_APP_STORE_URL = 'https://apps.apple.com/us/search?term=gimme%20golf'
const DEFAULT_ANDROID_PLAY_STORE_URL = 'https://play.google.com/store/search?q=gimme%20golf&c=apps'

function getConfiguredExternalUrl(configuredUrl: unknown, fallbackUrl: string): string {
  if (typeof configuredUrl !== 'string') {
    return fallbackUrl
  }

  const trimmedUrl = configuredUrl.trim()
  if (!/^https?:\/\//i.test(trimmedUrl)) {
    return fallbackUrl
  }

  return trimmedUrl
}

export function getShareableAppUrl(currentUrl: string): string {
  if (typeof currentUrl === 'string' && /^https?:\/\//i.test(currentUrl)) {
    return currentUrl
  }

  const configuredUrl = import.meta.env.VITE_PUBLIC_APP_URL
  if (typeof configuredUrl === 'string' && /^https?:\/\//i.test(configuredUrl.trim())) {
    return configuredUrl.trim()
  }

  return DEFAULT_PUBLIC_APP_URL
}

export function getIosAppStoreUrl(): string {
  return getConfiguredExternalUrl(import.meta.env.VITE_IOS_APP_STORE_URL, DEFAULT_IOS_APP_STORE_URL)
}

export function getAndroidPlayStoreUrl(): string {
  return getConfiguredExternalUrl(import.meta.env.VITE_ANDROID_PLAY_STORE_URL, DEFAULT_ANDROID_PLAY_STORE_URL)
}

export function getPrimaryStoreShareUrl(userAgent: string | null | undefined, currentUrl: string): string {
  const normalizedUserAgent = typeof userAgent === 'string' ? userAgent.toLowerCase() : ''
  if (normalizedUserAgent.includes('android')) {
    return getAndroidPlayStoreUrl()
  }
  if (normalizedUserAgent.includes('iphone') || normalizedUserAgent.includes('ipad') || normalizedUserAgent.includes('ipod')) {
    return getIosAppStoreUrl()
  }
  if (typeof currentUrl === 'string' && currentUrl.trim().length > 0) {
    return getIosAppStoreUrl()
  }
  return getIosAppStoreUrl()
}

export function getPrivacyPolicyUrl(): string {
  return getConfiguredExternalUrl(import.meta.env.VITE_PRIVACY_URL, DEFAULT_PRIVACY_URL)
}

export function getTermsOfUseUrl(): string {
  return getConfiguredExternalUrl(import.meta.env.VITE_TERMS_URL, DEFAULT_TERMS_URL)
}

export function getBillingUrl(): string {
  return getConfiguredExternalUrl(import.meta.env.VITE_BILLING_URL, DEFAULT_BILLING_URL)
}
