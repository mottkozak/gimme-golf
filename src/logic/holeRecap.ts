import { FEATURED_HOLES_BY_ID } from '../data/featuredHoles.ts'
import type { PublicCard } from '../types/cards.ts'
import type {
  FeaturedHoleType,
  GameMode,
  MissionStatus,
  Player,
  PublicCardResolutionState,
  RoundState,
} from '../types/game.ts'
import { getAssignedPowerUp } from './powerUps.ts'
import { getMomentumTierLabel, type MomentumTier } from './gameBalance.ts'
import {
  buildHolePointBreakdownsByPlayerId,
  createEmptyHolePointBreakdown,
} from './streaks.ts'
import {
  getPublicCardResolutionMode,
  normalizePublicCardResolutions,
  resolvePublicCardPointDeltas,
  type CanonicalPublicResolutionMode,
} from './publicCardResolution.ts'
import { formatPlayerNames } from './playerNames.ts'
import { createRefMemoizedSelector } from './selectors.ts'
import { resolveMajorityVoteWinnerId } from './votes.ts'

const MOMENTUM_TIER_RANK: Record<MomentumTier, number> = {
  none: 0,
  heater: 1,
  fire: 2,
  inferno: 3,
}

const SPECIAL_CARD_TYPES = new Set(['risk', 'curse', 'novelty', 'hybrid'])

export interface HoleRecapPlayerRow {
  playerId: string
  playerName: string
  powerUpTitle: string | null
  powerUpUsed: boolean | null
  selectedCardName: string | null
  selectedCardCode: string | null
  selectedCardType: string | null
  missionStatus: MissionStatus
  baseCardPoints: number
  featuredBonusPoints: number
  momentumBonusPoints: number
  rivalryBonus: number
  rivalryOpponentPlayerId: string | null
  publicBonusPoints: number
  balanceCapAdjustment: number
  bonusPoints: number
  holePoints: number
  strokes: number | null
  totalGamePoints: number
  totalRealScore: number
  totalAdjustedScore: number
  momentumBeforeTier: MomentumTier
  momentumAfterTier: MomentumTier
  momentumBeforeLabel: string
  momentumAfterLabel: string
  streakBefore: number
  streakAfter: number
  momentumTierJumped: boolean
  shieldApplied: boolean
  isHoleWinnerByPoints: boolean
}

export interface PublicCardImpactRow {
  playerId: string
  playerName: string
  delta: number
}

export interface PublicCardRecapItem {
  cardId: string
  cardCode: string
  cardName: string
  modeLabel: string
  summaryLine: string
  impactRows: PublicCardImpactRow[]
  biggestSwing: number
}

export interface HoleWinnerSummary {
  score: number | null
  playerIds: string[]
  playerNames: string[]
}

export interface LeaderSnapshotSummary {
  real: HoleWinnerSummary
  game: HoleWinnerSummary
  adjusted: HoleWinnerSummary
}

export interface HoleRecapData {
  gameMode: GameMode
  holeNumber: number
  holePar: number
  highlightLine: string
  featuredHoleRecap: FeaturedHoleRecap | null
  playerRows: HoleRecapPlayerRow[]
  publicCardRecapItems: PublicCardRecapItem[]
  gamePointHoleWinners: HoleWinnerSummary
  bestRealScoreHoleWinners: HoleWinnerSummary
  leaderSnapshot: LeaderSnapshotSummary
}

export interface FeaturedHoleRecap {
  type: FeaturedHoleType
  name: string
  shortDescription: string
  impactLine: string
  topBeneficiaries: string[]
  leaderboardImpact: boolean
}

type HoleRecapComputationState = Pick<
  RoundState,
  | 'players'
  | 'holes'
  | 'holeCards'
  | 'holePowerUps'
  | 'holeResults'
  | 'totalsByPlayerId'
  | 'config'
  | 'currentHoleIndex'
>

function formatPoints(points: number): string {
  return `${points > 0 ? '+' : ''}${points}`
}

function formatCardTypeLabel(cardType: string | null): string {
  if (!cardType) {
    return 'Personal'
  }

  return `${cardType.charAt(0).toUpperCase()}${cardType.slice(1)}`
}

function getPlayerNameById(players: Player[], playerId: string | null): string | null {
  if (!playerId) {
    return null
  }

  return players.find((player) => player.id === playerId)?.name ?? null
}

function getWinnerSummaryByMetric(
  players: Player[],
  getMetricValue: (player: Player) => number,
  preferredDirection: 'max' | 'min',
): HoleWinnerSummary {
  const playerValues = players.map((player) => ({
    player,
    value: getMetricValue(player),
  }))

  if (playerValues.length === 0) {
    return {
      score: null,
      playerIds: [],
      playerNames: [],
    }
  }

  const winnerScore = playerValues.reduce((selected, current) => {
    if (preferredDirection === 'max') {
      return Math.max(selected, current.value)
    }

    return Math.min(selected, current.value)
  }, playerValues[0]?.value ?? 0)

  const winners = playerValues
    .filter((entry) => entry.value === winnerScore)
    .map((entry) => entry.player)

  return {
    score: winnerScore,
    playerIds: winners.map((winner) => winner.id),
    playerNames: winners.map((winner) => winner.name),
  }
}

function getBestRealScoreHoleWinners(playerRows: HoleRecapPlayerRow[]): HoleWinnerSummary {
  const validRows = playerRows.filter((row) => typeof row.strokes === 'number')
  if (validRows.length === 0) {
    return {
      score: null,
      playerIds: [],
      playerNames: [],
    }
  }

  const bestScore = validRows.reduce((best, row) => Math.min(best, row.strokes ?? best), validRows[0]?.strokes ?? 0)
  const winners = validRows.filter((row) => row.strokes === bestScore)

  return {
    score: bestScore,
    playerIds: winners.map((winner) => winner.playerId),
    playerNames: winners.map((winner) => winner.playerName),
  }
}

function getPublicModeLabel(mode: CanonicalPublicResolutionMode): string {
  switch (mode) {
    case 'yes_no_triggered':
      return 'Yes/No Trigger'
    case 'vote_target_player':
      return 'Vote Target'
    case 'choose_one_of_two_effects':
      return 'Choose Effect'
    case 'leader_selects_target':
      return 'Leader Picks Target'
    case 'trailing_player_selects_target':
      return 'Trailing Picks Target'
    case 'pick_affected_players':
      return 'Pick Affected'
    default:
      return 'Manual Resolve'
  }
}

function summarizePublicCardResolution(
  card: PublicCard,
  resolution: PublicCardResolutionState,
  players: Player[],
  impactRows: PublicCardImpactRow[],
): string {
  if (!resolution.triggered) {
    return 'Not triggered.'
  }

  const mode = getPublicCardResolutionMode(card, resolution)

  if (mode === 'yes_no_triggered') {
    return `Triggered for all players (${formatPoints(card.points)} each).`
  }

  if (mode === 'vote_target_player') {
    const winnerId = resolveMajorityVoteWinnerId(
      resolution.targetPlayerIdByVoterId,
      new Set(players.map((player) => player.id)),
    )
    const winnerName = getPlayerNameById(players, winnerId)
    return winnerName ? `Vote selected ${winnerName}.` : 'Vote tied or unresolved.'
  }

  if (mode === 'leader_selects_target' || mode === 'trailing_player_selects_target') {
    const targetName = getPlayerNameById(players, resolution.winningPlayerId)
    return targetName ? `Target selected: ${targetName}.` : 'No target selected.'
  }

  if (mode === 'pick_affected_players') {
    if (impactRows.length === 0) {
      return 'No affected players selected.'
    }

    return `Affected: ${impactRows.map((row) => row.playerName).join(', ')}.`
  }

  const selectedEffect = card.interaction?.effectOptions?.find(
    (effect) => effect.id === resolution.selectedEffectOptionId,
  )
  const effectLabel = selectedEffect?.label ?? 'Default effect'

  if (impactRows.length === 0) {
    return `${effectLabel}. No point change applied.`
  }

  return `${effectLabel}.`
}

function buildPublicCardRecapItems(roundState: HoleRecapComputationState): PublicCardRecapItem[] {
  const currentHoleCards = roundState.holeCards[roundState.currentHoleIndex]
  const currentResult = roundState.holeResults[roundState.currentHoleIndex]
  const resolutions = normalizePublicCardResolutions(
    currentHoleCards.publicCards,
    currentResult.publicCardResolutionsByCardId,
  )

  return currentHoleCards.publicCards.map((card) => {
    const resolution = resolutions[card.id]
    const cardPointDeltaByPlayerId = resolvePublicCardPointDeltas(
      roundState.players,
      [card],
      { [card.id]: resolution },
    )
    const impactRows = roundState.players
      .map((player) => ({
        playerId: player.id,
        playerName: player.name,
        delta: cardPointDeltaByPlayerId[player.id] ?? 0,
      }))
      .filter((row) => row.delta !== 0)
    const biggestSwing = impactRows.reduce(
      (largest, row) => Math.max(largest, Math.abs(row.delta)),
      0,
    )
    const mode = getPublicCardResolutionMode(card, resolution)

    return {
      cardId: card.id,
      cardCode: card.code,
      cardName: card.name,
      modeLabel: getPublicModeLabel(mode),
      summaryLine: summarizePublicCardResolution(card, resolution, roundState.players, impactRows),
      impactRows,
      biggestSwing,
    }
  })
}

function getCountWord(value: number): string {
  const wordMap: Record<number, string> = {
    1: 'One',
    2: 'Two',
    3: 'Three',
    4: 'Four',
    5: 'Five',
    6: 'Six',
    7: 'Seven',
    8: 'Eight',
  }

  return wordMap[value] ?? String(value)
}

function getFeaturedTopBeneficiaries(playerRows: HoleRecapPlayerRow[]): string[] {
  const maxBonus = playerRows.reduce(
    (maxValue, row) => Math.max(maxValue, row.featuredBonusPoints),
    0,
  )

  if (maxBonus <= 0) {
    return []
  }

  return playerRows
    .filter((row) => row.featuredBonusPoints === maxBonus)
    .map((row) => row.playerName)
}

function didFeaturedHoleAffectWinners(playerRows: HoleRecapPlayerRow[]): boolean {
  if (playerRows.length === 0) {
    return false
  }

  const winningScoreWithFeatured = Math.max(...playerRows.map((row) => row.holePoints))
  const winnersWithFeatured = new Set(
    playerRows
      .filter((row) => row.holePoints === winningScoreWithFeatured)
      .map((row) => row.playerId),
  )

  const winningScoreWithoutFeatured = Math.max(
    ...playerRows.map((row) => row.holePoints - row.featuredBonusPoints),
  )
  const winnersWithoutFeatured = new Set(
    playerRows
      .filter((row) => row.holePoints - row.featuredBonusPoints === winningScoreWithoutFeatured)
      .map((row) => row.playerId),
  )

  if (winnersWithFeatured.size !== winnersWithoutFeatured.size) {
    return true
  }

  for (const winnerId of winnersWithFeatured) {
    if (!winnersWithoutFeatured.has(winnerId)) {
      return true
    }
  }

  return false
}

function buildFeaturedHoleImpactLine(
  featuredHoleType: FeaturedHoleType,
  playerRows: HoleRecapPlayerRow[],
): string {
  if (featuredHoleType === 'jackpot') {
    const successes = playerRows.filter((row) => row.missionStatus === 'success').length
    return `${successes} successful mission${successes === 1 ? '' : 's'} received +1.`
  }

  if (featuredHoleType === 'double_points') {
    const doubled = playerRows.filter((row) => row.featuredBonusPoints > 0).length
    return `${doubled} mission${doubled === 1 ? '' : 's'} were doubled for extra points.`
  }

  if (featuredHoleType === 'chaos') {
    const swingCount = playerRows.filter((row) => row.publicBonusPoints !== 0).length
    return swingCount > 0
      ? `Guaranteed public chaos card created swings for ${swingCount} player${swingCount === 1 ? '' : 's'}.`
      : 'Guaranteed chaos card was active, but no direct swing was applied.'
  }

  if (featuredHoleType === 'rivalry') {
    const rivalryWinner = playerRows.find((row) => row.rivalryBonus > 0)
    if (!rivalryWinner) {
      return 'Rivalry matchup ended tied, so no head-to-head bonus was awarded.'
    }
    const opponentName = playerRows.find(
      (row) => row.playerId === rivalryWinner.rivalryOpponentPlayerId,
    )?.playerName
    return opponentName
      ? `${rivalryWinner.playerName} beat ${opponentName} and earned +${rivalryWinner.rivalryBonus}.`
      : `${rivalryWinner.playerName} earned the rivalry bonus.`
  }

  const pressuredPlayers = playerRows.filter((row) => row.selectedCardCode).length
  return `No Mercy removed safe options and forced harder cards for ${pressuredPlayers} player${pressuredPlayers === 1 ? '' : 's'}.`
}

function buildFeaturedHoleRecap(
  featuredHoleType: FeaturedHoleType | null,
  playerRows: HoleRecapPlayerRow[],
): FeaturedHoleRecap | null {
  if (!featuredHoleType) {
    return null
  }

  const featuredHole = FEATURED_HOLES_BY_ID[featuredHoleType]
  const topBeneficiaries = getFeaturedTopBeneficiaries(playerRows)

  return {
    type: featuredHoleType,
    name: featuredHole.name,
    shortDescription: featuredHole.shortDescription,
    impactLine: buildFeaturedHoleImpactLine(featuredHoleType, playerRows),
    topBeneficiaries,
    leaderboardImpact: didFeaturedHoleAffectWinners(playerRows),
  }
}

function createHighlightLine(
  gameMode: GameMode,
  playerRows: HoleRecapPlayerRow[],
  publicCardRecapItems: PublicCardRecapItem[],
  gamePointHoleWinners: HoleWinnerSummary,
): string {
  if (gameMode === 'powerUps') {
    const usedCount = playerRows.filter((row) => row.powerUpUsed === true).length
    if (usedCount === 0) {
      return 'No power-ups were activated on this hole'
    }

    if (usedCount === 1) {
      const usedPlayer = playerRows.find((row) => row.powerUpUsed === true)
      return `${usedPlayer?.playerName ?? 'One player'} activated a power-up`
    }

    return `${getCountWord(usedCount)} players activated power-ups`
  }

  const momentumTierJumps = playerRows
    .filter(
      (row) =>
        MOMENTUM_TIER_RANK[row.momentumAfterTier] >
        MOMENTUM_TIER_RANK[row.momentumBeforeTier],
    )
    .sort((rowA, rowB) => {
      const jumpA = MOMENTUM_TIER_RANK[rowA.momentumAfterTier] - MOMENTUM_TIER_RANK[rowA.momentumBeforeTier]
      const jumpB = MOMENTUM_TIER_RANK[rowB.momentumAfterTier] - MOMENTUM_TIER_RANK[rowB.momentumBeforeTier]
      if (jumpA !== jumpB) {
        return jumpB - jumpA
      }
      return rowB.momentumBonusPoints - rowA.momentumBonusPoints
    })

  if (momentumTierJumps.length > 0) {
    const standout = momentumTierJumps[0]
    return `${standout.playerName} caught ${standout.momentumAfterLabel}`
  }

  const featuredStandout = [...playerRows]
    .filter((row) => row.featuredBonusPoints > 0)
    .sort((rowA, rowB) => rowB.featuredBonusPoints - rowA.featuredBonusPoints)[0]

  if (featuredStandout) {
    return `${featuredStandout.playerName} cashed in +${featuredStandout.featuredBonusPoints} from the featured hole`
  }

  const biggestPublicSwing = publicCardRecapItems
    .flatMap((item) =>
      item.impactRows.map((impactRow) => ({
        cardName: item.cardName,
        playerName: impactRow.playerName,
        delta: impactRow.delta,
        absDelta: Math.abs(impactRow.delta),
      })),
    )
    .sort((swingA, swingB) => swingB.absDelta - swingA.absDelta)[0]

  if (biggestPublicSwing && biggestPublicSwing.absDelta >= 2) {
    if (biggestPublicSwing.delta > 0) {
      return `${biggestPublicSwing.playerName} stole ${biggestPublicSwing.absDelta} points with ${biggestPublicSwing.cardName}`
    }
    return `${biggestPublicSwing.cardName} clipped ${biggestPublicSwing.playerName} for ${biggestPublicSwing.absDelta}`
  }

  const specialCardCompletion = playerRows
    .filter(
      (row) =>
        row.missionStatus === 'success' &&
        (SPECIAL_CARD_TYPES.has(row.selectedCardType ?? '') || row.baseCardPoints >= 3),
    )
    .sort((rowA, rowB) => rowB.baseCardPoints - rowA.baseCardPoints)[0]

  if (specialCardCompletion) {
    return `${specialCardCompletion.playerName} cleared a ${formatCardTypeLabel(specialCardCompletion.selectedCardType)} card`
  }

  const pointsBeforeByPlayerId = Object.fromEntries(
    playerRows.map((row) => [row.playerId, row.totalGamePoints - row.holePoints]),
  )
  const minBefore = Math.min(...Object.values(pointsBeforeByPlayerId))
  const minAfter = Math.min(...playerRows.map((row) => row.totalGamePoints))
  const lastBefore = new Set(
    playerRows
      .filter((row) => pointsBeforeByPlayerId[row.playerId] === minBefore)
      .map((row) => row.playerId),
  )
  const lastAfter = new Set(
    playerRows.filter((row) => row.totalGamePoints === minAfter).map((row) => row.playerId),
  )
  const comebackPlayer = playerRows
    .filter(
      (row) =>
        lastBefore.has(row.playerId) &&
        !lastAfter.has(row.playerId) &&
        row.holePoints > 0,
    )
    .sort((rowA, rowB) => rowB.holePoints - rowA.holePoints)[0]

  if (comebackPlayer) {
    return `${comebackPlayer.playerName} clawed back into the round`
  }

  const successfulPlayers = playerRows.filter((row) => row.missionStatus === 'success')

  if (successfulPlayers.length === playerRows.length && playerRows.length > 1) {
    return 'Everyone completed their missions'
  }

  if (successfulPlayers.length >= 2) {
    return `${getCountWord(successfulPlayers.length)} players completed their missions`
  }

  if (successfulPlayers.length === 0) {
    return 'Nobody survived the hole cleanly'
  }

  if (gamePointHoleWinners.playerNames.length > 0) {
    if (gamePointHoleWinners.playerNames.length === 1) {
      return `${gamePointHoleWinners.playerNames[0]} won the hole in points`
    }

    return `${formatPlayerNames(gamePointHoleWinners.playerNames)} split the hole`
  }

  return 'Hole complete'
}

function computeHoleRecapData(roundState: HoleRecapComputationState): HoleRecapData {
  const currentHole = roundState.holes[roundState.currentHoleIndex]
  const currentResult = roundState.holeResults[roundState.currentHoleIndex]
  const momentumEnabled = roundState.config.toggles.momentumBonuses
  const featuredHoleType = currentHole.featuredHoleType ?? null
  const breakdownsByPlayerId = buildHolePointBreakdownsByPlayerId(
    roundState.players,
    roundState.holes,
    roundState.holeCards,
    roundState.holeResults,
    momentumEnabled,
  )

  const playerRows = roundState.players.map((player) => {
    const pointBreakdown =
      breakdownsByPlayerId[player.id]?.[roundState.currentHoleIndex] ??
      createEmptyHolePointBreakdown()
    const totals = roundState.totalsByPlayerId[player.id]
    const momentumBeforeLabel = getMomentumTierLabel(pointBreakdown.momentumTierBefore)
    const momentumAfterLabel = getMomentumTierLabel(pointBreakdown.momentumTierAfter)
    const momentumTierJumped =
      MOMENTUM_TIER_RANK[pointBreakdown.momentumTierAfter] >
      MOMENTUM_TIER_RANK[pointBreakdown.momentumTierBefore]

    const assignedPowerUp = getAssignedPowerUp(
      roundState.holePowerUps[roundState.currentHoleIndex],
      player.id,
    )
    const powerUpUsed =
      roundState.holePowerUps[roundState.currentHoleIndex]?.usedPowerUpByPlayerId[player.id]

    return {
      playerId: player.id,
      playerName: player.name,
      powerUpTitle: assignedPowerUp?.title ?? null,
      powerUpUsed: typeof powerUpUsed === 'boolean' ? powerUpUsed : null,
      selectedCardName: pointBreakdown.selectedCardName,
      selectedCardCode: pointBreakdown.selectedCardCode,
      selectedCardType: pointBreakdown.selectedCardType,
      missionStatus: pointBreakdown.missionStatus,
      baseCardPoints: pointBreakdown.baseMissionPoints,
      featuredBonusPoints: pointBreakdown.featuredBonusPoints,
      momentumBonusPoints: pointBreakdown.momentumBonus,
      rivalryBonus: pointBreakdown.rivalryBonus,
      rivalryOpponentPlayerId: pointBreakdown.rivalryOpponentPlayerId,
      publicBonusPoints: pointBreakdown.publicDelta,
      balanceCapAdjustment: pointBreakdown.balanceCapAdjustment,
      bonusPoints:
        pointBreakdown.featuredBonusPoints +
        pointBreakdown.momentumBonus +
        pointBreakdown.publicDelta +
        pointBreakdown.rivalryBonus +
        pointBreakdown.balanceCapAdjustment,
      holePoints: pointBreakdown.total,
      strokes: currentResult.strokesByPlayerId[player.id] ?? null,
      totalGamePoints: totals?.gamePoints ?? 0,
      totalRealScore: totals?.realScore ?? 0,
      totalAdjustedScore: totals?.adjustedScore ?? 0,
      momentumBeforeTier: pointBreakdown.momentumTierBefore,
      momentumAfterTier: pointBreakdown.momentumTierAfter,
      momentumBeforeLabel,
      momentumAfterLabel,
      streakBefore: pointBreakdown.streakBefore,
      streakAfter: pointBreakdown.streakAfter,
      momentumTierJumped,
      shieldApplied: pointBreakdown.shieldApplied,
      isHoleWinnerByPoints: false,
    }
  })

  const gamePointHoleWinners = getWinnerSummaryByMetric(
    roundState.players,
    (player) => playerRows.find((row) => row.playerId === player.id)?.holePoints ?? 0,
    'max',
  )
  const bestRealScoreHoleWinners = getBestRealScoreHoleWinners(playerRows)
  const winnerIdSet = new Set(gamePointHoleWinners.playerIds)

  const playerRowsWithWinnerFlags = playerRows.map((row) => ({
    ...row,
    isHoleWinnerByPoints: winnerIdSet.has(row.playerId),
  }))

  const publicCardRecapItems = buildPublicCardRecapItems(roundState)
  const featuredHoleRecap = buildFeaturedHoleRecap(featuredHoleType, playerRowsWithWinnerFlags)

  const leaderSnapshot: LeaderSnapshotSummary = {
    real: getWinnerSummaryByMetric(
      roundState.players,
      (player) => roundState.totalsByPlayerId[player.id]?.realScore ?? 0,
      'min',
    ),
    game: getWinnerSummaryByMetric(
      roundState.players,
      (player) => roundState.totalsByPlayerId[player.id]?.gamePoints ?? 0,
      'max',
    ),
    adjusted: getWinnerSummaryByMetric(
      roundState.players,
      (player) => roundState.totalsByPlayerId[player.id]?.adjustedScore ?? 0,
      'min',
    ),
  }

  return {
    gameMode: roundState.config.gameMode,
    holeNumber: currentHole.holeNumber,
    holePar: currentHole.par,
    highlightLine: createHighlightLine(
      roundState.config.gameMode,
      playerRowsWithWinnerFlags,
      publicCardRecapItems,
      gamePointHoleWinners,
    ),
    featuredHoleRecap,
    playerRows: playerRowsWithWinnerFlags,
    publicCardRecapItems,
    gamePointHoleWinners,
    bestRealScoreHoleWinners,
    leaderSnapshot,
  }
}

const holeRecapDataSelector = createRefMemoizedSelector(
  (
    players: RoundState['players'],
    holes: RoundState['holes'],
    holeCards: RoundState['holeCards'],
    holePowerUps: RoundState['holePowerUps'],
    holeResults: RoundState['holeResults'],
    totalsByPlayerId: RoundState['totalsByPlayerId'],
    config: RoundState['config'],
    currentHoleIndex: number,
  ): HoleRecapData => {
    const recapState: HoleRecapComputationState = {
      players,
      holes,
      holeCards,
      holePowerUps,
      holeResults,
      totalsByPlayerId,
      config,
      currentHoleIndex,
    }

    return computeHoleRecapData(recapState)
  },
)

export function clearHoleRecapDataCache(): void {
  holeRecapDataSelector.clear()
}

export function buildHoleRecapData(roundState: RoundState): HoleRecapData {
  return holeRecapDataSelector(
    roundState.players,
    roundState.holes,
    roundState.holeCards,
    roundState.holePowerUps,
    roundState.holeResults,
    roundState.totalsByPlayerId,
    roundState.config,
    roundState.currentHoleIndex,
  )
}

export function formatWinnerSummary(summary: HoleWinnerSummary): string {
  if (summary.playerNames.length === 0 || summary.score === null) {
    return '-'
  }

  if (summary.playerNames.length === 1) {
    return `${summary.playerNames[0]} (${summary.score})`
  }

  return `${formatPlayerNames(summary.playerNames)} (${summary.score})`
}
