/// <reference types="node" />

import assert from 'node:assert/strict'
import test from 'node:test'
import { createNewRoundState } from './roundLifecycle.ts'
import { registerRoundLifecyclePersistence } from './lifecyclePersistence.ts'
import {
  ACTIVE_ROUND_STORAGE_JOURNAL_KEY,
  ACTIVE_ROUND_STORAGE_KEY,
  clearRoundState,
  loadRoundStateSnapshot,
  saveRoundState,
} from './storage.ts'

interface LocalStorageLike {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
  clear: () => void
}

type Listener = () => void

class WindowStub {
  document: { visibilityState: string } = { visibilityState: 'visible' }
  private listenersByEventName = new Map<string, Set<Listener>>()

  addEventListener(eventName: string, listener: Listener) {
    const listeners = this.listenersByEventName.get(eventName) ?? new Set<Listener>()
    listeners.add(listener)
    this.listenersByEventName.set(eventName, listeners)
  }

  removeEventListener(eventName: string, listener: Listener) {
    const listeners = this.listenersByEventName.get(eventName)
    if (!listeners) {
      return
    }

    listeners.delete(listener)
    if (listeners.size === 0) {
      this.listenersByEventName.delete(eventName)
    }
  }

  dispatch(eventName: string) {
    const listeners = this.listenersByEventName.get(eventName)
    if (!listeners) {
      return
    }

    for (const listener of listeners) {
      listener()
    }
  }
}

function installLocalStorageMockWithStore(store = new Map<string, string>()): LocalStorageLike {
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

  return mockStorage
}

function installNavigatorOnlineState(isOnline: boolean): () => void {
  const originalNavigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      onLine: isOnline,
    },
  })

  return () => {
    if (originalNavigatorDescriptor) {
      Object.defineProperty(globalThis, 'navigator', originalNavigatorDescriptor)
      return
    }

    Reflect.deleteProperty(globalThis, 'navigator')
  }
}

function buildVersionedEnvelope(roundState: ReturnType<typeof createNewRoundState>, savedAtMs: number): string {
  return JSON.stringify({
    schemaVersion: 2,
    roundState,
    savedAtMs,
    writeId: `${savedAtMs}-chaos`,
  })
}

test('chaos lifecycle: background persistence keeps latest round snapshot', () => {
  installLocalStorageMockWithStore()
  clearRoundState()

  const roundState = createNewRoundState()
  roundState.currentHoleIndex = 3

  const windowStub = new WindowStub()
  registerRoundLifecyclePersistence({
    windowObject: windowStub,
    hasSavedRound: () => true,
    persistRoundState: () => {
      saveRoundState(roundState)
    },
  })

  windowStub.document.visibilityState = 'hidden'
  windowStub.dispatch('visibilitychange')

  const snapshot = loadRoundStateSnapshot()
  assert.equal(snapshot.roundState?.currentHoleIndex, 3)
  assert.equal(snapshot.recoveryReason, null)
})

test('chaos lifecycle: terminate during write recovers from journal without data loss', () => {
  installLocalStorageMockWithStore()
  clearRoundState()

  const roundState = createNewRoundState()
  roundState.currentHoleIndex = 4
  localStorage.setItem(ACTIVE_ROUND_STORAGE_KEY, '{"schemaVersion":2')
  localStorage.setItem(
    ACTIVE_ROUND_STORAGE_JOURNAL_KEY,
    buildVersionedEnvelope(roundState, Date.now() + 10),
  )

  const snapshot = loadRoundStateSnapshot()
  assert.equal(snapshot.roundState?.currentHoleIndex, 4)
  assert.equal(snapshot.recoveryReason, 'recovered_from_journal')
})

test('chaos lifecycle: low-memory reopen restores persisted round from durable storage', () => {
  const store = new Map<string, string>()
  installLocalStorageMockWithStore(store)
  clearRoundState()

  const roundState = createNewRoundState()
  roundState.currentHoleIndex = 5
  const savedAtMs = saveRoundState(roundState)

  // Simulate process recreation using same durable key/value store.
  installLocalStorageMockWithStore(store)

  const snapshot = loadRoundStateSnapshot()
  assert.equal(snapshot.roundState?.currentHoleIndex, 5)
  assert.equal(snapshot.savedAtMs, savedAtMs)
})

test('chaos lifecycle: offline resume keeps saved round available', () => {
  installLocalStorageMockWithStore()
  clearRoundState()

  const roundState = createNewRoundState()
  roundState.currentHoleIndex = 2
  saveRoundState(roundState)

  const restoreNavigator = installNavigatorOnlineState(false)

  const snapshot = loadRoundStateSnapshot()
  assert.equal(snapshot.roundState?.currentHoleIndex, 2)

  restoreNavigator()
})
