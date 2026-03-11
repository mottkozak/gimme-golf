/// <reference types="node" />

import assert from 'node:assert/strict'
import test from 'node:test'
import type { AnyAnalyticsEvent } from './analytics.ts'
import {
  buildRoundAnalyticsContext,
  resetAnalyticsProvider,
  setAnalyticsProvider,
  trackAnalyticsEvent,
} from './analytics.ts'
import type { RoundState } from '../types/game.ts'

function createRoundStateFixture(): RoundState {
  return {
    config: {
      holeCount: 9,
      courseStyle: 'standard',
      gameMode: 'cards',
      selectedPresetId: 'casual',
      customModeName: 'Quick Start',
      enabledPackIds: ['classic', 'chaos'],
      featuredHoles: {
        enabled: true,
        frequency: 'low',
        assignmentMode: 'auto',
      },
      toggles: {
        dynamicDifficulty: true,
        momentumBonuses: false,
        drawTwoPickOne: false,
        autoAssignOne: true,
        enableChaosCards: true,
        enablePropCards: false,
      },
    },
    players: [
      { id: 'p1', name: 'Alex', expectedScore18: 90 },
      { id: 'p2', name: 'Casey', expectedScore18: 95 },
    ],
    holes: Array.from({ length: 9 }, (_, index) => ({
      holeNumber: index + 1,
      par: 4,
      tags: [],
      featuredHoleType: null,
    })),
    currentHoleIndex: 3,
    holeCards: [],
    holePowerUps: [],
    holeResults: [],
    holeUxMetrics: [],
    deckMemory: {
      usedPersonalCardIds: [],
      usedPublicCardIds: [],
    },
    totalsByPlayerId: {
      p1: { realScore: 0, gamePoints: 0, adjustedScore: 0 },
      p2: { realScore: 0, gamePoints: 0, adjustedScore: 0 },
    },
  }
}

test('analytics context includes round metadata needed for funnel analysis', () => {
  const roundContext = buildRoundAnalyticsContext(createRoundStateFixture())

  assert.equal(roundContext.selectedMode, 'casual')
  assert.equal(roundContext.gameMode, 'cards')
  assert.equal(roundContext.playerCount, 2)
  assert.equal(roundContext.holeCount, 9)
  assert.equal(roundContext.currentHoleNumber, 4)
  assert.equal(roundContext.dynamicDifficulty, true)
  assert.equal(roundContext.chaosEnabled, true)
  assert.equal(roundContext.propsEnabled, false)
})

test('analytics provider receives typed events and can be swapped', () => {
  const capturedEvents: AnyAnalyticsEvent[] = []

  setAnalyticsProvider({
    track: (event) => {
      capturedEvents.push(event)
    },
  })

  trackAnalyticsEvent('home_action', {
    action: 'start_quick_round',
    hasSavedRound: false,
    currentScreen: 'home',
  })

  assert.equal(capturedEvents.length, 1)
  const [firstEvent] = capturedEvents
  assert.equal(firstEvent?.name, 'home_action')
  assert.ok(firstEvent && firstEvent.name === 'home_action')
  assert.equal(firstEvent.payload.action, 'start_quick_round')

  resetAnalyticsProvider()
})
