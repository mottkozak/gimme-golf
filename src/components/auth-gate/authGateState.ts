import { readStorageItem, removeStorageItem, writeStorageItem } from '../../platform/storage.ts'

export type AuthGateState =
  | 'loading'
  | 'signIn'
  | 'awaitingMagicLink'
  | 'onboarding'
  | 'ready'
  | 'config'

const AUTO_FINALIZE_AFTER_SIGNIN_STORAGE_KEY = 'gimme-golf-auto-finalize-after-signin-v1'

export function loadAutoFinalizeAfterSignInFlag(): boolean {
  return readStorageItem(AUTO_FINALIZE_AFTER_SIGNIN_STORAGE_KEY) === '1'
}

export function saveAutoFinalizeAfterSignInFlag(value: boolean): void {
  if (value) {
    writeStorageItem(AUTO_FINALIZE_AFTER_SIGNIN_STORAGE_KEY, '1')
    return
  }

  removeStorageItem(AUTO_FINALIZE_AFTER_SIGNIN_STORAGE_KEY)
}

export function getEffectiveAuthGateState(params: {
  authIsEnabled: boolean
  authIsConfigured: boolean
  isBypassed: boolean
  shouldBypassAuthGate: boolean
  state: AuthGateState
}): AuthGateState {
  const { authIsEnabled, authIsConfigured, isBypassed, shouldBypassAuthGate, state } = params
  if (shouldBypassAuthGate) {
    return 'ready'
  }

  if (isBypassed) {
    return 'ready'
  }

  if (!authIsEnabled) {
    return state === 'ready' ? 'ready' : 'onboarding'
  }

  if (!authIsConfigured) {
    return 'config'
  }

  return state
}
