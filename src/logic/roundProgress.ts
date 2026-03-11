import type { RoundState } from '../types/game.ts'

function hasAnyDealtCardsForHole(roundState: RoundState, holeIndex: number): boolean {
  const holeCardState = roundState.holeCards[holeIndex]

  const hasPersonalCards = roundState.players.some((player) => {
    const dealtCards = holeCardState?.dealtPersonalCardsByPlayerId[player.id] ?? []
    return dealtCards.length > 0
  })

  return hasPersonalCards || (holeCardState?.publicCards.length ?? 0) > 0
}

function hasAnyAssignedPowerUpsForHole(roundState: RoundState, holeIndex: number): boolean {
  const holePowerUpState = roundState.holePowerUps[holeIndex]

  return roundState.players.some((player) =>
    Boolean(
      holePowerUpState?.assignedPowerUpIdByPlayerId[player.id] ??
        holePowerUpState?.assignedCurseIdByPlayerId[player.id],
    ),
  )
}

function hasAnyScoringInputForHole(roundState: RoundState, holeIndex: number): boolean {
  const holeResultState = roundState.holeResults[holeIndex]

  return roundState.players.some(
    (player) => typeof holeResultState?.strokesByPlayerId[player.id] === 'number',
  )
}

export function hasRoundProgress(roundState: RoundState): boolean {
  return roundState.holes.some((_hole, holeIndex) => {
    return (
      hasAnyScoringInputForHole(roundState, holeIndex) ||
      hasAnyDealtCardsForHole(roundState, holeIndex) ||
      hasAnyAssignedPowerUpsForHole(roundState, holeIndex)
    )
  })
}
