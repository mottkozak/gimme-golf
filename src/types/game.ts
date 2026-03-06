import type { HoleTag, PersonalCard, PublicCard } from './cards.ts'

export type HoleCount = 9 | 18

export type CourseStyle = 'par3' | 'standard' | 'custom'

export interface RoundToggles {
  dynamicDifficulty: boolean
  drawTwoPickOne: boolean
  autoAssignOne: boolean
  enableChaosCards: boolean
  enablePropCards: boolean
}

export interface RoundConfig {
  holeCount: HoleCount
  courseStyle: CourseStyle
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
}

export type MissionStatus = 'pending' | 'success' | 'failed'

export type PublicResolutionMode = 'yesNoTriggered' | 'winningPlayer' | 'affectedPlayers'

export interface PublicCardResolutionState {
  cardId: string
  mode: PublicResolutionMode
  triggered: boolean
  winningPlayerId: string | null
  affectedPlayerIds: string[]
}

export interface HoleCardsState {
  holeNumber: number
  dealtPersonalCardsByPlayerId: Record<string, PersonalCard[]>
  selectedCardIdByPlayerId: Record<string, string | null>
  publicCards: PublicCard[]
}

export interface HoleResultState {
  holeNumber: number
  strokesByPlayerId: Record<string, number | null>
  missionStatusByPlayerId: Record<string, MissionStatus>
  publicPointDeltaByPlayerId: Record<string, number>
  publicCardResolutionsByCardId: Record<string, PublicCardResolutionState>
  publicCardResolutionNotes: string
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
  holeResults: HoleResultState[]
  totalsByPlayerId: Record<string, PlayerTotals>
}
