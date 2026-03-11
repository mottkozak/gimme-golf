import { CURSE_CARDS, POWER_UPS, POWER_UPS_BY_ID, type PowerUp } from '../data/powerUps.ts'
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
    assignedPowerUpIdByPlayerId: Object.fromEntries(players.map((player) => [player.id, null])),
    assignedCurseIdByPlayerId: Object.fromEntries(players.map((player) => [player.id, null])),
    usedPowerUpByPlayerId: Object.fromEntries(players.map((player) => [player.id, false])),
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

  players.forEach((player, playerIndex) => {
    const powerUp = shuffled[playerIndex % shuffled.length]
    assignedPowerUpIdByPlayerId[player.id] = powerUp?.id ?? null
  })

  return {
    ...createEmptyHolePowerUpState(players, holeNumber),
    assignedPowerUpIdByPlayerId,
  }
}

function isHoleScoredForAllPlayers(
  holeResult: HoleResultState,
  players: Player[],
): boolean {
  return players.every((player) => typeof holeResult.strokesByPlayerId[player.id] === 'number')
}

export function getPreviousHoleWinnerIds(
  players: Player[],
  holeResults: HoleResultState[],
  currentHoleIndex: number,
): string[] {
  if (currentHoleIndex <= 0) {
    return []
  }

  const previousHoleResult = holeResults[currentHoleIndex - 1]
  if (!previousHoleResult || !isHoleScoredForAllPlayers(previousHoleResult, players)) {
    return []
  }

  const lowestScore = players.reduce((lowest, player) => {
    const strokes = previousHoleResult.strokesByPlayerId[player.id]
    return typeof strokes === 'number' ? Math.min(lowest, strokes) : lowest
  }, Number.POSITIVE_INFINITY)

  if (!Number.isFinite(lowestScore)) {
    return []
  }

  return players
    .filter((player) => previousHoleResult.strokesByPlayerId[player.id] === lowestScore)
    .map((player) => player.id)
}

export function assignPowerUpsForHole(
  players: Player[],
  holeNumber: number,
  powerUpPool: PowerUp[] = POWER_UPS,
): HolePowerUpState {
  return assignPowerUpsFromPool(players, holeNumber, powerUpPool)
}

export function assignPowerUpsForHoleWithCurses(
  players: Player[],
  holeNumber: number,
  holeResults: HoleResultState[],
  currentHoleIndex: number,
  positivePowerUpPool: PowerUp[] = POWER_UPS,
  cursePool: PowerUp[] = CURSE_CARDS,
): HolePowerUpState {
  const positiveAssignments = assignPowerUpsFromPool(players, holeNumber, positivePowerUpPool)
  const previousHoleWinnerIds = getPreviousHoleWinnerIds(players, holeResults, currentHoleIndex)

  if (previousHoleWinnerIds.length === 0 || cursePool.length === 0) {
    return positiveAssignments
  }

  const shuffledCurses = shufflePowerUps(cursePool)
  const assignedCurseIdByPlayerId: HolePowerUpState['assignedCurseIdByPlayerId'] = {
    ...positiveAssignments.assignedCurseIdByPlayerId,
  }

  previousHoleWinnerIds.forEach((playerId, playerIndex) => {
    const curse = shuffledCurses[playerIndex % shuffledCurses.length]
    assignedCurseIdByPlayerId[playerId] = curse?.id ?? null
  })

  return {
    ...positiveAssignments,
    assignedCurseIdByPlayerId,
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

export function getAssignedCurse(
  holePowerUpState: HolePowerUpState | undefined,
  playerId: string,
): PowerUp | null {
  if (!holePowerUpState) {
    return null
  }

  const curseId = holePowerUpState.assignedCurseIdByPlayerId[playerId]
  if (!curseId) {
    return null
  }

  return POWER_UPS_BY_ID[curseId] ?? null
}
