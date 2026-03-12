import type { AwardId } from '../data/awards.ts'
import type { RoundState } from '../types/game.ts'
import { computeRoundAwards } from './awards.ts'
import { buildLeaderboardEntries } from './leaderboard.ts'
import { resolveLandingModeIdFromConfig, type LandingModeId } from './landingModes.ts'
import { formatPlayerNames, getDisplayPlayerName } from './playerNames.ts'

export const LOCAL_IDENTITY_STORAGE_KEY = 'gimme-golf-local-identity-v1'

const MAX_ROUND_HISTORY_ITEMS = 8
const MAX_RECENT_PLAYER_NAMES = 12

const BADGE_AWARD_PRIORITY: readonly AwardId[] = [
  'riskTaker',
  'chaosAgent',
  'mostClutch',
  'missionMachine',
  'biggestComeback',
  'mostCursed',
  'mvp',
  'heartbreaker',
] as const

const BADGE_LABEL_BY_AWARD_ID: Record<AwardId, string> = {
  riskTaker: 'Risk Taker',
  chaosAgent: 'Chaos Agent',
  mostClutch: 'Most Clutch',
  missionMachine: 'Mission Machine',
  biggestComeback: 'Comeback Crew',
  mostCursed: 'Curse Magnet',
  mvp: 'Round MVP',
  heartbreaker: 'Heartbreaker',
}

export interface LocalRoundHistoryEntry {
  roundSignature: string
  completedAtMs: number
  holeCount: number
  gameMode: RoundState['config']['gameMode']
  modeId: LandingModeId
  winnerNames: string
  playerNames: string[]
  groupLabel: string
}

export interface LocalPlayerProfile {
  playerKey: string
  displayName: string
  roundsPlayed: number
  wins: number
  lastPlayedAtMs: number
  awardWinsById: Partial<Record<AwardId, number>>
}

export interface LocalIdentityState {
  roundHistory: LocalRoundHistoryEntry[]
  recentPlayerNames: string[]
  playerProfiles: Record<string, LocalPlayerProfile>
  favoriteCardCountsById: Record<string, number>
}

export interface PlayerIdentityBadge {
  label: string
  detail: string
}

interface PersistedLocalIdentityState {
  roundHistory: LocalRoundHistoryEntry[]
  recentPlayerNames: string[]
  playerProfiles: Record<string, LocalPlayerProfile>
  favoriteCardCountsById: Record<string, number>
}

function createEmptyLocalIdentityState(): LocalIdentityState {
  return {
    roundHistory: [],
    recentPlayerNames: [],
    playerProfiles: {},
    favoriteCardCountsById: {},
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isAwardId(value: unknown): value is AwardId {
  return (
    value === 'mvp' ||
    value === 'chaosAgent' ||
    value === 'mostClutch' ||
    value === 'mostCursed' ||
    value === 'biggestComeback' ||
    value === 'riskTaker' ||
    value === 'missionMachine' ||
    value === 'heartbreaker'
  )
}

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function toPlayerKey(playerName: string): string {
  return normalizeName(playerName).toLocaleLowerCase()
}

function dedupeNames(names: string[]): string[] {
  const seen = new Set<string>()
  const deduped: string[] = []

  for (const name of names) {
    const normalized = normalizeName(name)
    const key = normalized.toLocaleLowerCase()
    if (!normalized || seen.has(key)) {
      continue
    }

    seen.add(key)
    deduped.push(normalized)
  }

  return deduped
}

function getRoundPlayerNames(roundState: RoundState): string[] {
  return roundState.players.map((player, playerIndex) =>
    getDisplayPlayerName(player.name, playerIndex),
  )
}

function getRoundHoleCount(roundState: RoundState): number {
  return roundState.holes.length > 0 ? roundState.holes.length : roundState.config.holeCount
}

function getRoundCompletedAtMs(roundState: RoundState): number | null {
  const latestCompletedAtMs = roundState.holeUxMetrics.reduce((latest, holeMetric) => {
    if (typeof holeMetric.completedAtMs !== 'number') {
      return latest
    }

    return Math.max(latest, holeMetric.completedAtMs)
  }, 0)

  return latestCompletedAtMs > 0 ? latestCompletedAtMs : null
}

function createGroupLabel(playerNames: string[]): string {
  if (playerNames.length === 0) {
    return 'New Group'
  }

  if (playerNames.length === 1) {
    return playerNames[0]
  }

  if (playerNames.length === 2) {
    return `${playerNames[0]} + ${playerNames[1]}`
  }

  return `${playerNames[0]} + ${playerNames[1]} +${playerNames.length - 2}`
}

function getRoundWinners(
  roundState: RoundState,
): {
  winnerNames: string
  winnerPlayerIdSet: Set<string>
} {
  const leaderboardRows = buildLeaderboardEntries(
    roundState.players,
    roundState.totalsByPlayerId,
    'adjustedScore',
  )
  const winningAdjustedScore = leaderboardRows[0]?.adjustedScore

  if (typeof winningAdjustedScore !== 'number') {
    return {
      winnerNames: '-',
      winnerPlayerIdSet: new Set<string>(),
    }
  }

  const winners = leaderboardRows.filter((row) => row.adjustedScore === winningAdjustedScore)

  return {
    winnerNames: formatPlayerNames(winners.map((row) => row.playerName)),
    winnerPlayerIdSet: new Set(winners.map((row) => row.playerId)),
  }
}

function buildRoundSignature(
  roundState: RoundState,
  playerNames: string[],
  completedAtMs: number | null,
): string {
  const totalsSignature = roundState.players
    .map((player) => {
      const totals = roundState.totalsByPlayerId[player.id]
      return `${player.id}:${totals?.realScore ?? 0}:${totals?.gamePoints ?? 0}:${totals?.adjustedScore ?? 0}`
    })
    .join('|')
  const holeResultsSignature = roundState.holeResults
    .map((holeResult) => JSON.stringify(holeResult.strokesByPlayerId))
    .join(';')

  return [
    completedAtMs === null ? 'no-completion-time' : String(completedAtMs),
    String(getRoundHoleCount(roundState)),
    roundState.config.gameMode,
    playerNames.join(','),
    totalsSignature,
    holeResultsSignature,
  ].join('::')
}

function sanitizeRoundHistoryEntry(value: unknown): LocalRoundHistoryEntry | null {
  if (!isRecord(value)) {
    return null
  }

  const playerNames = Array.isArray(value.playerNames)
    ? value.playerNames.filter((name): name is string => typeof name === 'string')
    : []

  if (
    typeof value.roundSignature !== 'string' ||
    typeof value.completedAtMs !== 'number' ||
    !Number.isFinite(value.completedAtMs) ||
    typeof value.holeCount !== 'number' ||
    !Number.isFinite(value.holeCount) ||
    (value.gameMode !== 'cards' && value.gameMode !== 'powerUps') ||
    typeof value.winnerNames !== 'string' ||
    typeof value.groupLabel !== 'string'
  ) {
    return null
  }

  return {
    roundSignature: value.roundSignature,
    completedAtMs: Math.round(value.completedAtMs),
    holeCount: Math.max(1, Math.round(value.holeCount)),
    gameMode: value.gameMode,
    modeId:
      value.modeId === 'classic' ||
      value.modeId === 'novelty' ||
      value.modeId === 'chaos' ||
      value.modeId === 'props' ||
      value.modeId === 'powerUps'
        ? value.modeId
        : value.gameMode === 'powerUps'
          ? 'powerUps'
          : 'classic',
    winnerNames: value.winnerNames,
    playerNames: dedupeNames(playerNames),
    groupLabel: value.groupLabel,
  }
}

function sanitizeFavoriteCardCountsById(value: unknown): Record<string, number> {
  if (!isRecord(value)) {
    return {}
  }

  const sanitizedEntries: Array<[string, number]> = []
  for (const [cardId, count] of Object.entries(value)) {
    if (typeof cardId !== 'string' || typeof count !== 'number' || count <= 0) {
      continue
    }

    sanitizedEntries.push([cardId, Math.round(count)])
  }

  return Object.fromEntries(sanitizedEntries)
}

function sanitizeAwardWinsById(value: unknown): Partial<Record<AwardId, number>> {
  if (!isRecord(value)) {
    return {}
  }

  const sanitizedEntries: Array<[AwardId, number]> = []

  for (const [awardId, wins] of Object.entries(value)) {
    if (!isAwardId(awardId) || typeof wins !== 'number' || wins <= 0) {
      continue
    }

    sanitizedEntries.push([awardId, Math.round(wins)])
  }

  return Object.fromEntries(sanitizedEntries) as Partial<Record<AwardId, number>>
}

function sanitizePlayerProfile(value: unknown): LocalPlayerProfile | null {
  if (!isRecord(value)) {
    return null
  }

  if (
    typeof value.playerKey !== 'string' ||
    typeof value.displayName !== 'string' ||
    typeof value.roundsPlayed !== 'number' ||
    typeof value.wins !== 'number' ||
    typeof value.lastPlayedAtMs !== 'number'
  ) {
    return null
  }

  return {
    playerKey: value.playerKey,
    displayName: value.displayName,
    roundsPlayed: Math.max(0, Math.round(value.roundsPlayed)),
    wins: Math.max(0, Math.round(value.wins)),
    lastPlayedAtMs: Math.max(0, Math.round(value.lastPlayedAtMs)),
    awardWinsById: sanitizeAwardWinsById(value.awardWinsById),
  }
}

function sanitizeIdentityState(value: unknown): LocalIdentityState {
  if (!isRecord(value)) {
    return createEmptyLocalIdentityState()
  }

  const roundHistory = Array.isArray(value.roundHistory)
    ? value.roundHistory
        .map((entry) => sanitizeRoundHistoryEntry(entry))
        .filter((entry): entry is LocalRoundHistoryEntry => Boolean(entry))
        .slice(0, MAX_ROUND_HISTORY_ITEMS)
    : []

  const recentPlayerNames = Array.isArray(value.recentPlayerNames)
    ? dedupeNames(
        value.recentPlayerNames.filter((name): name is string => typeof name === 'string'),
      ).slice(0, MAX_RECENT_PLAYER_NAMES)
    : []

  const playerProfiles: Record<string, LocalPlayerProfile> = {}
  if (isRecord(value.playerProfiles)) {
    for (const [playerKey, profileValue] of Object.entries(value.playerProfiles)) {
      const sanitizedProfile = sanitizePlayerProfile(profileValue)
      if (!sanitizedProfile) {
        continue
      }

      playerProfiles[playerKey] = {
        ...sanitizedProfile,
        playerKey,
      }
    }
  }

  return {
    roundHistory,
    recentPlayerNames,
    playerProfiles,
    favoriteCardCountsById: sanitizeFavoriteCardCountsById(value.favoriteCardCountsById),
  }
}

function saveLocalIdentityState(state: LocalIdentityState): void {
  try {
    const persistedState: PersistedLocalIdentityState = {
      roundHistory: state.roundHistory,
      recentPlayerNames: state.recentPlayerNames,
      playerProfiles: state.playerProfiles,
      favoriteCardCountsById: state.favoriteCardCountsById,
    }

    localStorage.setItem(LOCAL_IDENTITY_STORAGE_KEY, JSON.stringify(persistedState))
  } catch {
    // Keep identity optional; failures should not block round flow.
  }
}

export function loadLocalIdentityState(): LocalIdentityState {
  try {
    const rawValue = localStorage.getItem(LOCAL_IDENTITY_STORAGE_KEY)
    if (!rawValue) {
      return createEmptyLocalIdentityState()
    }

    return sanitizeIdentityState(JSON.parse(rawValue))
  } catch {
    return createEmptyLocalIdentityState()
  }
}

export function clearLocalIdentityState(): void {
  localStorage.removeItem(LOCAL_IDENTITY_STORAGE_KEY)
}

export function getPlayerProfileByName(
  state: LocalIdentityState,
  playerName: string,
): LocalPlayerProfile | null {
  const playerKey = toPlayerKey(playerName)
  if (!playerKey) {
    return null
  }

  return state.playerProfiles[playerKey] ?? null
}

export function getPlayerIdentityBadge(profile: LocalPlayerProfile): PlayerIdentityBadge {
  const bestAward = BADGE_AWARD_PRIORITY
    .map((awardId) => ({
      awardId,
      count: profile.awardWinsById[awardId] ?? 0,
    }))
    .sort((left, right) => right.count - left.count)[0]

  if (bestAward && bestAward.count > 0) {
    const badgeLabel = BADGE_LABEL_BY_AWARD_ID[bestAward.awardId]
    return {
      label: badgeLabel,
      detail: `${badgeLabel} x${bestAward.count}`,
    }
  }

  const winRate = profile.roundsPlayed > 0 ? profile.wins / profile.roundsPlayed : 0
  if (profile.roundsPlayed >= 4 && winRate >= 0.45) {
    return {
      label: 'Closer',
      detail: `${profile.wins} wins in ${profile.roundsPlayed} rounds`,
    }
  }

  if (profile.roundsPlayed >= 4) {
    return {
      label: 'Steady Golfer',
      detail: `${profile.roundsPlayed} local rounds played`,
    }
  }

  if (profile.roundsPlayed >= 2) {
    return {
      label: 'Returning Golfer',
      detail: `${profile.roundsPlayed} local rounds played`,
    }
  }

  return {
    label: 'Rookie Spark',
    detail: 'First local round',
  }
}

export function recordCompletedRoundIdentity(roundState: RoundState): LocalIdentityState {
  const currentState = loadLocalIdentityState()
  const playerNames = getRoundPlayerNames(roundState)
  const completionTimestamp = getRoundCompletedAtMs(roundState)
  const completedAtMs = completionTimestamp ?? Date.now()
  const roundSignature = buildRoundSignature(roundState, playerNames, completionTimestamp)

  if (currentState.roundHistory[0]?.roundSignature === roundSignature) {
    return currentState
  }

  const { winnerNames, winnerPlayerIdSet } = getRoundWinners(roundState)
  const awardsSummary = computeRoundAwards(roundState)
  const awardsWonByPlayerId: Record<string, AwardId[]> = Object.fromEntries(
    roundState.players.map((player) => [player.id, []]),
  )

  for (const award of awardsSummary.awards) {
    for (const winner of award.winners) {
      awardsWonByPlayerId[winner.playerId] = [
        ...(awardsWonByPlayerId[winner.playerId] ?? []),
        award.awardId,
      ]
    }
  }

  const nextProfiles: Record<string, LocalPlayerProfile> = { ...currentState.playerProfiles }

  for (const [playerIndex, player] of roundState.players.entries()) {
    const displayName = getDisplayPlayerName(player.name, playerIndex)
    const playerKey = toPlayerKey(displayName)
    if (!playerKey) {
      continue
    }

    const existingProfile = nextProfiles[playerKey]
    const nextAwardWinsById: Partial<Record<AwardId, number>> = {
      ...(existingProfile?.awardWinsById ?? {}),
    }

    for (const awardId of awardsWonByPlayerId[player.id] ?? []) {
      nextAwardWinsById[awardId] = (nextAwardWinsById[awardId] ?? 0) + 1
    }

    nextProfiles[playerKey] = {
      playerKey,
      displayName,
      roundsPlayed: (existingProfile?.roundsPlayed ?? 0) + 1,
      wins: (existingProfile?.wins ?? 0) + (winnerPlayerIdSet.has(player.id) ? 1 : 0),
      lastPlayedAtMs: completedAtMs,
      awardWinsById: nextAwardWinsById,
    }
  }

  const nextRoundHistory: LocalRoundHistoryEntry[] = [
    {
      roundSignature,
      completedAtMs,
      holeCount: getRoundHoleCount(roundState),
      gameMode: roundState.config.gameMode,
      modeId: resolveLandingModeIdFromConfig(roundState.config),
      winnerNames,
      playerNames,
      groupLabel: createGroupLabel(playerNames),
    },
    ...currentState.roundHistory.filter((entry) => entry.roundSignature !== roundSignature),
  ].slice(0, MAX_ROUND_HISTORY_ITEMS)

  const nextFavoriteCardCountsById: Record<string, number> = {
    ...currentState.favoriteCardCountsById,
  }

  for (const holeCardState of roundState.holeCards) {
    for (const selectedCardId of Object.values(holeCardState.selectedCardIdByPlayerId)) {
      if (!selectedCardId) {
        continue
      }

      nextFavoriteCardCountsById[selectedCardId] =
        (nextFavoriteCardCountsById[selectedCardId] ?? 0) + 1
    }

    for (const publicCard of holeCardState.publicCards) {
      nextFavoriteCardCountsById[publicCard.id] =
        (nextFavoriteCardCountsById[publicCard.id] ?? 0) + 1
    }
  }

  const nextRecentPlayerNames = dedupeNames([
    ...playerNames,
    ...currentState.recentPlayerNames,
  ]).slice(0, MAX_RECENT_PLAYER_NAMES)

  const nextState: LocalIdentityState = {
    roundHistory: nextRoundHistory,
    recentPlayerNames: nextRecentPlayerNames,
    playerProfiles: nextProfiles,
    favoriteCardCountsById: nextFavoriteCardCountsById,
  }

  saveLocalIdentityState(nextState)
  return nextState
}
