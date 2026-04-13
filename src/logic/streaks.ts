import type { PersonalCard } from '../types/cards.ts'
import type {
  FeaturedHoleType,
  HoleCardsState,
  HoleDefinition,
  HoleResultState,
  MissionStatus,
  Player,
} from '../types/game.ts'
import {
  getMomentumTierForStreak,
  getMomentumTierLabel,
  MOMENTUM_RULES,
  POINT_BALANCE_RULES,
  type MomentumTier,
} from './gameBalance.ts'
import {
  applyFeaturedMissionPoints,
  FEATURED_HOLE_BALANCE,
  getRivalryPair,
  resolveRivalryWinner,
} from './featuredHoles.ts'
import { createRefMemoizedSelector } from './selectors.ts'

export interface HolePointBreakdown {
  missionPoints: number
  baseMissionPoints: number
  selectedCardPoints: number
  featuredBonusPoints: number
  featuredHoleType: FeaturedHoleType | null
  momentumBonus: number
  rivalryBonus: number
  rivalryOpponentPlayerId: string | null
  rivalryWon: boolean | null
  publicDelta: number
  balanceCapAdjustment: number
  total: number
  selectedCardId: string | null
  selectedCardCode: string | null
  selectedCardName: string | null
  selectedCardDescription: string | null
  selectedCardType: PersonalCard['cardType'] | null
  selectedCardDifficulty: PersonalCard['difficulty'] | null
  streakBefore: number
  streakAfter: number
  momentumTierBefore: MomentumTier
  momentumTierAfter: MomentumTier
  shieldApplied: boolean
  missionStatus: MissionStatus
}

export interface MomentumState {
  streak: number
  tier: MomentumTier
  tierLabel: string
}

function getSelectedCardForPlayer(
  holeCards: HoleCardsState | undefined,
  playerId: string,
): PersonalCard | undefined {
  if (!holeCards) {
    return undefined
  }

  const selectedCardId = holeCards.selectedCardIdByPlayerId[playerId]
  if (!selectedCardId) {
    return undefined
  }

  const dealtCards = holeCards.dealtPersonalCardsByPlayerId[playerId] ?? []
  return dealtCards.find((card) => card.id === selectedCardId)
}

function getMissionStatusForPlayer(
  holeResult: HoleResultState | undefined,
  playerId: string,
): MissionStatus {
  return holeResult?.missionStatusByPlayerId[playerId] ?? 'pending'
}

export function createEmptyHolePointBreakdown(): HolePointBreakdown {
  return {
    missionPoints: 0,
    baseMissionPoints: 0,
    selectedCardPoints: 0,
    featuredBonusPoints: 0,
    featuredHoleType: null,
    momentumBonus: 0,
    rivalryBonus: 0,
    rivalryOpponentPlayerId: null,
    rivalryWon: null,
    publicDelta: 0,
    balanceCapAdjustment: 0,
    total: 0,
    selectedCardId: null,
    selectedCardCode: null,
    selectedCardName: null,
    selectedCardDescription: null,
    selectedCardType: null,
    selectedCardDifficulty: null,
    streakBefore: 0,
    streakAfter: 0,
    momentumTierBefore: 'none',
    momentumTierAfter: 'none',
    shieldApplied: false,
    missionStatus: 'pending',
  }
}

export function clearHolePointBreakdownCache(): void {
  holePointBreakdownsByPlayerIdSelector.clear()
}

function getLowestGamePointTotal(gamePointsByPlayerId: Record<string, number>): number {
  return Object.values(gamePointsByPlayerId).reduce(
    (lowest, total) => Math.min(lowest, total),
    Number.POSITIVE_INFINITY,
  )
}

function clamp(value: number, minValue: number, maxValue: number): number {
  return Math.max(minValue, Math.min(maxValue, value))
}

function computeHolePointBreakdownsByPlayerId(
  players: Player[],
  holes: HoleDefinition[],
  holeCards: HoleCardsState[],
  holeResults: HoleResultState[],
  momentumEnabled: boolean,
): Record<string, HolePointBreakdown[]> {
  const currentStreakByPlayerId = Object.fromEntries(players.map((player) => [player.id, 0]))
  const gamePointsBeforeHoleByPlayerId = Object.fromEntries(players.map((player) => [player.id, 0]))
  const breakdownsByPlayerId: Record<string, HolePointBreakdown[]> = Object.fromEntries(
    players.map((player) => [player.id, []]),
  )

  const maxHoles = Math.max(holeCards.length, holeResults.length)

  for (let holeIndex = 0; holeIndex < maxHoles; holeIndex += 1) {
    const hole = holes[holeIndex]
    const featuredHoleType = hole?.featuredHoleType ?? null
    const holeCardsState = holeCards[holeIndex]
    const holeResultState = holeResults[holeIndex]
    const lowestBeforeHole = getLowestGamePointTotal(gamePointsBeforeHoleByPlayerId)
    const pendingTotalsByPlayerId: Record<string, number> = {}

    for (const player of players) {
      const selectedCard = getSelectedCardForPlayer(holeCardsState, player.id)
      const missionStatus = getMissionStatusForPlayer(holeResultState, player.id)
      const streakBefore = momentumEnabled ? currentStreakByPlayerId[player.id] : 0
      const momentumTierBefore = momentumEnabled ? getMomentumTierForStreak(streakBefore) : 'none'
      const publicDelta = holeResultState?.publicPointDeltaByPlayerId[player.id] ?? 0
      const hasSelectedCard = Boolean(selectedCard)
      const isMissionSuccess = hasSelectedCard && missionStatus === 'success'
      const isMissionFailure = hasSelectedCard && missionStatus === 'failed'
      const shieldApplied =
        momentumEnabled &&
        isMissionSuccess &&
        MOMENTUM_RULES.comebackShield.enabled &&
        gamePointsBeforeHoleByPlayerId[player.id] === lowestBeforeHole
      const selectedCardPoints = selectedCard?.points ?? 0
      const baseMissionPoints = isMissionSuccess ? selectedCardPoints : 0
      const featuredMission = applyFeaturedMissionPoints(baseMissionPoints, featuredHoleType)
      const missionPoints = featuredMission.missionPoints
      const momentumBonus = isMissionSuccess
        ? MOMENTUM_RULES.bonusByTier[momentumTierBefore]
        : 0
      let streakAfter = streakBefore

      if (momentumEnabled) {
        if (isMissionFailure) {
          streakAfter = 0
        } else if (isMissionSuccess) {
          const successStep =
            1 + (shieldApplied ? MOMENTUM_RULES.comebackShield.extraSuccessCount : 0)
          if (momentumTierBefore === 'inferno' && momentumBonus > 0) {
            streakAfter = MOMENTUM_RULES.infernoPostPayoutStreak
          } else {
            streakAfter = streakBefore + successStep
          }
        }
      } else {
        streakAfter = 0
      }

      const momentumTierAfter = momentumEnabled ? getMomentumTierForStreak(streakAfter) : 'none'
      const total = missionPoints + momentumBonus + publicDelta

      pendingTotalsByPlayerId[player.id] = total
      breakdownsByPlayerId[player.id].push({
        missionPoints,
        baseMissionPoints,
        selectedCardPoints,
        featuredBonusPoints: featuredMission.featuredBonusPoints,
        featuredHoleType,
        momentumBonus,
        rivalryBonus: 0,
        rivalryOpponentPlayerId: null,
        rivalryWon: null,
        publicDelta,
        balanceCapAdjustment: 0,
        total,
        selectedCardId: selectedCard?.id ?? null,
        selectedCardCode: selectedCard?.code ?? null,
        selectedCardName: selectedCard?.name ?? null,
        selectedCardDescription: selectedCard?.description ?? null,
        selectedCardType: selectedCard?.cardType ?? null,
        selectedCardDifficulty: selectedCard?.difficulty ?? null,
        streakBefore,
        streakAfter,
        momentumTierBefore,
        momentumTierAfter,
        shieldApplied,
        missionStatus,
      })
      currentStreakByPlayerId[player.id] = streakAfter
    }

    if (featuredHoleType === 'rivalry') {
      const rivalryPair = getRivalryPair(players, gamePointsBeforeHoleByPlayerId)
      const rivalryWinnerId = resolveRivalryWinner(
        rivalryPair,
        pendingTotalsByPlayerId,
        holeResultState?.strokesByPlayerId ?? {},
      )

      if (rivalryPair) {
        const rivalryPlayerIds = [rivalryPair.playerAId, rivalryPair.playerBId]

        for (const rivalryPlayerId of rivalryPlayerIds) {
          const opponentId =
            rivalryPlayerId === rivalryPair.playerAId
              ? rivalryPair.playerBId
              : rivalryPair.playerAId
          const playerBreakdown = breakdownsByPlayerId[rivalryPlayerId]?.[holeIndex]
          if (!playerBreakdown) {
            continue
          }

          playerBreakdown.rivalryOpponentPlayerId = opponentId
          playerBreakdown.rivalryWon =
            rivalryWinnerId === null ? null : rivalryWinnerId === rivalryPlayerId
        }
      }

      if (rivalryWinnerId) {
        pendingTotalsByPlayerId[rivalryWinnerId] += FEATURED_HOLE_BALANCE.rivalryBonusPoints
        const winnerBreakdown = breakdownsByPlayerId[rivalryWinnerId]?.[holeIndex]
        if (winnerBreakdown) {
          winnerBreakdown.rivalryBonus = FEATURED_HOLE_BALANCE.rivalryBonusPoints
          winnerBreakdown.featuredBonusPoints += FEATURED_HOLE_BALANCE.rivalryBonusPoints
          winnerBreakdown.total += FEATURED_HOLE_BALANCE.rivalryBonusPoints
        }
      }
    }

    for (const player of players) {
      const playerBreakdown = breakdownsByPlayerId[player.id]?.[holeIndex]
      if (!playerBreakdown) {
        continue
      }

      const rawStackedBonus =
        playerBreakdown.momentumBonus + playerBreakdown.publicDelta + playerBreakdown.rivalryBonus
      const clampedStackedBonus = clamp(
        rawStackedBonus,
        POINT_BALANCE_RULES.stackedBonusCap.min,
        POINT_BALANCE_RULES.stackedBonusCap.max,
      )
      const balanceCapAdjustment = clampedStackedBonus - rawStackedBonus

      playerBreakdown.balanceCapAdjustment = balanceCapAdjustment
      // Use normalized mission points (not raw base points) so negative-value missions
      // do not bypass featured/balance normalization and over-penalize a hole.
      playerBreakdown.total = playerBreakdown.missionPoints + clampedStackedBonus
      pendingTotalsByPlayerId[player.id] = playerBreakdown.total
    }

    for (const player of players) {
      gamePointsBeforeHoleByPlayerId[player.id] += pendingTotalsByPlayerId[player.id] ?? 0
    }
  }

  return breakdownsByPlayerId
}

export function buildHolePointBreakdownsByPlayerId(
  players: Player[],
  holes: HoleDefinition[],
  holeCards: HoleCardsState[],
  holeResults: HoleResultState[],
  momentumEnabled: boolean,
): Record<string, HolePointBreakdown[]> {
  return holePointBreakdownsByPlayerIdSelector(
    players,
    holes,
    holeCards,
    holeResults,
    momentumEnabled,
  )
}

const holePointBreakdownsByPlayerIdSelector = createRefMemoizedSelector(
  (
    players: Player[],
    holes: HoleDefinition[],
    holeCards: HoleCardsState[],
    holeResults: HoleResultState[],
    momentumEnabled: boolean,
  ) =>
    computeHolePointBreakdownsByPlayerId(
      players,
      holes,
      holeCards,
      holeResults,
      momentumEnabled,
    ),
)

export function getPlayerHolePointBreakdown(
  playerId: string,
  holeIndex: number,
  players: Player[],
  holes: HoleDefinition[],
  holeCards: HoleCardsState[],
  holeResults: HoleResultState[],
  momentumEnabled: boolean,
): HolePointBreakdown {
  const breakdownsByPlayerId = buildHolePointBreakdownsByPlayerId(
    players,
    holes,
    holeCards,
    holeResults,
    momentumEnabled,
  )

  return breakdownsByPlayerId[playerId]?.[holeIndex] ?? createEmptyHolePointBreakdown()
}

export function getCurrentMomentumStateByPlayerId(
  players: Player[],
  holes: HoleDefinition[],
  holeCards: HoleCardsState[],
  holeResults: HoleResultState[],
  momentumEnabled: boolean,
): Record<string, MomentumState> {
  const breakdownsByPlayerId = buildHolePointBreakdownsByPlayerId(
    players,
    holes,
    holeCards,
    holeResults,
    momentumEnabled,
  )

  return Object.fromEntries(
    players.map((player) => {
      const playerBreakdowns = breakdownsByPlayerId[player.id] ?? []
      const currentStreak =
        playerBreakdowns[playerBreakdowns.length - 1]?.streakAfter ?? 0
      const tier = momentumEnabled ? getMomentumTierForStreak(currentStreak) : 'none'

      return [
        player.id,
        {
          streak: currentStreak,
          tier,
          tierLabel: getMomentumTierLabel(tier),
        },
      ]
    }),
  )
}
