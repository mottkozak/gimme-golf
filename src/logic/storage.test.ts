/// <reference types="node" />

import assert from 'node:assert/strict'
import test from 'node:test'
import { createNewRoundState } from './roundLifecycle.ts'
import {
  ACTIVE_ROUND_STORAGE_BACKUP_KEY,
  ACTIVE_ROUND_STORAGE_JOURNAL_KEY,
  ACTIVE_ROUND_STORAGE_KEY,
  LEGACY_ACTIVE_ROUND_STORAGE_KEY,
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

function buildVersionedEnvelope(roundState: RoundState, savedAtMs: number): string {
  return JSON.stringify({
    schemaVersion: 2,
    roundState,
    savedAtMs,
    writeId: `${savedAtMs}-test-write-id`,
  })
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
  assert.equal(snapshot.recoveryReason, null)
})

test('storage: load migrates legacy v1 payload and keeps saved state', () => {
  installLocalStorageMock()
  clearRoundState()

  const roundState = createNewRoundState()
  localStorage.setItem(LEGACY_ACTIVE_ROUND_STORAGE_KEY, JSON.stringify(roundState))

  const snapshot = loadRoundStateSnapshot()
  assert.ok(snapshot.roundState)
  assert.equal(snapshot.recoveryReason, 'migrated_legacy_v1')
  assert.equal(loadRoundState()?.currentHoleIndex, 0)

  assert.equal(localStorage.getItem(LEGACY_ACTIVE_ROUND_STORAGE_KEY), null)
  assert.ok(localStorage.getItem(ACTIVE_ROUND_STORAGE_KEY))
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
    buildVersionedEnvelope(invalidRoundState, Date.now()),
  )

  const snapshot = loadRoundStateSnapshot()
  assert.equal(snapshot.roundState, null)
  assert.equal(snapshot.savedAtMs, null)
  assert.equal(localStorage.getItem(ACTIVE_ROUND_STORAGE_KEY), null)
})

test('storage: interrupted write is recovered from journal', () => {
  installLocalStorageMock()
  clearRoundState()

  const roundState = createNewRoundState()
  localStorage.setItem(ACTIVE_ROUND_STORAGE_KEY, '{"schemaVersion":2')
  localStorage.setItem(
    ACTIVE_ROUND_STORAGE_JOURNAL_KEY,
    buildVersionedEnvelope(roundState, Date.now() + 10),
  )

  const snapshot = loadRoundStateSnapshot()
  assert.ok(snapshot.roundState)
  assert.equal(snapshot.recoveryReason, 'recovered_from_journal')
  assert.ok(localStorage.getItem(ACTIVE_ROUND_STORAGE_KEY))
})

test('storage: backup is used when primary and journal are invalid', () => {
  installLocalStorageMock()
  clearRoundState()

  const roundState = createNewRoundState()
  localStorage.setItem(ACTIVE_ROUND_STORAGE_KEY, '{"schemaVersion":2')
  localStorage.setItem(ACTIVE_ROUND_STORAGE_JOURNAL_KEY, '{"schemaVersion":2')
  localStorage.setItem(
    ACTIVE_ROUND_STORAGE_BACKUP_KEY,
    buildVersionedEnvelope(roundState, Date.now() + 20),
  )

  const snapshot = loadRoundStateSnapshot()
  assert.ok(snapshot.roundState)
  assert.equal(snapshot.recoveryReason, 'recovered_from_backup')
  assert.ok(localStorage.getItem(ACTIVE_ROUND_STORAGE_KEY))
})
