export function formatPlayerNames(playerNames: readonly string[]): string {
  if (playerNames.length === 0) {
    return '-'
  }

  if (playerNames.length === 1) {
    return playerNames[0]
  }

  if (playerNames.length === 2) {
    return `${playerNames[0]} & ${playerNames[1]}`
  }

  return `${playerNames.slice(0, -1).join(', ')} & ${playerNames[playerNames.length - 1]}`
}

export function getDisplayPlayerName(playerName: string, playerIndex: number): string {
  const trimmedName = playerName.trim()
  if (trimmedName.length > 0) {
    return trimmedName
  }

  return `Player ${playerIndex + 1}`
}
