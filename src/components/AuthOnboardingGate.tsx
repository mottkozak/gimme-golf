import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { isNative } from '../capacitor.ts'
import GameplayOverviewWalkthrough from './GameplayOverviewWalkthrough.tsx'
import AuthOnboardingPanel from './auth-gate/AuthOnboardingPanel.tsx'
import {
  hapticError,
  hapticLightImpact,
  hapticSelection,
  hapticSuccess,
  hapticWarning,
} from '../capacitor/haptics.ts'
import {
  applySupabaseSessionFromTokens,
  buildProfileFromUserMetadata,
  extractSupabaseSessionFromUrl,
  getAuthNetworkErrorMessage,
  getCurrentSessionWithPolicy,
  getMagicLinkRedirectUrl,
  getOrCreateLocalAccountUserId,
  getSupabaseClient,
  isSupabaseAuthEnabled,
  isSupabaseConfigured,
  loadAccountProfile,
  saveAccountProfile,
  sendSupabaseMagicLink,
  updateSupabaseUserMetadata,
  type AccountProfile,
} from '../logic/account.ts'
import {
  createDefaultDraft,
  normalizeExpectedScore,
  type OnboardingDraft,
  type OnboardingStep,
} from '../logic/authOnboarding.ts'
import {
  saveChallengeLayoutPreference,
  saveNotificationsPreference,
} from '../logic/preferences.ts'
import {
  getEffectiveAuthGateState,
  saveAutoFinalizeAfterSignInFlag,
  type AuthGateState,
} from './auth-gate/authGateState.ts'
import { useAuthSessionOrchestration } from './auth-gate/useAuthSessionOrchestration.ts'

interface AuthOnboardingGateProps {
  children: ReactNode
  splashBackgroundImageSrc: string
  splashBackgroundFallbackImageSrc: string
  onStateChange?: (state: AuthGateState) => void
}

export type { AuthGateState } from './auth-gate/authGateState.ts'

function AuthOnboardingGate({
  children,
  splashBackgroundImageSrc,
  splashBackgroundFallbackImageSrc,
  onStateChange,
}: AuthOnboardingGateProps) {
  const shouldBypassAuthForE2E =
    import.meta.env.VITE_E2E_BYPASS_AUTH === '1' ||
    import.meta.env.VITE_E2E_BYPASS_AUTH === 'true'
  const shouldBypassAuthForDev =
    import.meta.env.DEV &&
    (import.meta.env.VITE_DEV_BYPASS_AUTH === '1' ||
      import.meta.env.VITE_DEV_BYPASS_AUTH === 'true')
  const shouldBypassAuthGate = shouldBypassAuthForE2E || shouldBypassAuthForDev
  const authIsEnabled = isSupabaseAuthEnabled()
  const authIsConfigured = isSupabaseConfigured()
  const [state, setState] = useState<AuthGateState>(() => {
    if (shouldBypassAuthGate) {
      return 'ready'
    }

    if (!authIsEnabled) {
      const localProfile = loadAccountProfile()
      return localProfile?.onboardingCompleted ? 'ready' : 'onboarding'
    }

    return authIsConfigured ? 'loading' : 'config'
  })
  const [email, setEmail] = useState('')
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isBypassed, setIsBypassed] = useState(false)
  const [isRuntimeOnline, setIsRuntimeOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  )
  const [draft, setDraft] = useState<OnboardingDraft>(() => createDefaultDraft())
  const [expectedScoreInput, setExpectedScoreInput] = useState(() =>
    String(createDefaultDraft().expectedScore18),
  )
  const [step, setStep] = useState<OnboardingStep>(0)
  const [isGameplayWalkthroughVisible, setIsGameplayWalkthroughVisible] = useState(false)
  const [shouldAutoFinalizeAfterSignIn, setShouldAutoFinalizeAfterSignIn] = useState(false)
  const draftRef = useRef(draft)

  useEffect(() => {
    draftRef.current = draft
  }, [draft])
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const client = useMemo(() => getSupabaseClient(), [])
  const effectiveState: AuthGateState = getEffectiveAuthGateState({
    authIsEnabled,
    shouldBypassAuthGate,
    authIsConfigured,
    isBypassed,
    state,
  })
  const authGateBackgroundStyle = useMemo(
    () =>
      ({
        '--auth-gate-bg-image': `url("${splashBackgroundImageSrc}")`,
        '--auth-gate-bg-image-fallback': `url("${splashBackgroundFallbackImageSrc}")`,
      }) as CSSProperties,
    [splashBackgroundFallbackImageSrc, splashBackgroundImageSrc],
  )

  useEffect(() => {
    onStateChange?.(effectiveState)
  }, [effectiveState, onStateChange])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const handleOnline = () => setIsRuntimeOnline(true)
    const handleOffline = () => setIsRuntimeOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const applySessionFromUrl = useCallback(
    async (url: string): Promise<boolean> => {
      if (!client) {
        return false
      }

      const extracted = extractSupabaseSessionFromUrl(url)
      if (!extracted) {
        return false
      }

      const sessionResult = await applySupabaseSessionFromTokens(
        client,
        extracted.accessToken,
        extracted.refreshToken,
      )
      if (!sessionResult.ok) {
        setStatusMessage(getAuthNetworkErrorMessage(sessionResult.error))
        return false
      }

      return true
    },
    [client, setStatusMessage],
  )

  const completeOnboardingForUser = useCallback(
    async (activeUserId: string, activeUserEmail: string | null): Promise<boolean> => {
      if (authIsEnabled && !client) {
        setStatusMessage('Login is unavailable right now.')
        return false
      }

      setIsSubmitting(true)
      setStatusMessage('Finishing your setup...')

      const currentDraft = draftRef.current
      const profile: AccountProfile = {
        userId: activeUserId,
        email: activeUserEmail ?? '',
        displayName: currentDraft.displayName.trim(),
        expectedScore18: normalizeExpectedScore(currentDraft.expectedScore18),
        challengeLayout: currentDraft.challengeLayout,
        appVibe: currentDraft.appVibe,
        typicalGroupSize: currentDraft.typicalGroupSize,
        playCadence: currentDraft.playCadence,
        remindersEnabled: currentDraft.remindersEnabled,
        onboardingCompleted: true,
        createdAtMs: Date.now(),
      }

      if (authIsEnabled && client) {
        const updateResult = await updateSupabaseUserMetadata(client, {
          displayName: profile.displayName,
          expectedScore18: profile.expectedScore18,
          challengeLayout: profile.challengeLayout,
          appVibe: profile.appVibe,
          typicalGroupSize: profile.typicalGroupSize,
          playCadence: profile.playCadence,
          remindersEnabled: currentDraft.remindersEnabled,
          onboardingCompleted: true,
        })
        if (!updateResult.ok) {
          hapticError()
          saveAutoFinalizeAfterSignInFlag(false)
          setShouldAutoFinalizeAfterSignIn(false)
          setStatusMessage(getAuthNetworkErrorMessage(updateResult.error))
          setState('onboarding')
          setIsSubmitting(false)
          return false
        }
      }

      saveNotificationsPreference(currentDraft.remindersEnabled)
      saveAccountProfile(profile)
      saveChallengeLayoutPreference(profile.challengeLayout)
      hapticSuccess()
      saveAutoFinalizeAfterSignInFlag(false)
      setShouldAutoFinalizeAfterSignIn(false)
      setState('ready')
      setIsSubmitting(false)
      return true
    },
    [
      authIsEnabled,
      client,
      setIsSubmitting,
      setShouldAutoFinalizeAfterSignIn,
      setState,
      setStatusMessage,
    ],
  )

  useAuthSessionOrchestration({
    shouldBypassAuthGate,
    authIsConfigured,
    client,
    shouldAutoFinalizeAfterSignIn,
    completeOnboardingForUser,
    applySessionFromUrl,
    setStatusMessage,
    setState,
    setUserId,
    setUserEmail,
    setDraft,
    setShouldAutoFinalizeAfterSignIn,
  })

  const sendMagicLink = async () => {
    if (!client) {
      setStatusMessage('Login is unavailable right now.')
      return
    }

    if (!email.trim() || !email.includes('@')) {
      hapticWarning()
      setStatusMessage('Enter a valid email to continue.')
      return
    }

    setIsSubmitting(true)
    setStatusMessage(null)

    const redirectUrl = getMagicLinkRedirectUrl(window.location.href)
    const signInResult = await sendSupabaseMagicLink(client, email.trim(), redirectUrl)
    if (signInResult.ok) {
      hapticSuccess()
      setState('awaitingMagicLink')
      if (isNative()) {
        setStatusMessage('Login link sent. Open it from your email to continue.')
      } else {
        setStatusMessage('Login link sent. Open your email and tap it to continue.')
      }
    } else {
      hapticError()
      setStatusMessage(getAuthNetworkErrorMessage(signInResult.error))
    }
    setIsSubmitting(false)
  }

  const refreshSession = async () => {
    setState('loading')
    const sessionResult = await getCurrentSessionWithPolicy()
    if (!sessionResult.ok) {
      setStatusMessage(getAuthNetworkErrorMessage(sessionResult.error))
      setState('awaitingMagicLink')
      return
    }

    const session = sessionResult.value
    if (!session?.user) {
      setStatusMessage('No active login found yet. Open your email link and try again.')
      setState('awaitingMagicLink')
      return
    }

    setUserId(session.user.id)
    setUserEmail(session.user.email ?? '')

    const localProfile = loadAccountProfile()
    if (localProfile && localProfile.userId === session.user.id && localProfile.onboardingCompleted) {
      setState('ready')
      return
    }

    const metadataProfile = buildProfileFromUserMetadata(session.user)
    if (metadataProfile) {
      saveAccountProfile(metadataProfile)
      saveChallengeLayoutPreference(metadataProfile.challengeLayout)
      saveNotificationsPreference(metadataProfile.remindersEnabled ?? true)
      setShouldAutoFinalizeAfterSignIn(false)
      setState('ready')
      return
    }

    setState('onboarding')
  }

  const goNext = () => {
    if (step === 1 && draft.displayName.trim().length < 2) {
      hapticWarning()
      setStatusMessage('Add a display name so your account can be identified.')
      return
    }

    if (step === 2) {
      const parsed = expectedScoreInput.replace(/[^\d]/g, '')
      const num = parsed === '' ? null : Number(parsed)
      const normalized =
        num === null ? draft.expectedScore18 : normalizeExpectedScore(num)
      setDraft((current) => ({ ...current, expectedScore18: normalized }))
      setExpectedScoreInput(String(normalized))
    }

    if (step < 3) {
      if (step === 1) {
        setExpectedScoreInput(String(draft.expectedScore18))
      }
      hapticSelection()
      setStatusMessage(null)
      setStep((current) => (current + 1) as OnboardingStep)
    }
  }

  const goBack = () => {
    if (step === 0) {
      return
    }
    if (step === 3) {
      setExpectedScoreInput(String(draft.expectedScore18))
    }
    hapticSelection()
    setStatusMessage(null)
    setStep((current) => (current - 1) as OnboardingStep)
  }

  const openGameplayWalkthrough = () => {
    hapticLightImpact()
    setIsGameplayWalkthroughVisible(true)
  }

  const closeGameplayWalkthrough = (status: 'completed' | 'dismissed') => {
    setIsGameplayWalkthroughVisible(false)
    if (status === 'completed' || status === 'dismissed') {
      setStatusMessage(null)
      setStep(1)
      return
    }
  }

  const finishOnboarding = async () => {
    if (!authIsEnabled) {
      const localUserId = getOrCreateLocalAccountUserId()
      setUserId(localUserId)
      setUserEmail(null)
      setStatusMessage(null)
      await completeOnboardingForUser(localUserId, null)
      return
    }

    if (!client || !userId) {
      setShouldAutoFinalizeAfterSignIn(true)
      saveAutoFinalizeAfterSignInFlag(true)
      setState('signIn')
      return
    }

    setStatusMessage(null)
    await completeOnboardingForUser(userId, userEmail)
  }

  const keepFieldVisible = (element: HTMLInputElement) => {
    window.requestAnimationFrame(() => {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    })
  }

  const continueOffline = () => {
    hapticLightImpact()
    setIsBypassed(true)
    setStatusMessage('Offline mode enabled. Internet features can be used after reconnecting.')
  }

  if (effectiveState === 'ready') {
    return <>{children}</>
  }

  return (
    <section className="screen stack-sm auth-gate" style={authGateBackgroundStyle}>
      {statusMessage && effectiveState !== 'onboarding' && (
        <p className="home-warning-text" role="status" aria-live="polite">
          {statusMessage}
        </p>
      )}

      {effectiveState === 'config' && (
        <section className="panel stack-sm auth-gate-card">
          <p className="label">Supabase Configuration Needed</p>
          <p className="muted">
            Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to enable
            login.
          </p>
          <div className="onboarding-modal__actions">
            <button
              type="button"
              className="button-primary"
              onClick={() => {
                hapticLightImpact()
                setIsBypassed(true)
              }}
            >
              Continue without login
            </button>
          </div>
        </section>
      )}

      {effectiveState === 'loading' && (
        <section className="panel stack-xs auth-gate-card">
          <p className="label">Checking session...</p>
          <p className="muted">One sec while we sync your account.</p>
          {!isRuntimeOnline && (
            <div className="onboarding-modal__actions">
              <button type="button" onClick={continueOffline}>
                Continue offline
              </button>
            </div>
          )}
        </section>
      )}

      {effectiveState === 'signIn' && (
        <section className="panel stack-sm auth-gate-card">
          <p className="label">Create your account</p>
          <label className="field">
            <span className="label">Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onFocus={(event) => keepFieldVisible(event.currentTarget)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' || event.nativeEvent.isComposing) {
                  return
                }
                event.preventDefault()
                if (!isSubmitting) {
                  void sendMagicLink()
                }
              }}
              placeholder="you@example.com"
            />
          </label>
          <button
            type="button"
            className="button-primary"
            data-requires-network="true"
            onClick={sendMagicLink}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Sending...' : 'Email me a login link'}
          </button>
          {!isRuntimeOnline && (
            <button type="button" onClick={continueOffline}>
              Continue offline
            </button>
          )}
        </section>
      )}

      {effectiveState === 'awaitingMagicLink' && (
        <section className="panel stack-sm auth-gate-card">
          <p className="label">Check your email</p>
          <p className="muted">Open the link in your email, then come back.</p>
          <div className="onboarding-modal__actions">
            <button
              type="button"
              onClick={() => {
                hapticLightImpact()
                setState('signIn')
              }}
            >
              Use another email
            </button>
            <button
              type="button"
              className="button-primary"
              data-requires-network="true"
              onClick={refreshSession}
            >
              Continue
            </button>
            {!isRuntimeOnline && (
              <button type="button" onClick={continueOffline}>
                Continue offline
              </button>
            )}
          </div>
        </section>
      )}

      {effectiveState === 'onboarding' && (
        <AuthOnboardingPanel
          step={step}
          draft={draft}
          expectedScoreInput={expectedScoreInput}
          isSubmitting={isSubmitting}
          onSetStep={setStep}
          onSetDraft={setDraft}
          onSetExpectedScoreInput={setExpectedScoreInput}
          onKeepFieldVisible={keepFieldVisible}
          onGoBack={goBack}
          onGoNext={goNext}
          onOpenGameplayWalkthrough={openGameplayWalkthrough}
          onFinishOnboarding={finishOnboarding}
          onSelectOptionWithHaptic={hapticSelection}
          onClearStatusMessage={() => setStatusMessage(null)}
        />
      )}
      {isGameplayWalkthroughVisible && <GameplayOverviewWalkthrough onClose={closeGameplayWalkthrough} />}
      {effectiveState === 'onboarding' && !isRuntimeOnline && (
        <section className="panel stack-xs auth-gate-card">
          <p className="muted">No internet detected. You can still start in local offline mode.</p>
          <div className="onboarding-modal__actions">
            <button type="button" onClick={continueOffline}>
              Continue offline
            </button>
          </div>
        </section>
      )}
    </section>
  )
}

export default AuthOnboardingGate
