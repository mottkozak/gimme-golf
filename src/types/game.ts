import type {
  CardPackId,
  HoleTag,
  PersonalCard,
  PublicCard,
  PublicInteractionMode,
} from './cards.ts'

export type HoleCount = 9 | 18

export type CourseStyle = 'par3' | 'standard' | 'custom'
export type GameMode = 'cards' | 'powerUps'
export type GameModePresetId =
  | 'casual'
  | 'competitive'
  | 'party'
  | 'balanced'
  | 'powerUps'
  | 'custom'

export type FeaturedHoleType = 'jackpot' | 'chaos' | 'double_points' | 'rivalry' | 'no_mercy'
export type FeaturedHoleFrequency = 'low' | 'normal' | 'high'
export type FeaturedHoleAssignmentMode = 'auto' | 'manual'

export interface FeaturedHolesConfig {
  enabled: boolean
  frequency: FeaturedHoleFrequency
  assignmentMode: FeaturedHoleAssignmentMode
  randomSeed?: number
}

export interface RoundToggles {
  dynamicDifficulty: boolean
  momentumBonuses: boolean
  drawTwoPickOne: boolean
  autoAssignOne: boolean
  enableChaosCards: boolean
  enablePropCards: boolean
}

export interface RoundConfig {
  holeCount: HoleCount
  courseStyle: CourseStyle
  gameMode: GameMode
  selectedPresetId: GameModePresetId
  customModeName: string
  enabledPackIds: CardPackId[]
  featuredHoles: FeaturedHolesConfig
  toggles: RoundToggles
}

export interface Player {
  id: string
  name: string
  expectedScore18: number
}

export interface HoleDefinition {
  holeNumber: number
  par: number
  tags: HoleTag[]
  featuredHoleType: FeaturedHoleType | null
}

export type MissionStatus = 'pending' | 'success' | 'failed'

export type LegacyPublicResolutionMode = 'yesNoTriggered' | 'winningPlayer' | 'affectedPlayers'
export type PublicResolutionMode = PublicInteractionMode | LegacyPublicResolutionMode

export interface PublicCardResolutionState {
  cardId: string
  mode: PublicResolutionMode
  triggered: boolean
  winningPlayerId: string | null
  affectedPlayerIds: string[]
  targetPlayerIdByVoterId: Record<string, string | null>
  selectedEffectOptionId: string | null
}

export interface PersonalCardOfferState {
  safeCardId: string | null
  hardCardId: string | null
}

export interface HoleCardsState {
  holeNumber: number
  dealtPersonalCardsByPlayerId: Record<string, PersonalCard[]>
  selectedCardIdByPlayerId: Record<string, string | null>
  personalCardOfferByPlayerId: Record<string, PersonalCardOfferState>
  publicCards: PublicCard[]
}

export interface HolePowerUpState {
  holeNumber: number
  assignedPowerUpIdByPlayerId: Record<string, string | null>
  usedPowerUpByPlayerId: Record<string, boolean>
}

export interface HoleResultState {
  holeNumber: number
  strokesByPlayerId: Record<string, number | null>
  missionStatusByPlayerId: Record<string, MissionStatus>
  publicPointDeltaByPlayerId: Record<string, number>
  publicCardResolutionsByCardId: Record<string, PublicCardResolutionState>
  publicCardResolutionNotes: string
}

export interface HoleUxMetrics {
  holeNumber: number
  startedAtMs: number | null
  completedAtMs: number | null
  durationMs: number | null
  tapsToComplete: number
  publicResolutionStartedAtMs: number | null
  publicResolutionCompletedAtMs: number | null
  publicResolutionDurationMs: number | null
}

export interface RoundDeckMemory {
  usedPersonalCardIds: string[]
  usedPublicCardIds: string[]
}

export interface PlayerTotals {
  realScore: number
  gamePoints: number
  adjustedScore: number
}

export interface LeaderboardEntry {
  playerId: string
  playerName: string
  realScore: number
  gamePoints: number
  adjustedScore: number
}

export interface RoundState {
  config: RoundConfig
  players: Player[]
  holes: HoleDefinition[]
  currentHoleIndex: number
  holeCards: HoleCardsState[]
  holePowerUps: HolePowerUpState[]
  holeResults: HoleResultState[]
  holeUxMetrics: HoleUxMetrics[]
  deckMemory: RoundDeckMemory
  totalsByPlayerId: Record<string, PlayerTotals>
}
