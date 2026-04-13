import type { PublicCard } from '../../types/cards.ts'
import type { Player, PlayerTotals } from '../../types/game.ts'

export type PublicCardEffectOption = NonNullable<
  NonNullable<PublicCard['interaction']>['effectOptions']
>[number]

export function toTitleCase(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`
}

export function parseStrokeInput(rawValue: string): number | null {
  const digitsOnly = rawValue.replace(/[^\d]/g, '')
  if (!digitsOnly) {
    return null
  }

  const parsed = Number(digitsOnly)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null
  }

  return Math.round(parsed)
}

export function sortPlayersByGamePoints(
  players: Player[],
  totalsByPlayerId: Record<string, PlayerTotals>,
): Player[] {
  return [...players].sort((playerA, playerB) => {
    const pointsA = totalsByPlayerId[playerA.id]?.gamePoints ?? 0
    const pointsB = totalsByPlayerId[playerB.id]?.gamePoints ?? 0
    if (pointsA !== pointsB) {
      return pointsB - pointsA
    }

    const nameCompare = playerA.name.localeCompare(playerB.name)
    if (nameCompare !== 0) {
      return nameCompare
    }

    return playerA.id.localeCompare(playerB.id)
  })
}

export function getEffectOptions(card: PublicCard): [PublicCardEffectOption, PublicCardEffectOption] {
  const absolutePoints = Math.max(1, Math.abs(card.points))
  return (
    card.interaction?.effectOptions ?? [
      {
        id: 'effect-positive',
        label: `+${absolutePoints} to selected players`,
        pointsDelta: absolutePoints,
        targetScope: 'affected',
      },
      {
        id: 'effect-negative',
        label: `-${absolutePoints} to selected players`,
        pointsDelta: -absolutePoints,
        targetScope: 'affected',
      },
    ]
  )
}
