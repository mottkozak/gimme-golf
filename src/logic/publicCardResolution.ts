import type { PublicCard } from '../types/cards.ts'
import type {
  Player,
  PublicCardResolutionState,
  PublicResolutionMode,
} from '../types/game.ts'

function includesAnyKeyword(value: string, keywords: string[]): boolean {
  const normalized = value.toLowerCase()
  return keywords.some((keyword) => normalized.includes(keyword))
}

export function getDefaultPublicResolutionMode(card: PublicCard): PublicResolutionMode {
  if (card.cardType === 'chaos') {
    return 'affectedPlayers'
  }

  const winnerKeywords = ['pick', 'leader', 'closest', 'winner']

  if (includesAnyKeyword(`${card.name} ${card.description} ${card.rulesText}`, winnerKeywords)) {
    return 'winningPlayer'
  }

  return 'yesNoTriggered'
}

export function createDefaultPublicCardResolution(card: PublicCard): PublicCardResolutionState {
  return {
    cardId: card.id,
    mode: getDefaultPublicResolutionMode(card),
    triggered: false,
    winningPlayerId: null,
    affectedPlayerIds: [],
  }
}

export function normalizePublicCardResolutions(
  cards: PublicCard[],
  resolutionsByCardId: Record<string, PublicCardResolutionState> | undefined,
): Record<string, PublicCardResolutionState> {
  return Object.fromEntries(
    cards.map((card) => {
      const existingResolution = resolutionsByCardId?.[card.id]
      if (existingResolution) {
        return [card.id, existingResolution]
      }

      return [card.id, createDefaultPublicCardResolution(card)]
    }),
  )
}

export function resolvePublicCardPointDeltas(
  players: Player[],
  cards: PublicCard[],
  resolutionsByCardId: Record<string, PublicCardResolutionState>,
): Record<string, number> {
  const pointDeltasByPlayerId = Object.fromEntries(players.map((player) => [player.id, 0]))
  const validPlayerIds = new Set(players.map((player) => player.id))

  for (const card of cards) {
    const resolution = resolutionsByCardId[card.id]

    if (!resolution || !resolution.triggered) {
      continue
    }

    if (resolution.mode === 'yesNoTriggered') {
      for (const player of players) {
        pointDeltasByPlayerId[player.id] += card.points
      }
      continue
    }

    if (resolution.mode === 'winningPlayer') {
      const winningPlayerId = resolution.winningPlayerId
      if (winningPlayerId && validPlayerIds.has(winningPlayerId)) {
        pointDeltasByPlayerId[winningPlayerId] += card.points
      }
      continue
    }

    const affectedPlayerIds = Array.from(new Set(resolution.affectedPlayerIds)).filter((playerId) =>
      validPlayerIds.has(playerId),
    )

    for (const affectedPlayerId of affectedPlayerIds) {
      pointDeltasByPlayerId[affectedPlayerId] += card.points
    }
  }

  return pointDeltasByPlayerId
}

export function buildPublicResolutionNotes(
  cards: PublicCard[],
  resolutionsByCardId: Record<string, PublicCardResolutionState>,
): string {
  const triggeredCardCodes = cards
    .filter((card) => resolutionsByCardId[card.id]?.triggered)
    .map((card) => card.code)

  if (triggeredCardCodes.length === 0) {
    return 'No public card effects triggered.'
  }

  return `Triggered: ${triggeredCardCodes.join(', ')}`
}
