/// <reference types="node" />

import assert from 'node:assert/strict'
import test from 'node:test'
import { createNewRoundState } from './roundLifecycle.ts'
import {
  ACTIVE_ROUND_STORAGE_KEY,
  clearRoundState,
  loadRoundState,
  loadRoundStateSnapshot,
  saveRoundState,
} from './storage.ts'
import type { RoundState } from '../types/game.ts'

interface LocalStorageLike {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
  clear: () => void
}

function installLocalStorageMock(): LocalStorageLike {
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

  return mockStorage
}

test('storage: save and load snapshot keeps round state and save timestamp', () => {
  installLocalStorageMock()
  clearRoundState()

  const roundState = createNewRoundState()
  const savedAtMs = saveRoundState(roundState)
  assert.equal(typeof savedAtMs, 'number')

  const snapshot = loadRoundStateSnapshot()
  assert.ok(snapshot.roundState)
  assert.equal(snapshot.savedAtMs, savedAtMs)
  assert.equal(snapshot.roundState?.holes.length, roundState.holes.length)
})

test('storage: load supports legacy raw round-state payload', () => {
  installLocalStorageMock()
  clearRoundState()

  const roundState = createNewRoundState()
  localStorage.setItem(ACTIVE_ROUND_STORAGE_KEY, JSON.stringify(roundState))

  const snapshot = loadRoundStateSnapshot()
  assert.ok(snapshot.roundState)
  assert.equal(snapshot.savedAtMs, null)
  assert.equal(loadRoundState()?.currentHoleIndex, 0)
})

test('storage: invalid structural data is cleared', () => {
  installLocalStorageMock()
  clearRoundState()

  const invalidRoundState = {
    ...createNewRoundState(),
    currentHoleIndex: 999,
  } satisfies RoundState

  localStorage.setItem(
    ACTIVE_ROUND_STORAGE_KEY,
    JSON.stringify({
      roundState: invalidRoundState,
      savedAtMs: Date.now(),
    }),
  )

  const snapshot = loadRoundStateSnapshot()
  assert.equal(snapshot.roundState, null)
  assert.equal(snapshot.savedAtMs, null)
  assert.equal(localStorage.getItem(ACTIVE_ROUND_STORAGE_KEY), null)
})

test('storage: malformed JSON is cleared safely', () => {
  installLocalStorageMock()
  clearRoundState()

  localStorage.setItem(ACTIVE_ROUND_STORAGE_KEY, '{"roundState":')
  const snapshot = loadRoundStateSnapshot()

  assert.equal(snapshot.roundState, null)
  assert.equal(snapshot.savedAtMs, null)
  assert.equal(localStorage.getItem(ACTIVE_ROUND_STORAGE_KEY), null)
})

