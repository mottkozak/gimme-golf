/// <reference types="node" />

import assert from 'node:assert/strict'
import test from 'node:test'
import {
  clearEntitlementState,
  getPackEntitlement,
  grantPremiumTier,
  isPackUnlocked,
  setPremiumPacksActive,
} from './entitlements.ts'

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

test('premium packs remain unlocked while premium mode is inactive', () => {
  installLocalStorageMock()
  clearEntitlementState()

  assert.equal(isPackUnlocked('curse', 'future-expansion'), true)
  assert.equal(getPackEntitlement('style', 'future-expansion').isUnlocked, true)
})

test('premium mode locks premium tiers unless granted', () => {
  installLocalStorageMock()
  clearEntitlementState()
  setPremiumPacksActive(true)

  assert.equal(isPackUnlocked('novelty', 'future-expansion'), false)

  grantPremiumTier('future-expansion')
  assert.equal(isPackUnlocked('novelty', 'future-expansion'), true)
})

test('non-premium packs always remain unlocked', () => {
  installLocalStorageMock()
  clearEntitlementState()
  setPremiumPacksActive(true)

  assert.equal(isPackUnlocked('classic', null), true)
  assert.equal(isPackUnlocked('chaos', null), true)
})
