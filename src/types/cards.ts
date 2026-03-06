export type CardType = 'common' | 'skill' | 'risk' | 'chaos' | 'prop'

export type PersonalCardType = 'common' | 'skill' | 'risk'

export type PublicCardType = 'chaos' | 'prop'

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
}

export type GimmeGolfCard = PersonalCard | PublicCard

export interface DeckCollection {
  personal: PersonalCard[]
  public: PublicCard[]
  all: GimmeGolfCard[]
}
