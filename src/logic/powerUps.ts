import { BAD_POWER_UPS, POWER_UPS, POWER_UPS_BY_ID, type PowerUp } from '../data/powerUps.ts'
import type { HoleDefinition, HolePowerUpState, HoleResultState, Player } from '../types/game.ts'

function shufflePowerUps(powerUps: PowerUp[]): PowerUp[] {
  const copy = [...powerUps]

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const temp = copy[index]
    copy[index] = copy[swapIndex]
    copy[swapIndex] = temp
  }

  return copy
}

export function createEmptyHolePowerUpState(
  players: Player[],
  holeNumber: number,
): HolePowerUpState {
  return {
    holeNumber,
    assignedPowerUpIdByPlayerId: Object.fromEntries(
      players.map((player) => [player.id, null]),
    ),
    usedPowerUpByPlayerId: Object.fromEntries(
      players.map((player) => [player.id, false]),
    ),
  }
}

export function buildEmptyHolePowerUpStates(
  players: Player[],
  holes: HoleDefinition[],
): HolePowerUpState[] {
  return holes.map((hole) => createEmptyHolePowerUpState(players, hole.holeNumber))
}

function assignPowerUpsFromPool(
  players: Player[],
  holeNumber: number,
  powerUpPool: PowerUp[],
): HolePowerUpState {
  if (powerUpPool.length === 0) {
    return createEmptyHolePowerUpState(players, holeNumber)
  }

  const shuffled = shufflePowerUps(powerUpPool)
  const assignedPowerUpIdByPlayerId: HolePowerUpState['assignedPowerUpIdByPlayerId'] = {}
  const usedPowerUpByPlayerId: HolePowerUpState['usedPowerUpByPlayerId'] = {}

  players.forEach((player, playerIndex) => {
    const powerUp = shuffled[playerIndex % shuffled.length]
    assignedPowerUpIdByPlayerId[player.id] = powerUp?.id ?? null
    usedPowerUpByPlayerId[player.id] = false
  })

  return {
    holeNumber,
    assignedPowerUpIdByPlayerId,
    usedPowerUpByPlayerId,
  }
}

function isHoleScoredForAllPlayers(
  holeResult: HoleResultState,
  players: Player[],
): boolean {
  return players.every((player) => typeof holeResult.strokesByPlayerId[player.id] === 'number')
}

export function getLeaderIdsBeforeHole(
  players: Player[],
  holeResults: HoleResultState[],
  currentHoleIndex: number,
): string[] {
  const totalsByPlayerId = Object.fromEntries(players.map((player) => [player.id, 0]))
  let hasCompletedHole = false

  for (let holeIndex = 0; holeIndex < currentHoleIndex; holeIndex += 1) {
    const holeResult = holeResults[holeIndex]
    if (!holeResult || !isHoleScoredForAllPlayers(holeResult, players)) {
      continue
    }

    hasCompletedHole = true
    players.forEach((player) => {
      const strokes = holeResult.strokesByPlayerId[player.id]
      if (typeof strokes === 'number') {
        totalsByPlayerId[player.id] += strokes
      }
    })
  }

  if (!hasCompletedHole) {
    return []
  }

  const lowestScore = players.reduce((lowest, player) => {
    return Math.min(lowest, totalsByPlayerId[player.id] ?? Number.POSITIVE_INFINITY)
  }, Number.POSITIVE_INFINITY)

  return players
    .filter((player) => totalsByPlayerId[player.id] === lowestScore)
    .map((player) => player.id)
}

export function assignPowerUpsForHole(
  players: Player[],
  holeNumber: number,
  powerUpPool: PowerUp[] = POWER_UPS,
): HolePowerUpState {
  return assignPowerUpsFromPool(players, holeNumber, powerUpPool)
}

export function assignPowerUpsForHoleWithLeaderHandicap(
  players: Player[],
  holeNumber: number,
  holeResults: HoleResultState[],
  currentHoleIndex: number,
  goodPowerUpPool: PowerUp[] = POWER_UPS,
  badPowerUpPool: PowerUp[] = BAD_POWER_UPS,
): HolePowerUpState {
  if (goodPowerUpPool.length === 0 && badPowerUpPool.length === 0) {
    return createEmptyHolePowerUpState(players, holeNumber)
  }

  const leaderIds = new Set(getLeaderIdsBeforeHole(players, holeResults, currentHoleIndex))
  const shuffledGoodPowerUps = goodPowerUpPool.length > 0 ? shufflePowerUps(goodPowerUpPool) : []
  const shuffledBadPowerUps = badPowerUpPool.length > 0 ? shufflePowerUps(badPowerUpPool) : []

  const assignedPowerUpIdByPlayerId: HolePowerUpState['assignedPowerUpIdByPlayerId'] = {}
  const usedPowerUpByPlayerId: HolePowerUpState['usedPowerUpByPlayerId'] = {}

  let goodIndex = 0
  let badIndex = 0

  players.forEach((player) => {
    const assignBadPowerUp = leaderIds.has(player.id) && shuffledBadPowerUps.length > 0
    const primaryPool = assignBadPowerUp ? shuffledBadPowerUps : shuffledGoodPowerUps
    const fallbackPool = assignBadPowerUp ? shuffledGoodPowerUps : shuffledBadPowerUps
    const sourcePool = primaryPool.length > 0 ? primaryPool : fallbackPool
    const currentIndex = assignBadPowerUp ? badIndex : goodIndex
    const assignedPowerUp = sourcePool[currentIndex % sourcePool.length]

    if (assignBadPowerUp) {
      badIndex += 1
    } else {
      goodIndex += 1
    }

    assignedPowerUpIdByPlayerId[player.id] = assignedPowerUp?.id ?? null
    usedPowerUpByPlayerId[player.id] = false
  })

  return {
    holeNumber,
    assignedPowerUpIdByPlayerId,
    usedPowerUpByPlayerId,
  }
}

export function getAssignedPowerUp(
  holePowerUpState: HolePowerUpState | undefined,
  playerId: string,
): PowerUp | null {
  if (!holePowerUpState) {
    return null
  }

  const powerUpId = holePowerUpState.assignedPowerUpIdByPlayerId[playerId]
  if (!powerUpId) {
    return null
  }

  return POWER_UPS_BY_ID[powerUpId] ?? null
}
