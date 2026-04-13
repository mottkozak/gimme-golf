import { act, renderHook, waitFor } from '@testing-library/react'
import type { Dispatch, SetStateAction } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { OnboardingDraft } from '../../logic/authOnboarding.ts'
import type { AuthNetworkResult } from '../../logic/account.ts'
import {
  getAuthNetworkErrorMessage,
  getCurrentSessionWithPolicy,
} from '../../logic/account.ts'
import type { AuthGateState } from './authGateState.ts'
import { loadAutoFinalizeAfterSignInFlag } from './authGateState.ts'
import { useAuthSessionOrchestration } from './useAuthSessionOrchestration.ts'

vi.mock('../../capacitor.ts', () => ({
  addAppUrlOpenListener: vi.fn(() => () => {}),
  getLaunchUrl: vi.fn(async () => null),
  isNative: vi.fn(() => false),
}))

vi.mock('../../capacitor/haptics.ts', () => ({
  hapticSuccess: vi.fn(),
}))

vi.mock('../../logic/preferences.ts', () => ({
  saveNotificationsPreference: vi.fn(),
}))

vi.mock('./authGateState.ts', async () => {
  const actual = await vi.importActual<typeof import('./authGateState.ts')>('./authGateState.ts')
  return {
    ...actual,
    loadAutoFinalizeAfterSignInFlag: vi.fn(() => false),
  }
})

vi.mock('../../logic/account.ts', async () => {
  const actual = await vi.importActual<typeof import('../../logic/account.ts')>('../../logic/account.ts')
  return {
    ...actual,
    buildProfileFromUserMetadata: vi.fn(() => null),
    clearAccountProfile: vi.fn(),
    getAuthNetworkErrorMessage: vi.fn(() => 'Network issue'),
    getCurrentSessionWithPolicy: vi.fn(),
    loadAccountProfile: vi.fn(() => null),
    saveAccountProfile: vi.fn(),
  }
})

function createHookArgs(overrides: Partial<Parameters<typeof useAuthSessionOrchestration>[0]> = {}) {
  return {
    applySessionFromUrl: vi.fn(async () => false),
    authIsConfigured: true,
    client: null,
    completeOnboardingForUser: vi.fn(async () => true),
    setDraft: vi.fn() as Dispatch<SetStateAction<OnboardingDraft>>,
    setShouldAutoFinalizeAfterSignIn: vi.fn() as Dispatch<SetStateAction<boolean>>,
    setState: vi.fn() as Dispatch<SetStateAction<AuthGateState>>,
    setStatusMessage: vi.fn() as Dispatch<SetStateAction<string | null>>,
    setUserEmail: vi.fn() as Dispatch<SetStateAction<string | null>>,
    setUserId: vi.fn() as Dispatch<SetStateAction<string | null>>,
    shouldAutoFinalizeAfterSignIn: false,
    shouldBypassAuthGate: false,
    ...overrides,
  }
}

describe('useAuthSessionOrchestration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(loadAutoFinalizeAfterSignInFlag).mockReturnValue(false)
    vi.mocked(getAuthNetworkErrorMessage).mockReturnValue('Network issue')
  })

  it('keeps sign-in target when auth callback reports no active session', () => {
    vi.mocked(getCurrentSessionWithPolicy).mockReturnValue(
      new Promise<AuthNetworkResult<null>>(() => {}),
    )

    let capturedAuthCallback: ((event: unknown, session: { user?: unknown } | null) => void) | null =
      null
    const client = {
      auth: {
        onAuthStateChange: vi.fn((callback) => {
          capturedAuthCallback = callback
          return {
            data: {
              subscription: {
                unsubscribe: vi.fn(),
              },
            },
          }
        }),
      },
    } as unknown as SupabaseClient

    const setState = vi.fn() as Dispatch<SetStateAction<AuthGateState>>
    renderHook(() =>
      useAuthSessionOrchestration(
        createHookArgs({
          client,
          setState,
          shouldAutoFinalizeAfterSignIn: true,
        }),
      ),
    )

    expect(capturedAuthCallback).not.toBeNull()

    act(() => {
      capturedAuthCallback?.('SIGNED_OUT', null)
    })

    expect(setState).toHaveBeenCalledWith('signIn')
    expect(setState).not.toHaveBeenCalledWith('onboarding')
  })

  it('routes to sign-in when session sync fails after onboarding requests sign-in', async () => {
    vi.mocked(getCurrentSessionWithPolicy).mockResolvedValue({
      ok: false,
      error: {
        code: 'network_error',
        message: 'Failed session check',
        retryable: true,
        attempts: 1,
      },
    })

    const setState = vi.fn() as Dispatch<SetStateAction<AuthGateState>>
    const setStatusMessage = vi.fn() as Dispatch<SetStateAction<string | null>>

    renderHook(() =>
      useAuthSessionOrchestration(
        createHookArgs({
          setState,
          setStatusMessage,
          shouldAutoFinalizeAfterSignIn: true,
        }),
      ),
    )

    await waitFor(() => {
      expect(setState).toHaveBeenCalledWith('signIn')
    })
    expect(setState).not.toHaveBeenCalledWith('onboarding')
    expect(setStatusMessage).toHaveBeenCalledWith('Network issue')
  })
})
