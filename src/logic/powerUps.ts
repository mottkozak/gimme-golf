import { POWER_UPS, POWER_UPS_BY_ID, type PowerUp } from '../data/powerUps.ts'
import type { HoleDefinition, HolePowerUpState, Player } from '../types/game.ts'

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

export function assignPowerUpsForHole(
  players: Player[],
  holeNumber: number,
  powerUpPool: PowerUp[] = POWER_UPS,
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
