import { useEffect, type Dispatch, type SetStateAction } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { addAppUrlOpenListener, getLaunchUrl, isNative } from '../../capacitor.ts'
import { hapticSuccess } from '../../capacitor/haptics.ts'
import {
  buildProfileFromUserMetadata,
  clearAccountProfile,
  getAuthNetworkErrorMessage,
  getCurrentSessionWithPolicy,
  loadAccountProfile,
  saveAccountProfile,
} from '../../logic/account.ts'
import type { OnboardingDraft } from '../../logic/authOnboarding.ts'
import {
  saveChallengeLayoutPreference,
  saveNotificationsPreference,
} from '../../logic/preferences.ts'
import { loadAutoFinalizeAfterSignInFlag } from './authGateState.ts'
import type { AuthGateState } from './authGateState.ts'

interface UseAuthSessionOrchestrationArgs {
  applySessionFromUrl: (url: string) => Promise<boolean>
  authIsConfigured: boolean
  client: SupabaseClient | null
  completeOnboardingForUser: (activeUserId: string, activeUserEmail: string | null) => Promise<boolean>
  setDraft: Dispatch<SetStateAction<OnboardingDraft>>
  setShouldAutoFinalizeAfterSignIn: Dispatch<SetStateAction<boolean>>
  setState: Dispatch<SetStateAction<AuthGateState>>
  setStatusMessage: Dispatch<SetStateAction<string | null>>
  setUserEmail: Dispatch<SetStateAction<string | null>>
  setUserId: Dispatch<SetStateAction<string | null>>
  shouldAutoFinalizeAfterSignIn: boolean
  shouldBypassAuthGate: boolean
}

export function useAuthSessionOrchestration({
  applySessionFromUrl,
  authIsConfigured,
  client,
  completeOnboardingForUser,
  setDraft,
  setShouldAutoFinalizeAfterSignIn,
  setState,
  setStatusMessage,
  setUserEmail,
  setUserId,
  shouldAutoFinalizeAfterSignIn,
  shouldBypassAuthGate,
}: UseAuthSessionOrchestrationArgs): void {
  useEffect(() => {
    if (shouldBypassAuthGate || !authIsConfigured) {
      return
    }

    let isCancelled = false

    const syncSession = async () => {
      const shouldFinalizeAfterSignIn =
        shouldAutoFinalizeAfterSignIn || loadAutoFinalizeAfterSignInFlag()

      const sessionResult = await getCurrentSessionWithPolicy()
      if (isCancelled) {
        return
      }

      if (!sessionResult.ok) {
        setStatusMessage(getAuthNetworkErrorMessage(sessionResult.error))
        setState(shouldFinalizeAfterSignIn ? 'signIn' : 'onboarding')
        return
      }

      const session = sessionResult.value
      if (!session?.user) {
        clearAccountProfile()
        setUserId(null)
        setUserEmail(null)
        setState(shouldFinalizeAfterSignIn ? 'signIn' : 'onboarding')
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

      setDraft((current) => ({
        ...current,
        displayName:
          typeof session.user.user_metadata?.displayName === 'string'
            ? session.user.user_metadata.displayName
            : current.displayName,
        challengeLayout:
          session.user.user_metadata?.challengeLayout === 'compact'
            ? 'compact'
            : 'illustrative',
      }))
      if (shouldFinalizeAfterSignIn) {
        setShouldAutoFinalizeAfterSignIn(true)
        setState('loading')
        await completeOnboardingForUser(session.user.id, session.user.email ?? '')
        return
      }

      setState('onboarding')
    }

    void syncSession()

    if (!client) {
      return () => {
        isCancelled = true
      }
    }

    const authSubscription = client.auth.onAuthStateChange((_event, session) => {
      if (isCancelled) {
        return
      }

      if (!session?.user) {
        clearAccountProfile()
        setUserId(null)
        setUserEmail(null)
        const shouldFinalizeAfterSignIn =
          shouldAutoFinalizeAfterSignIn || loadAutoFinalizeAfterSignInFlag()
        setState(shouldFinalizeAfterSignIn ? 'signIn' : 'onboarding')
        return
      }

      setUserId(session.user.id)
      setUserEmail(session.user.email ?? '')
      const metadataProfile = buildProfileFromUserMetadata(session.user)
      if (metadataProfile) {
        saveAccountProfile(metadataProfile)
        saveChallengeLayoutPreference(metadataProfile.challengeLayout)
        saveNotificationsPreference(metadataProfile.remindersEnabled ?? true)
        setShouldAutoFinalizeAfterSignIn(false)
        setState('ready')
      } else {
        setState('onboarding')
      }
    })

    return () => {
      isCancelled = true
      authSubscription.data.subscription.unsubscribe()
    }
  }, [
    authIsConfigured,
    client,
    completeOnboardingForUser,
    setDraft,
    setShouldAutoFinalizeAfterSignIn,
    setState,
    setStatusMessage,
    setUserEmail,
    setUserId,
    shouldAutoFinalizeAfterSignIn,
    shouldBypassAuthGate,
  ])

  useEffect(() => {
    if (!client || !isNative()) {
      return
    }

    let isCancelled = false
    const syncStateAfterMagicLink = async () => {
      const sessionResult = await getCurrentSessionWithPolicy()
      if (isCancelled) {
        return
      }

      if (!sessionResult.ok) {
        setStatusMessage(getAuthNetworkErrorMessage(sessionResult.error))
        setState('awaitingMagicLink')
        return
      }

      const session = sessionResult.value
      if (!session?.user) {
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

      setDraft((current) => ({
        ...current,
        displayName:
          typeof session.user.user_metadata?.displayName === 'string'
            ? session.user.user_metadata.displayName
            : current.displayName,
        challengeLayout:
          session.user.user_metadata?.challengeLayout === 'compact'
            ? 'compact'
            : 'illustrative',
      }))
      const shouldFinalizeAfterSignIn =
        shouldAutoFinalizeAfterSignIn || loadAutoFinalizeAfterSignInFlag()
      if (shouldFinalizeAfterSignIn) {
        setShouldAutoFinalizeAfterSignIn(true)
        setState('loading')
        await completeOnboardingForUser(session.user.id, session.user.email ?? '')
        return
      }

      setState('onboarding')
    }

    const syncLaunchUrl = async () => {
      const launchUrl = await getLaunchUrl()
      if (!launchUrl || isCancelled) {
        return
      }

      const didApply = await applySessionFromUrl(launchUrl)
      if (!isCancelled && didApply) {
        setStatusMessage('Login completed. Continuing in-app...')
        await syncStateAfterMagicLink()
      }
    }

    void syncLaunchUrl()

    const dispose = addAppUrlOpenListener((openedUrl) => {
      void (async () => {
        const didApply = await applySessionFromUrl(openedUrl)
        if (didApply) {
          hapticSuccess()
          setStatusMessage('Login completed. Continuing in-app...')
          await syncStateAfterMagicLink()
        }
      })()
    })

    return () => {
      isCancelled = true
      dispose()
    }
  }, [
    applySessionFromUrl,
    client,
    completeOnboardingForUser,
    setDraft,
    setShouldAutoFinalizeAfterSignIn,
    setState,
    setStatusMessage,
    setUserEmail,
    setUserId,
    shouldAutoFinalizeAfterSignIn,
  ])
}
