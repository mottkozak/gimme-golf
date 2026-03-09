import type { PublicCard } from '../types/cards.ts'
import type {
  LegacyPublicResolutionMode,
  Player,
  PublicCardResolutionState,
  PublicResolutionMode,
} from '../types/game.ts'

type EffectOption = NonNullable<NonNullable<PublicCard['interaction']>['effectOptions']>[number]

export type CanonicalPublicResolutionMode =
  | 'yes_no_triggered'
  | 'vote_target_player'
  | 'choose_one_of_two_effects'
  | 'leader_selects_target'
  | 'trailing_player_selects_target'
  | 'pick_affected_players'

function includesAnyKeyword(value: string, keywords: string[]): boolean {
  const normalized = value.toLowerCase()
  return keywords.some((keyword) => normalized.includes(keyword))
}

function normalizeResolutionMode(mode: PublicResolutionMode): PublicResolutionMode {
  const legacyModeMap: Record<LegacyPublicResolutionMode, PublicResolutionMode> = {
    yesNoTriggered: 'yes_no_triggered',
    winningPlayer: 'leader_selects_target',
    affectedPlayers: 'pick_affected_players',
  }

  return legacyModeMap[mode as LegacyPublicResolutionMode] ?? mode
}

export function normalizePublicResolutionMode(mode: PublicResolutionMode): PublicResolutionMode {
  return normalizeResolutionMode(mode)
}

function formatSignedPoints(points: number): string {
  return `${points > 0 ? '+' : ''}${points}`
}

export function getPublicCardResolutionMode(
  card: PublicCard,
  resolution: Pick<PublicCardResolutionState, 'mode'> | null | undefined,
): CanonicalPublicResolutionMode {
  return normalizeResolutionMode(
    card.interaction?.mode ?? resolution?.mode ?? getDefaultPublicResolutionMode(card),
  ) as CanonicalPublicResolutionMode
}

function getDefaultEffectOptions(card: PublicCard): [EffectOption, EffectOption] {
  const absolutePoints = Math.max(1, Math.abs(card.points))
  return [
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
}

function getEffectOptions(card: PublicCard): [EffectOption, EffectOption] {
  return card.interaction?.effectOptions ?? getDefaultEffectOptions(card)
}

export function getDefaultPublicResolutionMode(card: PublicCard): PublicResolutionMode {
  if (card.interaction?.mode) {
    return card.interaction.mode
  }

  const fullText = `${card.name} ${card.description} ${card.rulesText}`

  if (includesAnyKeyword(fullText, ['one of two', 'either'])) {
    return 'choose_one_of_two_effects'
  }

  if (includesAnyKeyword(fullText, ['trailing golfer chooses', 'trailing player chooses'])) {
    return 'trailing_player_selects_target'
  }

  if (includesAnyKeyword(fullText, ['leader chooses', 'leader picks', 'leader selects'])) {
    return 'leader_selects_target'
  }

  if (
    includesAnyKeyword(fullText, [
      'vote',
      'majority',
      'pick who',
      'player pick',
      'pick any active player',
      'pick one player',
      'choose one active golfer',
      'longest drive',
      'closest to pin',
    ])
  ) {
    return 'vote_target_player'
  }

  if (card.points === 0) {
    return 'yes_no_triggered'
  }

  if (card.cardType === 'prop' || card.cardType === 'chaos') {
    return 'pick_affected_players'
  }

  return 'yes_no_triggered'
}

export function createDefaultPublicCardResolution(card: PublicCard): PublicCardResolutionState {
  const defaultMode = getPublicCardResolutionMode(card, null)
  const defaultEffectId =
    defaultMode === 'choose_one_of_two_effects' ? getEffectOptions(card)[0]?.id ?? null : null

  return {
    cardId: card.id,
    mode: defaultMode,
    triggered: false,
    winningPlayerId: null,
    affectedPlayerIds: [],
    targetPlayerIdByVoterId: {},
    selectedEffectOptionId: defaultEffectId,
  }
}

export function normalizePublicCardResolutions(
  cards: PublicCard[],
  resolutionsByCardId: Record<string, PublicCardResolutionState> | undefined,
): Record<string, PublicCardResolutionState> {
  return Object.fromEntries(
    cards.map((card) => {
      const defaultResolution = createDefaultPublicCardResolution(card)
      const existingResolution = resolutionsByCardId?.[card.id]
      if (existingResolution) {
        const normalizedMode = getPublicCardResolutionMode(card, existingResolution)
        const normalizedSelectedEffectOptionId =
          normalizedMode === 'choose_one_of_two_effects'
            ? existingResolution.selectedEffectOptionId ?? defaultResolution.selectedEffectOptionId
            : null

        return [
          card.id,
          {
            ...defaultResolution,
            ...existingResolution,
            mode: normalizedMode,
            targetPlayerIdByVoterId: existingResolution.targetPlayerIdByVoterId ?? {},
            selectedEffectOptionId: normalizedSelectedEffectOptionId,
          },
        ]
      }

      return [card.id, defaultResolution]
    }),
  )
}

export interface PublicResolutionInputRequirements {
  requiresVoteTarget: boolean
  requiresEffectChoice: boolean
  requiresTargetSelection: boolean
  requiresAffectedSelection: boolean
}

export function getPublicResolutionInputRequirements(
  card: PublicCard,
  resolution: PublicCardResolutionState,
): PublicResolutionInputRequirements {
  const mode = getPublicCardResolutionMode(card, resolution)
  const baseRequirements: PublicResolutionInputRequirements = {
    requiresVoteTarget: false,
    requiresEffectChoice: false,
    requiresTargetSelection: false,
    requiresAffectedSelection: false,
  }

  if (!resolution.triggered) {
    return baseRequirements
  }

  if (mode === 'vote_target_player') {
    return {
      ...baseRequirements,
      requiresVoteTarget: true,
    }
  }

  if (mode === 'leader_selects_target' || mode === 'trailing_player_selects_target') {
    return {
      ...baseRequirements,
      requiresTargetSelection: true,
    }
  }

  if (mode === 'pick_affected_players') {
    return {
      ...baseRequirements,
      requiresAffectedSelection: true,
    }
  }

  if (mode === 'choose_one_of_two_effects') {
    const effectOptions = getEffectOptions(card)
    const selectedEffect =
      effectOptions.find((effect) => effect.id === resolution.selectedEffectOptionId) ??
      effectOptions[0] ??
      null

    return {
      ...baseRequirements,
      requiresEffectChoice: true,
      requiresTargetSelection: selectedEffect?.targetScope === 'target',
      requiresAffectedSelection: selectedEffect?.targetScope === 'affected',
    }
  }

  return baseRequirements
}

export interface PublicResolutionGuidance {
  title: string
  triggerPrompt: string
  triggerHelp: string
  voteTargetLabel: string
  effectChoiceLabel: string
  targetLabel: string
  affectedLabel: string
  autoResolvedHint: string
}

export function getPublicResolutionGuidance(
  card: PublicCard,
  mode: CanonicalPublicResolutionMode,
): PublicResolutionGuidance {
  const signedPoints = formatSignedPoints(card.points)

  if (mode === 'vote_target_player') {
    return {
      title: `${card.code} Pick Winner`,
      triggerPrompt: `Did "${card.name}" happen on this hole?`,
      triggerHelp: `If yes, pick the winning golfer to receive ${signedPoints}.`,
      voteTargetLabel: `Who won "${card.name}"?`,
      effectChoiceLabel: 'Effect',
      targetLabel: 'Target golfer',
      affectedLabel: 'Affected golfers',
      autoResolvedHint: 'Only one golfer in round. Winner auto-selected.',
    }
  }

  if (mode === 'choose_one_of_two_effects') {
    return {
      title: `${card.code} Choose Outcome`,
      triggerPrompt: `Did "${card.name}" trigger this hole?`,
      triggerHelp: 'Pick the exact effect that happened, then set any required target.',
      voteTargetLabel: 'Vote result',
      effectChoiceLabel: 'Which effect happened?',
      targetLabel: 'Who was targeted?',
      affectedLabel: 'Who was affected?',
      autoResolvedHint: 'Only one golfer in round. Target auto-selected.',
    }
  }

  if (mode === 'leader_selects_target') {
    return {
      title: `${card.code} Leader Target`,
      triggerPrompt: `Did "${card.name}" trigger this hole?`,
      triggerHelp: `If triggered, choose who the leader targeted for ${signedPoints}.`,
      voteTargetLabel: 'Vote result',
      effectChoiceLabel: 'Effect',
      targetLabel: 'Who did the leader choose?',
      affectedLabel: 'Affected golfers',
      autoResolvedHint: 'Only one golfer in round. Target auto-selected.',
    }
  }

  if (mode === 'trailing_player_selects_target') {
    return {
      title: `${card.code} Trailing Target`,
      triggerPrompt: `Did "${card.name}" trigger this hole?`,
      triggerHelp: `If triggered, choose who the trailing golfer targeted for ${signedPoints}.`,
      voteTargetLabel: 'Vote result',
      effectChoiceLabel: 'Effect',
      targetLabel: 'Who did the trailing golfer choose?',
      affectedLabel: 'Affected golfers',
      autoResolvedHint: 'Only one golfer in round. Target auto-selected.',
    }
  }

  if (mode === 'pick_affected_players') {
    return {
      title: `${card.code} Affected Golfers`,
      triggerPrompt: `Did "${card.name}" trigger this hole?`,
      triggerHelp: `If triggered, select each golfer who should receive ${signedPoints}.`,
      voteTargetLabel: 'Vote result',
      effectChoiceLabel: 'Effect',
      targetLabel: 'Target golfer',
      affectedLabel: 'Who was affected?',
      autoResolvedHint: 'Only one golfer in round. Effect auto-applies to that golfer.',
    }
  }

  return {
    title: `${card.code} Trigger Check`,
    triggerPrompt: `Did "${card.name}" happen on this hole?`,
    triggerHelp:
      card.points === 0
        ? 'This card is a rules-only modifier. Confirm trigger status only.'
        : `If triggered, ${signedPoints} applies to all golfers automatically.`,
    voteTargetLabel: 'Vote result',
    effectChoiceLabel: 'Effect',
    targetLabel: 'Target golfer',
    affectedLabel: 'Affected golfers',
    autoResolvedHint: 'No extra inputs needed.',
  }
}

function hasValidVoteSelection(
  resolution: PublicCardResolutionState,
  playerIds: string[],
): boolean {
  return playerIds.every((playerId) => {
    const votedPlayerId = resolution.targetPlayerIdByVoterId[playerId]
    return typeof votedPlayerId === 'string' && votedPlayerId.length > 0
  })
}

export function isPublicCardResolutionComplete(
  card: PublicCard,
  resolution: PublicCardResolutionState,
  playerIds: string[],
): boolean {
  if (!resolution.triggered) {
    return true
  }

  const normalizedMode = getPublicCardResolutionMode(card, resolution)

  if (normalizedMode === 'yes_no_triggered') {
    return true
  }

  if (normalizedMode === 'vote_target_player') {
    return hasValidVoteSelection(resolution, playerIds)
  }

  if (
    normalizedMode === 'leader_selects_target' ||
    normalizedMode === 'trailing_player_selects_target'
  ) {
    return typeof resolution.winningPlayerId === 'string' && resolution.winningPlayerId.length > 0
  }

  if (normalizedMode === 'pick_affected_players') {
    return resolution.affectedPlayerIds.length > 0
  }

  const effectOptions = getEffectOptions(card)
  const selectedEffect =
    effectOptions.find((effect) => effect.id === resolution.selectedEffectOptionId) ??
    effectOptions[0]

  if (!selectedEffect) {
    return false
  }

  if (selectedEffect.targetScope === 'all') {
    return true
  }

  if (selectedEffect.targetScope === 'target') {
    return typeof resolution.winningPlayerId === 'string' && resolution.winningPlayerId.length > 0
  }

  return resolution.affectedPlayerIds.length > 0
}

function getMajorityVoteWinnerId(
  votesByVoterId: Record<string, string | null>,
  validPlayerIds: Set<string>,
): string | null {
  const voteCounts: Record<string, number> = {}

  for (const votedPlayerId of Object.values(votesByVoterId)) {
    if (!votedPlayerId || !validPlayerIds.has(votedPlayerId)) {
      continue
    }

    voteCounts[votedPlayerId] = (voteCounts[votedPlayerId] ?? 0) + 1
  }

  const rankedVotes = Object.entries(voteCounts).sort((entryA, entryB) => entryB[1] - entryA[1])
  const topVoteCount = rankedVotes[0]?.[1]
  const tieCount = rankedVotes.filter(([, count]) => count === topVoteCount).length

  if (!topVoteCount || tieCount > 1) {
    return null
  }

  return rankedVotes[0]?.[0] ?? null
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

    const normalizedMode = getPublicCardResolutionMode(card, resolution)

    if (normalizedMode === 'yes_no_triggered') {
      for (const player of players) {
        pointDeltasByPlayerId[player.id] += card.points
      }
      continue
    }

    if (
      normalizedMode === 'leader_selects_target' ||
      normalizedMode === 'trailing_player_selects_target'
    ) {
      const targetPlayerId = resolution.winningPlayerId
      if (targetPlayerId && validPlayerIds.has(targetPlayerId)) {
        pointDeltasByPlayerId[targetPlayerId] += card.points
      }
      continue
    }

    if (normalizedMode === 'vote_target_player') {
      const votedPlayerId = getMajorityVoteWinnerId(
        resolution.targetPlayerIdByVoterId ?? {},
        validPlayerIds,
      )
      if (votedPlayerId) {
        pointDeltasByPlayerId[votedPlayerId] += card.points
      }
      continue
    }

    if (normalizedMode === 'pick_affected_players') {
      const affectedPlayerIds = Array.from(new Set(resolution.affectedPlayerIds)).filter(
        (playerId) => validPlayerIds.has(playerId),
      )

      for (const affectedPlayerId of affectedPlayerIds) {
        pointDeltasByPlayerId[affectedPlayerId] += card.points
      }
      continue
    }

    if (normalizedMode === 'choose_one_of_two_effects') {
      const effectOptions = getEffectOptions(card)
      const selectedEffect =
        effectOptions.find((effect) => effect.id === resolution.selectedEffectOptionId) ??
        effectOptions[0]

      if (!selectedEffect) {
        continue
      }

      if (selectedEffect.targetScope === 'all') {
        for (const player of players) {
          pointDeltasByPlayerId[player.id] += selectedEffect.pointsDelta
        }
      } else if (selectedEffect.targetScope === 'target') {
        const targetPlayerId = resolution.winningPlayerId
        if (targetPlayerId && validPlayerIds.has(targetPlayerId)) {
          pointDeltasByPlayerId[targetPlayerId] += selectedEffect.pointsDelta
        }
      } else {
        const affectedPlayerIds = Array.from(new Set(resolution.affectedPlayerIds)).filter(
          (playerId) => validPlayerIds.has(playerId),
        )
        for (const affectedPlayerId of affectedPlayerIds) {
          pointDeltasByPlayerId[affectedPlayerId] += selectedEffect.pointsDelta
        }
      }
    }
  }

  return pointDeltasByPlayerId
}

export function buildPublicResolutionNotes(
  cards: PublicCard[],
  resolutionsByCardId: Record<string, PublicCardResolutionState>,
): string {
  const triggeredCards = cards.filter((card) => resolutionsByCardId[card.id]?.triggered)

  if (triggeredCards.length === 0) {
    return 'No public card effects triggered.'
  }

  const noteParts = triggeredCards.map((card) => {
    const resolution = resolutionsByCardId[card.id]
    const mode = getPublicCardResolutionMode(card, resolution)
    const effectSuffix =
      mode === 'choose_one_of_two_effects' && resolution.selectedEffectOptionId
        ? ` / ${resolution.selectedEffectOptionId}`
        : ''

    return `${card.code} (${mode}${effectSuffix})`
  })

  return `Triggered: ${noteParts.join(', ')}`
}
