/// <reference types="node" />

import assert from 'node:assert/strict'
import test from 'node:test'
import type { RoundState } from '../types/game.ts'
import { buildRoundRecapViewModel } from './roundRecapViewModel.ts'

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
        enableChaosCards: true,
        enablePropCards: false,
      },
    },
    players: [
      { id: 'p1', name: 'Alex', expectedScore18: 90 },
      { id: 'p2', name: 'Casey', expectedScore18: 95 },
      { id: 'p3', name: 'Jordan', expectedScore18: 89 },
    ],
    holes: Array.from({ length: 9 }, (_, index) => ({
      holeNumber: index + 1,
      par: 4,
      tags: [],
      featuredHoleType: index === 3 ? 'chaos' : null,
    })),
    currentHoleIndex: 8,
    holeCards: Array.from({ length: 9 }, (_, index) => ({
      holeNumber: index + 1,
      dealtPersonalCardsByPlayerId: {},
      selectedCardIdByPlayerId: {},
      personalCardOfferByPlayerId: {},
      publicCards: [],
    })),
    holePowerUps: [],
    holeResults: Array.from({ length: 9 }, (_, index) => ({
      holeNumber: index + 1,
      strokesByPlayerId: {
        p1: 4,
        p2: 5,
        p3: 4,
      },
      missionStatusByPlayerId: {
        p1: 'success',
        p2: index % 2 === 0 ? 'failed' : 'success',
        p3: 'pending',
      },
      publicPointDeltaByPlayerId: {
        p1: 1,
        p2: -1,
        p3: 0,
      },
      publicCardResolutionsByCardId: {},
      publicCardResolutionNotes: '',
    })),
    holeUxMetrics: [],
    deckMemory: {
      usedPersonalCardIds: [],
      usedPublicCardIds: [],
    },
    totalsByPlayerId: {
      p1: { realScore: 73, gamePoints: 7, adjustedScore: 66 },
      p2: { realScore: 75, gamePoints: 2, adjustedScore: 73 },
      p3: { realScore: 72, gamePoints: 0, adjustedScore: 72 },
    },
  }
}

test('buildRoundRecapViewModel derives five recap sections', () => {
  const viewModel = buildRoundRecapViewModel(createRoundStateFixture())

  assert.equal(viewModel.winnerHero.title, 'Alex Wins the Round')
  assert.equal(viewModel.winnerHero.scoreboardRows.length, 3)
  assert.equal(viewModel.progression.lines.length, 3)
  assert.equal(viewModel.progression.callouts.length <= 2, true)
  assert.equal(viewModel.archetypes.length, 3)
  assert.equal(viewModel.awards.cards.length >= 3, true)
  assert.equal(viewModel.awards.cards.length <= 4, true)
})

test('buildRoundRecapViewModel winner is all players tied on adjusted score', () => {
  const roundState = createRoundStateFixture()
  roundState.totalsByPlayerId = {
    p1: { realScore: 73, gamePoints: 2, adjustedScore: 66 },
    p2: { realScore: 73, gamePoints: 5, adjustedScore: 66 },
    p3: { realScore: 74, gamePoints: 9, adjustedScore: 66 },
  }

  const viewModel = buildRoundRecapViewModel(roundState)
  assert.equal(viewModel.winnerHero.title, 'Casey, Alex & Jordan Win the Round')
  assert.deepEqual(viewModel.adjustedWinnerPlayerIds.sort(), ['p1', 'p2', 'p3'].sort())
})

test('buildRoundRecapViewModel winner prioritizes adjusted score over raw game points', () => {
  const roundState = createRoundStateFixture()
  roundState.totalsByPlayerId = {
    p1: { realScore: 70, gamePoints: 1, adjustedScore: 69 },
    p2: { realScore: 71, gamePoints: 9, adjustedScore: 80 },
    p3: { realScore: 72, gamePoints: 4, adjustedScore: 76 },
  }

  const viewModel = buildRoundRecapViewModel(roundState)
  assert.equal(viewModel.winnerHero.title, 'Alex Wins the Round')
})

test('buildRoundRecapViewModel uses real score winners in power ups mode', () => {
  const roundState = createRoundStateFixture()
  roundState.config.gameMode = 'powerUps'
  roundState.totalsByPlayerId = {
    p1: { realScore: 75, gamePoints: 9, adjustedScore: 66 },
    p2: { realScore: 74, gamePoints: 14, adjustedScore: 60 },
    p3: { realScore: 73, gamePoints: 0, adjustedScore: 73 },
  }

  const viewModel = buildRoundRecapViewModel(roundState)
  assert.equal(viewModel.winnerHero.title, 'Jordan Wins the Round')
  assert.deepEqual(viewModel.adjustedWinnerPlayerIds, ['p3'])
})
