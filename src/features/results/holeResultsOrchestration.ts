import { isPublicCardResolutionComplete } from '../../logic/publicCardResolution.ts'
import type { PublicCard } from '../../types/cards.ts'
import type { PublicCardResolutionState } from '../../types/game.ts'

export function getSuggestedTargetPlayerId(
  pointsDelta: number,
  leadingPlayerId: string | null,
  trailingPlayerId: string | null,
  fallbackPlayerId: string | null,
): string | null {
  if (pointsDelta < 0) {
    return leadingPlayerId ?? fallbackPlayerId
  }

  return trailingPlayerId ?? fallbackPlayerId
}

export function getNextPlayerNeedingScore(
  currentPlayerId: string,
  orderedPlayerIds: string[],
  strokesByPlayerId: Record<string, number | null>,
): string | null {
  if (orderedPlayerIds.length === 0) {
    return null
  }

  const currentPlayerIndex = orderedPlayerIds.indexOf(currentPlayerId)
  const searchOrder =
    currentPlayerIndex >= 0
      ? [
          ...orderedPlayerIds.slice(currentPlayerIndex + 1),
          ...orderedPlayerIds.slice(0, currentPlayerIndex),
        ]
      : orderedPlayerIds

  return (
    searchOrder.find((playerId) => typeof strokesByPlayerId[playerId] !== 'number') ?? null
  )
}

export function getNextUnresolvedPublicCardId(params: {
  currentCardId?: string | null
  playerIds: string[]
  publicCards: PublicCard[]
  resolutionsByCardId: Record<string, PublicCardResolutionState>
}): string | null {
  const { currentCardId = null, playerIds, publicCards, resolutionsByCardId } = params

  if (publicCards.length === 0) {
    return null
  }

  const currentCardIndex =
    currentCardId === null
      ? -1
      : publicCards.findIndex((card) => card.id === currentCardId)
  const splitIndex = currentCardIndex >= 0 ? currentCardIndex + 1 : 0
  const orderedCards = [
    ...publicCards.slice(splitIndex),
    ...publicCards.slice(0, splitIndex),
  ]

  const nextCard = orderedCards.find(
    (card) => !isPublicCardResolutionComplete(card, resolutionsByCardId[card.id], playerIds),
  )

  return nextCard?.id ?? null
}
