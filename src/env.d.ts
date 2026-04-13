/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PUBLIC_APP_URL?: string
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_ENABLE_SUPABASE_AUTH?: string
  readonly VITE_ENABLE_MULTIPLAYER?: string
  readonly VITE_NATIVE_AUTH_SCHEME?: string
  readonly VITE_DEV_BYPASS_AUTH?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
