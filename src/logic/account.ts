import { createClient, type Session, type SupabaseClient, type User } from '@supabase/supabase-js'
import { getShareableAppUrl } from '../config/appLinks.ts'
import { isNativePlatform, isRuntimeOnline } from '../platform/runtime.ts'
import { readStorageItem, removeStorageItem, writeStorageItem } from '../platform/storage.ts'
import { reportTelemetryEvent } from '../platform/telemetry.ts'

export type AppVibe = 'serious' | 'competitive' | 'fun' | 'balanced'
export type TypicalGroupSize = 'solo' | 'twosome' | 'threesome' | 'foursome_plus'
export type PlayCadence = 'rare' | 'monthly' | 'weekly' | 'daily'
export type ChallengeLayout = 'compact' | 'illustrative'

export interface AccountProfile {
  userId: string
  email: string
  displayName: string
  expectedScore18: number
  challengeLayout: ChallengeLayout
  appVibe: AppVibe
  typicalGroupSize: TypicalGroupSize
  playCadence: PlayCadence
  remindersEnabled: boolean
  onboardingCompleted: boolean
  createdAtMs: number
}

const ACCOUNT_PROFILE_STORAGE_KEY = 'gimme-golf-account-profile-v1'
const LOCAL_ACCOUNT_USER_ID_STORAGE_KEY = 'gimme-golf-local-account-user-id-v1'
const DEFAULT_NATIVE_AUTH_SCHEME = 'gimmegolf'
const NATIVE_AUTH_HOST = 'auth'
const NATIVE_AUTH_PATH = 'callback'
const AUTH_OPERATION_TIMEOUT_MS = 10_000
const AUTH_RETRY_DELAYS_MS = [300, 1_000, 2_000] as const
let cachedClient: SupabaseClient | null | undefined

export type AuthNetworkErrorCode =
  | 'client_unavailable'
  | 'offline'
  | 'timeout'
  | 'network_error'
  | 'auth_error'

export interface AuthNetworkError {
  code: AuthNetworkErrorCode
  message: string
  retryable: boolean
  attempts: number
  cause?: unknown
}

export type AuthNetworkResult<T> =
  | {
      ok: true
      value: T
      attempts: number
    }
  | {
      ok: false
      error: AuthNetworkError
    }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function sleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs)
  })
}

function isOffline(): boolean {
  return !isRuntimeOnline()
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutHandle = setTimeout(() => {
      reject(new Error('AUTH_NETWORK_TIMEOUT'))
    }, timeoutMs)

    promise
      .then((value) => {
        clearTimeout(timeoutHandle)
        resolve(value)
      })
      .catch((error) => {
        clearTimeout(timeoutHandle)
        reject(error)
      })
  })
}

function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error
  }

  if (error instanceof Error) {
    return error.message
  }

  if (isRecord(error) && typeof error.message === 'string') {
    return error.message
  }

  return 'Unknown authentication error'
}

function getErrorStatus(error: unknown): number | null {
  if (!isRecord(error)) {
    return null
  }

  const candidateStatus = error.status
  if (typeof candidateStatus !== 'number' || !Number.isFinite(candidateStatus)) {
    return null
  }

  return Math.round(candidateStatus)
}

function isRetryableAuthError(error: unknown): boolean {
  if (error instanceof Error && error.message === 'AUTH_NETWORK_TIMEOUT') {
    return true
  }

  const status = getErrorStatus(error)
  if (status === 429 || status === 408) {
    return true
  }

  if (typeof status === 'number' && status >= 500) {
    return true
  }

  const message = getErrorMessage(error).toLowerCase()
  return (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('timeout') ||
    message.includes('load failed') ||
    message.includes('temporarily unavailable')
  )
}

function classifyAuthError(
  error: unknown,
  operationLabel: string,
  attempts: number,
): AuthNetworkError {
  if (isOffline()) {
    return {
      code: 'offline',
      message: 'Device is offline.',
      retryable: true,
      attempts,
      cause: error,
    }
  }

  if (error instanceof Error && error.message === 'AUTH_NETWORK_TIMEOUT') {
    return {
      code: 'timeout',
      message: `Authentication request timed out during ${operationLabel}.`,
      retryable: true,
      attempts,
      cause: error,
    }
  }

  const status = getErrorStatus(error)
  if (status !== null) {
    const providerMessage = getErrorMessage(error).trim()
    const statusMessage = `Authentication service returned status ${status}.`
    return {
      code: 'auth_error',
      message:
        providerMessage.length > 0 && providerMessage !== 'Unknown authentication error'
          ? `${statusMessage} ${providerMessage}`
          : statusMessage,
      retryable: status >= 500 || status === 408,
      attempts,
      cause: error,
    }
  }

  if (isRetryableAuthError(error)) {
    return {
      code: 'network_error',
      message: `Network error while running ${operationLabel}.`,
      retryable: true,
      attempts,
      cause: error,
    }
  }

  return {
    code: 'auth_error',
    message: getErrorMessage(error),
    retryable: false,
    attempts,
    cause: error,
  }
}

async function executeAuthWithNetworkPolicy<T>(
  operationLabel: string,
  operation: () => Promise<T>,
): Promise<AuthNetworkResult<T>> {
  if (isOffline()) {
    const error: AuthNetworkError = {
      code: 'offline',
      message: 'Device is offline.',
      retryable: true,
      attempts: 0,
    }
    reportTelemetryEvent({
      scope: 'auth_network_policy',
      level: 'warn',
      message: `${operationLabel} blocked because device is offline`,
      data: {
        code: error.code,
      },
    })
    return {
      ok: false,
      error,
    }
  }

  let attempt = 0
  while (attempt <= AUTH_RETRY_DELAYS_MS.length) {
    attempt += 1
    try {
      const value = await withTimeout(operation(), AUTH_OPERATION_TIMEOUT_MS)
      return {
        ok: true,
        value,
        attempts: attempt,
      }
    } catch (error) {
      const classifiedError = classifyAuthError(error, operationLabel, attempt)
      const shouldRetry =
        classifiedError.retryable &&
        attempt <= AUTH_RETRY_DELAYS_MS.length &&
        !isOffline()

      reportTelemetryEvent({
        scope: 'auth_network_policy',
        level: shouldRetry ? 'warn' : 'error',
        message: `${operationLabel} failed`,
        data: {
          attempts: attempt,
          retrying: shouldRetry,
          code: classifiedError.code,
        },
        error,
      })

      if (!shouldRetry) {
        return {
          ok: false,
          error: classifiedError,
        }
      }

      await sleep(AUTH_RETRY_DELAYS_MS[attempt - 1] ?? AUTH_RETRY_DELAYS_MS[AUTH_RETRY_DELAYS_MS.length - 1])
    }
  }

  return {
    ok: false,
    error: {
      code: 'network_error',
      message: `${operationLabel} failed after retries.`,
      retryable: true,
      attempts: AUTH_RETRY_DELAYS_MS.length + 1,
    },
  }
}

function noClientResult<T>(): AuthNetworkResult<T> {
  return {
    ok: false,
    error: {
      code: 'client_unavailable',
      message: 'Authentication client is unavailable.',
      retryable: false,
      attempts: 0,
    },
  }
}

export function getAuthNetworkErrorMessage(error: AuthNetworkError): string {
  if (error.code === 'offline') {
    return 'You are offline. Reconnect and try again.'
  }

  if (error.code === 'timeout') {
    return 'Connection timed out. Try again in a moment.'
  }

  if (error.code === 'network_error') {
    return 'Network issue prevented authentication. Please retry.'
  }

  if (error.code === 'client_unavailable') {
    return 'Login is unavailable right now.'
  }

  const normalizedMessage = error.message.toLowerCase()
  if (
    error.code === 'auth_error' &&
    (normalizedMessage.includes('status 429') || normalizedMessage.includes('rate limit'))
  ) {
    return 'Too many login emails requested. Wait a bit, then try again.'
  }

  const authMessage = error.message.trim()
  if (authMessage.length > 0 && authMessage !== 'Unknown authentication error') {
    return authMessage
  }

  return 'Authentication request failed. Please try again.'
}

export function isSupabaseAuthEnabled(): boolean {
  const configuredFlag = import.meta.env.VITE_ENABLE_SUPABASE_AUTH?.trim().toLowerCase()
  if (!configuredFlag) {
    return false
  }

  return configuredFlag === '1' || configuredFlag === 'true'
}

export function isSupabaseConfigured(): boolean {
  if (!isSupabaseAuthEnabled()) {
    return false
  }

  return (
    typeof import.meta.env.VITE_SUPABASE_URL === 'string' &&
    import.meta.env.VITE_SUPABASE_URL.length > 0 &&
    typeof import.meta.env.VITE_SUPABASE_ANON_KEY === 'string' &&
    import.meta.env.VITE_SUPABASE_ANON_KEY.length > 0
  )
}

export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient !== undefined) {
    return cachedClient
  }

  if (!isSupabaseConfigured()) {
    cachedClient = null
    return cachedClient
  }

  cachedClient = createClient(
    import.meta.env.VITE_SUPABASE_URL!,
    import.meta.env.VITE_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    },
  )
  return cachedClient
}

export function getNativeAuthScheme(): string {
  const configuredScheme = import.meta.env.VITE_NATIVE_AUTH_SCHEME?.trim().toLowerCase()
  if (configuredScheme && /^[a-z][a-z0-9+.-]*$/.test(configuredScheme)) {
    return configuredScheme
  }
  return DEFAULT_NATIVE_AUTH_SCHEME
}

export function getNativeAuthRedirectUrl(): string {
  return `${getNativeAuthScheme()}://${NATIVE_AUTH_HOST}/${NATIVE_AUTH_PATH}`
}

export function getMagicLinkRedirectUrl(currentUrl: string): string {
  if (isNativePlatform()) {
    return getNativeAuthRedirectUrl()
  }

  if (typeof currentUrl === 'string' && /^https?:\/\//i.test(currentUrl)) {
    return currentUrl
  }

  return getShareableAppUrl(currentUrl)
}

function parseSearchParamsFromUrl(url: string): URLSearchParams {
  const hashFragment = url.includes('#') ? url.split('#')[1] ?? '' : ''
  const hashContent = hashFragment.startsWith('/') ? hashFragment.slice(1) : hashFragment
  const hashParams = new URLSearchParams(hashContent)
  if (hashParams.get('access_token')) {
    return hashParams
  }

  const queryString = url.includes('?') ? url.split('?')[1] ?? '' : ''
  const queryWithoutHash = queryString.split('#')[0] ?? ''
  return new URLSearchParams(queryWithoutHash)
}

export function extractSupabaseSessionFromUrl(
  url: string,
): { accessToken: string; refreshToken: string } | null {
  const params = parseSearchParamsFromUrl(url)
  const accessToken = params.get('access_token')
  const refreshToken = params.get('refresh_token')

  if (!accessToken || !refreshToken) {
    return null
  }

  return {
    accessToken,
    refreshToken,
  }
}

export function loadAccountProfile(): AccountProfile | null {
  const rawValue = readStorageItem(ACCOUNT_PROFILE_STORAGE_KEY)
  if (!rawValue) {
    return null
  }

  try {
    const parsed = JSON.parse(rawValue)
    if (!isRecord(parsed)) {
      return null
    }

    if (
      typeof parsed.userId !== 'string' ||
      typeof parsed.email !== 'string' ||
      typeof parsed.displayName !== 'string' ||
      typeof parsed.expectedScore18 !== 'number' ||
      typeof parsed.appVibe !== 'string' ||
      typeof parsed.typicalGroupSize !== 'string' ||
      typeof parsed.playCadence !== 'string' ||
      typeof parsed.remindersEnabled !== 'boolean' ||
      typeof parsed.onboardingCompleted !== 'boolean' ||
      typeof parsed.createdAtMs !== 'number'
    ) {
      return null
    }

    return {
      userId: parsed.userId,
      email: parsed.email,
      displayName: parsed.displayName,
      expectedScore18: parsed.expectedScore18,
      challengeLayout: parsed.challengeLayout === 'compact' ? 'compact' : 'illustrative',
      appVibe: parsed.appVibe as AppVibe,
      typicalGroupSize: parsed.typicalGroupSize as TypicalGroupSize,
      playCadence: parsed.playCadence as PlayCadence,
      remindersEnabled: parsed.remindersEnabled,
      onboardingCompleted: parsed.onboardingCompleted,
      createdAtMs: parsed.createdAtMs,
    }
  } catch (error) {
    reportTelemetryEvent({
      scope: 'account_profile',
      level: 'warn',
      message: 'Failed to parse account profile from storage',
      error,
    })
    return null
  }
}

export function saveAccountProfile(profile: AccountProfile): void {
  writeStorageItem(ACCOUNT_PROFILE_STORAGE_KEY, JSON.stringify(profile))
  if (profile.userId.startsWith('local-')) {
    writeStorageItem(LOCAL_ACCOUNT_USER_ID_STORAGE_KEY, profile.userId)
  }
}

export function clearAccountProfile(): void {
  removeStorageItem(ACCOUNT_PROFILE_STORAGE_KEY)
  removeStorageItem(LOCAL_ACCOUNT_USER_ID_STORAGE_KEY)
}

export function getOrCreateLocalAccountUserId(): string {
  const existingUserId = readStorageItem(LOCAL_ACCOUNT_USER_ID_STORAGE_KEY)
  const normalizedExistingUserId = existingUserId?.trim()
  if (normalizedExistingUserId && normalizedExistingUserId.length > 0) {
    return normalizedExistingUserId
  }

  const localUserId = `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  writeStorageItem(LOCAL_ACCOUNT_USER_ID_STORAGE_KEY, localUserId)
  return localUserId
}

export function buildProfileFromUserMetadata(user: User): AccountProfile | null {
  const metadata = user.user_metadata
  if (!isRecord(metadata) || metadata.onboardingCompleted !== true) {
    return null
  }

  if (
    typeof metadata.displayName !== 'string' ||
    typeof metadata.expectedScore18 !== 'number'
  ) {
    return null
  }

  const appVibe = typeof metadata.appVibe === 'string' ? (metadata.appVibe as AppVibe) : 'balanced'
  const typicalGroupSize =
    typeof metadata.typicalGroupSize === 'string'
      ? (metadata.typicalGroupSize as TypicalGroupSize)
      : 'foursome_plus'
  const playCadence =
    typeof metadata.playCadence === 'string'
      ? (metadata.playCadence as PlayCadence)
      : 'monthly'
  const challengeLayout = metadata.challengeLayout === 'compact' ? 'compact' : 'illustrative'

  return {
    userId: user.id,
    email: user.email ?? '',
    displayName: metadata.displayName,
    expectedScore18: metadata.expectedScore18,
    challengeLayout,
    appVibe,
    typicalGroupSize,
    playCadence,
    remindersEnabled: Boolean(metadata.remindersEnabled ?? true),
    onboardingCompleted: true,
    createdAtMs: Date.now(),
  }
}

export async function getCurrentSession(): Promise<Session | null> {
  const sessionResult = await getCurrentSessionWithPolicy()
  if (!sessionResult.ok) {
    return null
  }

  return sessionResult.value
}

export async function getCurrentSessionWithPolicy(): Promise<AuthNetworkResult<Session | null>> {
  const client = getSupabaseClient()
  if (!client) {
    return noClientResult()
  }

  return executeAuthWithNetworkPolicy('get_current_session', async () => {
    const { data, error } = await client.auth.getSession()
    if (error) {
      throw error
    }
    return data.session ?? null
  })
}

export async function applySupabaseSessionFromTokens(
  client: SupabaseClient,
  accessToken: string,
  refreshToken: string,
): Promise<AuthNetworkResult<true>> {
  return executeAuthWithNetworkPolicy('set_session_from_tokens', async () => {
    const { error } = await client.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    })
    if (error) {
      throw error
    }

    return true as const
  })
}

export async function updateSupabaseUserMetadata(
  client: SupabaseClient,
  metadata: Record<string, unknown>,
): Promise<AuthNetworkResult<true>> {
  return executeAuthWithNetworkPolicy('update_user_metadata', async () => {
    const { error } = await client.auth.updateUser({
      data: metadata,
    })
    if (error) {
      throw error
    }

    return true as const
  })
}

export async function sendSupabaseMagicLink(
  client: SupabaseClient,
  email: string,
  redirectUrl: string,
): Promise<AuthNetworkResult<true>> {
  return executeAuthWithNetworkPolicy('send_magic_link', async () => {
    const { error } = await client.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: redirectUrl,
      },
    })
    if (error) {
      throw error
    }

    return true as const
  })
}

export async function signOutFromSupabase(
  client: SupabaseClient,
): Promise<AuthNetworkResult<true>> {
  return executeAuthWithNetworkPolicy('sign_out', async () => {
    const { error } = await client.auth.signOut()
    if (error) {
      throw error
    }

    return true as const
  })
}
