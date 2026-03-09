export type CardPackId = 'classic' | 'chaos' | 'props' | 'curse' | 'style' | 'novelty' | 'hybrid'

export type CardType =
  | 'common'
  | 'skill'
  | 'risk'
  | 'curse'
  | 'style'
  | 'hybrid'
  | 'novelty'
  | 'chaos'
  | 'prop'

export type PersonalCardType =
  | 'common'
  | 'skill'
  | 'risk'
  | 'curse'
  | 'style'
  | 'hybrid'
  | 'novelty'

export type PublicCardType = 'chaos' | 'prop'

export type PublicInteractionMode =
  | 'yes_no_triggered'
  | 'vote_target_player'
  | 'choose_one_of_two_effects'
  | 'leader_selects_target'
  | 'trailing_player_selects_target'
  | 'pick_affected_players'

export type PublicInteractionTargetScope = 'target' | 'affected' | 'all'

export interface PublicInteractionEffectOption {
  id: string
  label: string
  pointsDelta: number
  targetScope: PublicInteractionTargetScope
}

export interface PublicCardInteractionDefinition {
  mode: PublicInteractionMode
  effectOptions?: [PublicInteractionEffectOption, PublicInteractionEffectOption]
}

export type HoleTag =
  | 'water'
  | 'bunkers'
  | 'trees'
  | 'dogleg'
  | 'reachablePar5'

export type CardDifficulty = 'easy' | 'medium' | 'hard' | 'neutral'

export interface CardBase {
  id: string
  code: string
  name: string
  description: string
  cardType: CardType
  packId: CardPackId
  points: number
  eligiblePars: number[]
  requiredTags: HoleTag[]
  excludedTags: HoleTag[]
  difficulty: CardDifficulty
  isPublic: boolean
  rulesText: string
}

export interface PersonalCard extends CardBase {
  cardType: PersonalCardType
  isPublic: false
  difficulty: Exclude<CardDifficulty, 'neutral'>
}

export interface PublicCard extends CardBase {
  cardType: PublicCardType
  isPublic: true
  difficulty: 'neutral'
  interaction?: PublicCardInteractionDefinition
}

export type GimmeGolfCard = PersonalCard | PublicCard

export interface DeckCollection {
  personal: PersonalCard[]
  public: PublicCard[]
  all: GimmeGolfCard[]
}
