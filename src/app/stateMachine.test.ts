/// <reference types="node" />

import assert from 'node:assert/strict'
import test from 'node:test'
import { clearRoundState, loadRoundState, saveRoundState } from '../logic/storage.ts'
import { prepareCurrentHoleForPlay } from '../logic/holeFlow.ts'
import { markHoleCompletedAt } from '../logic/uxMetrics.ts'
import type { MissionStatus, RoundState } from '../types/game.ts'
import { createInitialAppState, reduceAppState } from './stateMachine.ts'

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

function completeCurrentHole(roundState: RoundState, completedAtMs: number): RoundState {
  const holeIndex = roundState.currentHoleIndex
  const players = roundState.players
  const holeResults = [...roundState.holeResults]

  const missionStatusByPlayerId: Record<string, MissionStatus> = Object.fromEntries(
    players.map((player) => {
      const dealtCards = roundState.holeCards[holeIndex]?.dealtPersonalCardsByPlayerId[player.id] ?? []
      return [player.id, dealtCards.length > 0 ? 'success' : 'pending']
    }),
  )

  holeResults[holeIndex] = {
    ...holeResults[holeIndex],
    strokesByPlayerId: Object.fromEntries(players.map((player) => [player.id, 4])),
    missionStatusByPlayerId,
  }

  return {
    ...roundState,
    holeResults,
    holeUxMetrics: markHoleCompletedAt(roundState.holeUxMetrics, holeIndex, completedAtMs),
  }
}

test('state machine flow: persistence, resume, and abandon', () => {
  installLocalStorageMock()
  clearRoundState()

  let appState = createInitialAppState(loadRoundState())
  appState = reduceAppState(appState, {
    type: 'update_round_state',
    updater: (currentState) => prepareCurrentHoleForPlay(currentState, 1_000),
  })

  assert.equal(appState.shouldPersistRoundState, true)

  saveRoundState(appState.roundState)
  appState = reduceAppState(appState, { type: 'mark_persisted' })
  assert.equal(appState.shouldPersistRoundState, false)

  const savedRoundState = loadRoundState()
  assert.ok(savedRoundState)

  appState = reduceAppState(appState, { type: 'resume_saved_round', savedRoundState })
  assert.equal(appState.hasSavedRound, true)
  assert.equal(appState.activeScreen, 'holePlay')

  clearRoundState()
  appState = reduceAppState(appState, { type: 'abandon_round' })

  assert.equal(loadRoundState(), null)
  assert.equal(appState.activeScreen, 'home')
  assert.equal(appState.hasSavedRound, false)
  assert.equal(appState.shouldPersistRoundState, false)
})

test('state machine flow: multi-hole run progression', () => {
  installLocalStorageMock()

  let appState = createInitialAppState(null)
  appState = reduceAppState(appState, { type: 'navigate', screen: 'roundSetup' })
  appState = reduceAppState(appState, { type: 'navigate', screen: 'holePlay' })
  assert.equal(appState.activeScreen, 'holePlay')

  appState = reduceAppState(appState, {
    type: 'update_round_state',
    updater: (currentState) => prepareCurrentHoleForPlay(currentState, 1_000),
  })
  appState = reduceAppState(appState, {
    type: 'update_round_state',
    updater: (currentState) => completeCurrentHole(currentState, 2_000),
  })
  appState = reduceAppState(appState, { type: 'navigate', screen: 'holeResults' })
  appState = reduceAppState(appState, { type: 'navigate', screen: 'leaderboard' })
  appState = reduceAppState(appState, {
    type: 'update_round_state',
    updater: (currentState) => ({
      ...currentState,
      currentHoleIndex: currentState.currentHoleIndex + 1,
    }),
  })
  appState = reduceAppState(appState, { type: 'navigate', screen: 'holePlay' })

  appState = reduceAppState(appState, {
    type: 'update_round_state',
    updater: (currentState) => prepareCurrentHoleForPlay(currentState, 3_000),
  })
  appState = reduceAppState(appState, {
    type: 'update_round_state',
    updater: (currentState) => completeCurrentHole(currentState, 4_000),
  })
  appState = reduceAppState(appState, { type: 'navigate', screen: 'holeResults' })
  appState = reduceAppState(appState, { type: 'navigate', screen: 'leaderboard' })

  assert.equal(appState.roundState.currentHoleIndex, 1)
  assert.equal(appState.roundState.holeUxMetrics[0].durationMs, 1_000)
  assert.equal(appState.roundState.holeUxMetrics[1].durationMs, 1_000)
  assert.equal(appState.roundState.holeUxMetrics[0].startedAtMs, 1_000)
  assert.equal(appState.roundState.holeUxMetrics[1].startedAtMs, 3_000)
})
