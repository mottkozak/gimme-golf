/// <reference types="node" />

import assert from 'node:assert/strict'
import test from 'node:test'
import type { RoundState } from '../types/game.ts'
import {
  buildRoundRecapPayload,
  formatRoundRecapText,
} from './roundRecapShare.ts'

function createRoundStateFixture(): RoundState {
  return {
    config: {
      holeCount: 9,
      courseStyle: 'standard',
      gameMode: 'cards',
      selectedPresetId: 'custom',
      customModeName: 'Custom',
      enabledPackIds: ['classic'],
      featuredHoles: {
        enabled: false,
        frequency: 'normal',
        assignmentMode: 'auto',
      },
      toggles: {
        dynamicDifficulty: true,
        catchUpMode: true,
        momentumBonuses: true,
        drawTwoPickOne: true,
        autoAssignOne: false,
        enableChaosCards: false,
        enablePropCards: false,
      },
    },
    players: [
      { id: 'p1', name: 'Alex', expectedScore18: 90 },
      { id: 'p2', name: '  ', expectedScore18: 95 },
      { id: 'p3', name: 'Casey', expectedScore18: 92 },
      { id: 'p4', name: 'Jordan', expectedScore18: 89 },
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
    holeUxMetrics: [],
    deckMemory: {
      usedPersonalCardIds: [],
      usedPublicCardIds: [],
    },
    totalsByPlayerId: {
      p1: { realScore: 72, gamePoints: 5, adjustedScore: 67 },
      p2: { realScore: 70, gamePoints: 9, adjustedScore: 67 },
      p3: { realScore: 74, gamePoints: -1, adjustedScore: 75 },
      p4: { realScore: 76, gamePoints: 2, adjustedScore: 78 },
    },
  }
}

test('buildRoundRecapPayload returns winner names and top 3 leaderboard rows', () => {
  const roundState = createRoundStateFixture()

  const recapPayload = buildRoundRecapPayload(roundState)

  assert.equal(recapPayload.winnerNames, 'Player 2 & Alex')
  assert.equal(recapPayload.shareTheme, 'champion')
  assert.equal(recapPayload.themeTitle, 'Champion Recap')
  assert.equal(recapPayload.holeCount, 9)
  assert.equal(recapPayload.gameModeLabel, 'Cards')
  assert.equal(recapPayload.bestMomentLine.includes('Winner spotlight'), true)
  assert.equal(recapPayload.topLeaderboardRows.length, 3)
  assert.deepEqual(
    recapPayload.topLeaderboardRows.map((row) => row.playerName),
    ['Player 2', 'Alex', 'Casey'],
  )
  assert.deepEqual(
    recapPayload.topLeaderboardRows.map((row) => row.rank),
    [1, 2, 3],
  )
})

test('formatRoundRecapText serializes recap payload with URL and signed points', () => {
  const recapPayload = buildRoundRecapPayload(createRoundStateFixture())

  const recapText = formatRoundRecapText(recapPayload, {
    ios: 'https://apps.apple.com/app/id1234567890',
    android: 'https://play.google.com/store/apps/details?id=com.example.gimmegolf',
  })

  assert.equal(recapText.includes('Gimme Golf Champion Recap'), true)
  assert.equal(recapText.includes('Podium Winner: Player 2 & Alex'), true)
  assert.equal(recapText.includes('Round Moment: Winner spotlight: Player 2 & Alex'), true)
  assert.equal(recapText.includes('Format: Cards | Holes: 9'), true)
  assert.equal(recapText.includes('1. Player 2 - Adjusted 67 | Points +9'), true)
  assert.equal(recapText.includes('3. Casey - Adjusted 75 | Points -1'), true)
  assert.equal(recapText.includes('Download Gimme Golf:'), true)
  assert.equal(recapText.includes('App Store (iOS): https://apps.apple.com/app/id1234567890'), true)
  assert.equal(
    recapText.includes('Google Play (Android): https://play.google.com/store/apps/details?id=com.example.gimmegolf'),
    true,
  )
})

test('buildRoundRecapPayload supports chaos and comeback themes', () => {
  const roundState = createRoundStateFixture()

  const chaosPayload = buildRoundRecapPayload(roundState, { theme: 'chaos' })
  const comebackPayload = buildRoundRecapPayload(roundState, { theme: 'comeback' })

  assert.equal(chaosPayload.shareTheme, 'chaos')
  assert.equal(chaosPayload.themeTitle, 'Chaos Recap')
  assert.equal(chaosPayload.bestMomentLine.includes('chaos'), true)
  assert.equal(comebackPayload.shareTheme, 'comeback')
  assert.equal(comebackPayload.themeTitle, 'Comeback Recap')
  assert.equal(comebackPayload.bestMomentLine.length > 0, true)
})
