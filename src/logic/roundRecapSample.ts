import { ALL_CARDS } from '../data/cards.ts'
import { applyRoundSetupDraft, createDefaultHoles } from './roundSetup.ts'
import { recalculateRoundTotals } from './scoring.ts'
import type { MissionStatus, Player, RoundState } from '../types/game.ts'
import type { PersonalCard } from '../types/cards.ts'

const SAMPLE_PLAYER_NAMES = ['Zach', 'Lizzy', 'Liam', 'Matt'] as const
const SAMPLE_STROKES_BY_HOLE: number[][] = [
  [4, 5, 4, 6],
  [5, 4, 4, 5],
  [3, 4, 3, 4],
  [6, 5, 4, 5],
  [4, 4, 5, 4],
  [5, 4, 3, 4],
  [3, 4, 4, 5],
  [6, 5, 4, 4],
  [5, 4, 4, 5],
]

const SAMPLE_MISSIONS_BY_HOLE: MissionStatus[][] = [
  ['success', 'failed', 'success', 'failed'],
  ['failed', 'success', 'success', 'success'],
  ['success', 'failed', 'success', 'failed'],
  ['failed', 'success', 'failed', 'success'],
  ['success', 'success', 'failed', 'success'],
  ['failed', 'success', 'success', 'success'],
  ['success', 'failed', 'success', 'failed'],
  ['failed', 'success', 'success', 'success'],
  ['success', 'failed', 'success', 'success'],
]

const SAMPLE_PUBLIC_DELTA_BY_HOLE: number[][] = [
  [0, 1, 0, -1],
  [1, 0, -1, 0],
  [0, -1, 1, 0],
  [1, 0, 0, -1],
  [0, 1, -1, 0],
  [1, 0, 0, -1],
  [0, 1, 0, -1],
  [1, -1, 0, 0],
  [0, 0, 1, -1],
]

function getFallbackPersonalCard(cardPool: PersonalCard[]): PersonalCard {
  const fallback = cardPool[0]
  if (!fallback) {
    throw new Error('Cannot build recap sample without personal cards.')
  }
  return fallback
}

function getCardByCode(cardPool: PersonalCard[], cardCode: string): PersonalCard {
  return cardPool.find((card) => card.code === cardCode) ?? getFallbackPersonalCard(cardPool)
}

export function buildSampleRoundRecapState(baseRoundState: RoundState): RoundState {
  const players: Player[] = SAMPLE_PLAYER_NAMES.map((name, index) => ({
    id: `sample-player-${index + 1}`,
    name,
    expectedScore18: 90 + index * 3,
  }))
  const holes = createDefaultHoles(9, 'standard')
  const setupState = applyRoundSetupDraft(baseRoundState, {
    config: {
      ...baseRoundState.config,
      holeCount: 9,
      courseStyle: 'standard',
      gameMode: 'cards',
      selectedPresetId: 'balanced',
      enabledPackIds: ['classic', 'hybrid', 'chaos', 'props'],
      toggles: {
        ...baseRoundState.config.toggles,
        momentumBonuses: true,
        enableChaosCards: true,
        enablePropCards: true,
      },
    },
    players,
    holes,
  })

  const personalCardPool = ALL_CARDS.filter((card): card is PersonalCard => !card.isPublic)
  const previewCardCycle = [
    getCardByCode(personalCardPool, 'SKL-001'),
    getCardByCode(personalCardPool, 'SKL-006'),
    getCardByCode(personalCardPool, 'SKL-002'),
    getCardByCode(personalCardPool, 'RSK-002'),
    getCardByCode(personalCardPool, 'COM-008'),
    getCardByCode(personalCardPool, 'HYB-001'),
    getCardByCode(personalCardPool, 'RSK-013'),
    getCardByCode(personalCardPool, 'COM-032'),
  ]

  const holeCards = setupState.holeCards.map((holeCardState, holeIndex) => {
    const dealtPersonalCardsByPlayerId = { ...holeCardState.dealtPersonalCardsByPlayerId }
    const selectedCardIdByPlayerId = { ...holeCardState.selectedCardIdByPlayerId }
    const personalCardOfferByPlayerId = { ...holeCardState.personalCardOfferByPlayerId }

    setupState.players.forEach((player, playerIndex) => {
      const selectedCard = previewCardCycle[(holeIndex + playerIndex) % previewCardCycle.length]
      const safeCard = previewCardCycle[(holeIndex + playerIndex + 1) % previewCardCycle.length]
      const hardCard = previewCardCycle[(holeIndex + playerIndex + 2) % previewCardCycle.length]

      dealtPersonalCardsByPlayerId[player.id] = [selectedCard, safeCard, hardCard]
      selectedCardIdByPlayerId[player.id] = selectedCard.id
      personalCardOfferByPlayerId[player.id] = {
        safeCardId: safeCard.id,
        hardCardId: hardCard.id,
      }
    })

    return {
      ...holeCardState,
      dealtPersonalCardsByPlayerId,
      selectedCardIdByPlayerId,
      personalCardOfferByPlayerId,
      publicCards: [],
    }
  })

  const holeResults = setupState.holeResults.map((holeResultState, holeIndex) => {
    const strokesByPlayerId = { ...holeResultState.strokesByPlayerId }
    const missionStatusByPlayerId = { ...holeResultState.missionStatusByPlayerId }
    const publicPointDeltaByPlayerId = { ...holeResultState.publicPointDeltaByPlayerId }

    setupState.players.forEach((player, playerIndex) => {
      strokesByPlayerId[player.id] = SAMPLE_STROKES_BY_HOLE[holeIndex]?.[playerIndex] ?? 4
      missionStatusByPlayerId[player.id] = SAMPLE_MISSIONS_BY_HOLE[holeIndex]?.[playerIndex] ?? 'success'
      publicPointDeltaByPlayerId[player.id] = SAMPLE_PUBLIC_DELTA_BY_HOLE[holeIndex]?.[playerIndex] ?? 0
    })

    return {
      ...holeResultState,
      strokesByPlayerId,
      missionStatusByPlayerId,
      publicPointDeltaByPlayerId,
      publicCardResolutionsByCardId: {},
      publicCardResolutionNotes: 'Sample recap data generated for preview.',
    }
  })

  const baseStartedAtMs = Date.now() - 1000 * 60 * 45
  const holeUxMetrics = setupState.holeUxMetrics.map((holeMetric, holeIndex) => {
    const startedAtMs = baseStartedAtMs + holeIndex * 1000 * 60 * 5
    const completedAtMs = startedAtMs + 1000 * 60 * 4
    return {
      ...holeMetric,
      startedAtMs,
      completedAtMs,
      durationMs: completedAtMs - startedAtMs,
      tapsToComplete: 6 + (holeIndex % 3),
    }
  })

  return recalculateRoundTotals({
    ...setupState,
    currentHoleIndex: setupState.holes.length - 1,
    holeCards,
    holeResults,
    holeUxMetrics,
  })
}
