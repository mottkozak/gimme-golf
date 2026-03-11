/// <reference types="node" />

import assert from 'node:assert/strict'
import test from 'node:test'
import type { LocalPlayerProfile } from './localIdentity.ts'
import {
  clearLocalIdentityState,
  getPlayerIdentityBadge,
  getPlayerProfileByName,
  loadLocalIdentityState,
  recordCompletedRoundIdentity,
} from './localIdentity.ts'
import type { RoundState } from '../types/game.ts'

interface LocalStorageLike {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
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
  }

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: mockStorage,
  })
}

function createRoundStateFixture(completedAtMs: number): RoundState {
  return {
    config: {
      holeCount: 9,
      courseStyle: 'standard',
      gameMode: 'cards',
      selectedPresetId: 'casual',
      customModeName: 'Quick Start',
      enabledPackIds: ['classic'],
      featuredHoles: {
        enabled: false,
        frequency: 'low',
        assignmentMode: 'auto',
      },
      toggles: {
        dynamicDifficulty: true,
        momentumBonuses: false,
        drawTwoPickOne: false,
        autoAssignOne: true,
        enableChaosCards: false,
        enablePropCards: false,
      },
    },
    players: [
      { id: 'p1', name: 'Alex', expectedScore18: 90 },
      { id: 'p2', name: 'Bailey', expectedScore18: 94 },
      { id: 'p3', name: 'Casey', expectedScore18: 98 },
    ],
    holes: Array.from({ length: 9 }, (_, index) => ({
      holeNumber: index + 1,
      par: 4,
      tags: [],
      featuredHoleType: null,
    })),
    currentHoleIndex: 8,
    holeCards: [],
    holePowerUps: [],
    holeResults: [],
    holeUxMetrics: Array.from({ length: 9 }, (_, index) => ({
      holeNumber: index + 1,
      startedAtMs: completedAtMs - (9 - index) * 1_000,
      completedAtMs: completedAtMs - (8 - index) * 1_000,
      durationMs: 1_000,
      tapsToComplete: 8,
      publicResolutionStartedAtMs: null,
      publicResolutionCompletedAtMs: null,
      publicResolutionDurationMs: null,
    })),
    deckMemory: {
      usedPersonalCardIds: [],
      usedPublicCardIds: [],
    },
    totalsByPlayerId: {
      p1: { realScore: 71, gamePoints: 5, adjustedScore: 66 },
      p2: { realScore: 73, gamePoints: 4, adjustedScore: 69 },
      p3: { realScore: 77, gamePoints: 5, adjustedScore: 72 },
    },
  }
}

test('local identity records recent round history and saved player names', () => {
  installLocalStorageMock()
  clearLocalIdentityState()

  const snapshot = recordCompletedRoundIdentity(createRoundStateFixture(1_701_000_000_000))

  assert.equal(snapshot.roundHistory.length, 1)
  assert.equal(snapshot.roundHistory[0]?.winnerNames, 'Alex')
  assert.deepEqual(snapshot.roundHistory[0]?.playerNames, ['Alex', 'Bailey', 'Casey'])
  assert.deepEqual(snapshot.recentPlayerNames.slice(0, 3), ['Alex', 'Bailey', 'Casey'])

  const loadedSnapshot = loadLocalIdentityState()
  assert.equal(loadedSnapshot.roundHistory.length, 1)
  assert.deepEqual(loadedSnapshot.recentPlayerNames.slice(0, 3), ['Alex', 'Bailey', 'Casey'])
})

test('local identity dedupes repeat writes for the same completed round', () => {
  installLocalStorageMock()
  clearLocalIdentityState()

  recordCompletedRoundIdentity(createRoundStateFixture(1_701_000_000_000))
  const snapshot = recordCompletedRoundIdentity(createRoundStateFixture(1_701_000_000_000))

  assert.equal(snapshot.roundHistory.length, 1)
  assert.equal(getPlayerProfileByName(snapshot, 'Alex')?.roundsPlayed, 1)
})

test('player identity badge prioritizes award streaks and then consistency', () => {
  const riskTakerProfile: LocalPlayerProfile = {
    playerKey: 'alex',
    displayName: 'Alex',
    roundsPlayed: 4,
    wins: 1,
    lastPlayedAtMs: 1_701_000_000_000,
    awardWinsById: {
      riskTaker: 3,
    },
  }

  const riskTakerBadge = getPlayerIdentityBadge(riskTakerProfile)
  assert.equal(riskTakerBadge.label, 'Risk Taker')
  assert.equal(riskTakerBadge.detail, 'Risk Taker x3')

  const closerProfile: LocalPlayerProfile = {
    playerKey: 'bailey',
    displayName: 'Bailey',
    roundsPlayed: 5,
    wins: 3,
    lastPlayedAtMs: 1_701_000_000_000,
    awardWinsById: {},
  }

  const closerBadge = getPlayerIdentityBadge(closerProfile)
  assert.equal(closerBadge.label, 'Closer')
  assert.equal(closerBadge.detail, '3 wins in 5 rounds')
})
