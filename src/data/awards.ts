export type AwardId =
  | 'mvp'
  | 'chaosAgent'
  | 'mostClutch'
  | 'mostCursed'
  | 'biggestComeback'
  | 'riskTaker'
  | 'missionMachine'
  | 'heartbreaker'

export interface AwardDefinition {
  id: AwardId
  name: string
  shortLabel: string
  sortOrder: number
}

export const AWARD_DEFINITIONS: AwardDefinition[] = [
  {
    id: 'mvp',
    name: 'MVP',
    shortLabel: 'MVP',
    sortOrder: 1,
  },
  {
    id: 'chaosAgent',
    name: 'Chaos Agent',
    shortLabel: 'CHAOS',
    sortOrder: 2,
  },
  {
    id: 'mostClutch',
    name: 'Most Clutch',
    shortLabel: 'CLUTCH',
    sortOrder: 3,
  },
  {
    id: 'mostCursed',
    name: 'Most Cursed',
    shortLabel: 'CURSED',
    sortOrder: 4,
  },
  {
    id: 'biggestComeback',
    name: 'Biggest Comeback',
    shortLabel: 'COMEBACK',
    sortOrder: 5,
  },
  {
    id: 'riskTaker',
    name: 'Risk Taker',
    shortLabel: 'RISK',
    sortOrder: 6,
  },
  {
    id: 'missionMachine',
    name: 'Mission Machine',
    shortLabel: 'MISSIONS',
    sortOrder: 7,
  },
  {
    id: 'heartbreaker',
    name: 'Heartbreaker',
    shortLabel: 'HEARTBREAK',
    sortOrder: 8,
  },
]

export const AWARD_DEFINITION_BY_ID: Record<AwardId, AwardDefinition> = Object.fromEntries(
  AWARD_DEFINITIONS.map((definition) => [definition.id, definition]),
) as Record<AwardId, AwardDefinition>

