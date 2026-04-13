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
  const usedPowerUpByPlayerId: HolePowerUpState['usedPowerUpByPlayerId'] = Object.fromEntries(
    players.map((player) => [player.id, Boolean(assignedPowerUpIdByPlayerId[player.id])]),
  )

  return {
    ...createEmptyHolePowerUpState(players, holeNumber),
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

export function getPreviousHoleWinnerIds(
  players: Player[],
  holeResults: HoleResultState[],
  currentHoleIndex: number,
): string[] {
  return getRoundLeaderIds(players, holeResults, currentHoleIndex)
}

export function getRoundLeaderIds(
  players: Player[],
  holeResults: HoleResultState[],
  currentHoleIndex: number,
): string[] {
  if (currentHoleIndex <= 0) {
    return []
  }

  const cumulativeStrokesByPlayerId = Object.fromEntries(
    players.map((player) => [player.id, 0]),
  ) as Record<string, number>
  let completedHoleCount = 0

  for (let holeIndex = 0; holeIndex < currentHoleIndex; holeIndex += 1) {
    const holeResult = holeResults[holeIndex]
    if (!holeResult || !isHoleScoredForAllPlayers(holeResult, players)) {
      continue
    }

    completedHoleCount += 1

    for (const player of players) {
      const strokes = holeResult.strokesByPlayerId[player.id]
      if (typeof strokes === 'number') {
        cumulativeStrokesByPlayerId[player.id] += strokes
      }
    }
  }

  if (completedHoleCount === 0) {
    return []
  }

  const lowestTotalStrokes = players.reduce(
    (lowest, player) => Math.min(lowest, cumulativeStrokesByPlayerId[player.id]),
    Number.POSITIVE_INFINITY,
  )

  if (!Number.isFinite(lowestTotalStrokes)) {
    return []
  }

  return players
    .filter((player) => cumulativeStrokesByPlayerId[player.id] === lowestTotalStrokes)
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
  const roundLeaderIds = getRoundLeaderIds(players, holeResults, currentHoleIndex)
  const maxLeadersEligibleForCurses = Math.floor(players.length / 2)

  if (roundLeaderIds.length === 0 || cursePool.length === 0) {
    return positiveAssignments
  }

  // Apply curses only when the lead is held by a minority (or exactly half in even groups).
  // If the lead is too crowded, keep the hole as all-positive to avoid blanket punishment.
  if (roundLeaderIds.length > maxLeadersEligibleForCurses) {
    return positiveAssignments
  }

  const shuffledCurses = shufflePowerUps(cursePool)
  const assignedPowerUpIdByPlayerId: HolePowerUpState['assignedPowerUpIdByPlayerId'] = {
    ...positiveAssignments.assignedPowerUpIdByPlayerId,
  }
  const assignedCurseIdByPlayerId: HolePowerUpState['assignedCurseIdByPlayerId'] = {
    ...positiveAssignments.assignedCurseIdByPlayerId,
  }
  const usedPowerUpByPlayerId: HolePowerUpState['usedPowerUpByPlayerId'] = {
    ...positiveAssignments.usedPowerUpByPlayerId,
  }

  roundLeaderIds.forEach((playerId, playerIndex) => {
    const curse = shuffledCurses[playerIndex % shuffledCurses.length]
    assignedCurseIdByPlayerId[playerId] = curse?.id ?? null
    // Curse replaces the positive card for that hole.
    assignedPowerUpIdByPlayerId[playerId] = null
    usedPowerUpByPlayerId[playerId] = false
  })

  return {
    ...positiveAssignments,
    assignedPowerUpIdByPlayerId,
    assignedCurseIdByPlayerId,
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
