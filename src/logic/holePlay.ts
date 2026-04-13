import type { Player } from '../types/game.ts'

export function getNextPendingPlayerId(
  playersRequiringSelection: Player[],
  currentPlayerId: string,
  selectedCardIdByPlayerId: Record<string, string | null>,
): string | null {
  const currentPlayerSelectionIndex = playersRequiringSelection.findIndex(
    (player) => player.id === currentPlayerId,
  )
  const orderedPlayersToCheck =
    currentPlayerSelectionIndex >= 0
      ? [
          ...playersRequiringSelection.slice(currentPlayerSelectionIndex + 1),
          ...playersRequiringSelection.slice(0, currentPlayerSelectionIndex),
        ]
      : playersRequiringSelection

  return (
    orderedPlayersToCheck.find((player) => {
      const selectedCardId = selectedCardIdByPlayerId[player.id]
      return typeof selectedCardId !== 'string' || selectedCardId.length === 0
    })?.id ?? null
  )
}
