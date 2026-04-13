/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PUBLIC_APP_URL?: string
  readonly VITE_PRIVACY_URL?: string
  readonly VITE_TERMS_URL?: string
  readonly VITE_BILLING_URL?: string
  readonly VITE_SENTRY_DSN?: string
  readonly VITE_E2E_BYPASS_AUTH?: string
  readonly VITE_DEV_BYPASS_AUTH?: string
  readonly VITE_ENABLE_SUPABASE_AUTH?: string
  readonly VITE_ENABLE_MULTIPLAYER?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
