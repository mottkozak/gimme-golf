/// <reference types="node" />

import assert from 'node:assert/strict'
import test from 'node:test'
import {
  clearOnboardingCompletionStatus,
  loadOnboardingCompletionStatus,
  saveOnboardingCompletionStatus,
  shouldShowOnboarding,
} from './onboarding.ts'

interface LocalStorageLike {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
  clear: () => void
}

function installLocalStorageMock(): void {
  const store = new Map<string, string>()

  const mockStorage: LocalStorageLike = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value)
    },
    removeItem: (key) => {
      store.delete(key)
    },
    clear: () => {
      store.clear()
    },
  }

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: mockStorage,
  })
}

test('onboarding shows automatically for first-run users and hides after finish', () => {
  installLocalStorageMock()
  clearOnboardingCompletionStatus()

  const initialStatus = loadOnboardingCompletionStatus()
  assert.equal(initialStatus, null)
  assert.equal(
    shouldShowOnboarding({ completionStatus: initialStatus, isReplayRequested: false }),
    true,
  )

  saveOnboardingCompletionStatus('completed')
  const completionStatus = loadOnboardingCompletionStatus()
  assert.equal(completionStatus, 'completed')
  assert.equal(
    shouldShowOnboarding({ completionStatus, isReplayRequested: false }),
    false,
  )
})

test('onboarding skip is persisted and prevents automatic re-open', () => {
  installLocalStorageMock()
  clearOnboardingCompletionStatus()

  saveOnboardingCompletionStatus('skipped')
  const completionStatus = loadOnboardingCompletionStatus()
  assert.equal(completionStatus, 'skipped')
  assert.equal(
    shouldShowOnboarding({ completionStatus, isReplayRequested: false }),
    false,
  )
})

test('replay request opens onboarding even after it was previously completed', () => {
  installLocalStorageMock()
  clearOnboardingCompletionStatus()
  saveOnboardingCompletionStatus('completed')

  const completionStatus = loadOnboardingCompletionStatus()
  assert.equal(completionStatus, 'completed')
  assert.equal(
    shouldShowOnboarding({ completionStatus, isReplayRequested: true }),
    true,
  )
})
