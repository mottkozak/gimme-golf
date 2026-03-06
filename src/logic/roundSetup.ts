import type { HoleTag } from '../types/cards.ts'
import type {
  CourseStyle,
  HoleCardsState,
  HoleCount,
  HoleDefinition,
  HoleResultState,
  Player,
  RoundConfig,
  RoundState,
} from '../types/game.ts'
import { createEmptyHoleCardsState } from './dealCards.ts'
import { createPlayerTotals } from './scoring.ts'

const STANDARD_FRONT_NINE_PARS = [4, 4, 3, 5, 4, 4, 3, 5, 4] as const
const STANDARD_BACK_NINE_PARS = [4, 5, 3, 4, 4, 3, 5, 4, 4] as const
const STANDARD_PARS = [...STANDARD_FRONT_NINE_PARS, ...STANDARD_BACK_NINE_PARS] as const

export const MIN_GOLFERS = 1
export const MAX_GOLFERS = 8
export const MIN_PAR = 3
export const MAX_PAR = 6
export const DEFAULT_EXPECTED_SCORE = 90
export const MIN_EXPECTED_SCORE = 54
export const MAX_EXPECTED_SCORE = 180

export const HOLE_TAG_OPTIONS: Array<{ tag: HoleTag; label: string }> = [
  { tag: 'water', label: 'Water' },
  { tag: 'bunkers', label: 'Bunkers' },
  { tag: 'trees', label: 'Trees' },
  { tag: 'dogleg', label: 'Dogleg' },
  { tag: 'reachablePar5', label: 'Reachable Par 5' },
]

export interface RoundSetupDraft {
  config: RoundConfig
  players: Player[]
  holes: HoleDefinition[]
}

function getParForIndex(index: number, courseStyle: CourseStyle): number {
  if (courseStyle === 'par3') {
    return 3
  }

  return STANDARD_PARS[index % STANDARD_PARS.length]
}

export function createDefaultHoles(
  holeCount: HoleCount,
  courseStyle: CourseStyle,
): HoleDefinition[] {
  return Array.from({ length: holeCount }, (_, index) => ({
    holeNumber: index + 1,
    par: getParForIndex(index, courseStyle),
    tags: [],
  }))
}

export function normalizePar(par: number): number {
  return Math.min(MAX_PAR, Math.max(MIN_PAR, Math.round(par)))
}

export function normalizeExpectedScore(expectedScore: number): number {
  if (!Number.isFinite(expectedScore)) {
    return DEFAULT_EXPECTED_SCORE
  }

  return Math.min(MAX_EXPECTED_SCORE, Math.max(MIN_EXPECTED_SCORE, Math.round(expectedScore)))
}

export function toggleHoleTag(tags: HoleTag[], tag: HoleTag): HoleTag[] {
  return tags.includes(tag)
    ? tags.filter((currentTag) => currentTag !== tag)
    : [...tags, tag]
}

export function resizeHoles(
  existingHoles: HoleDefinition[],
  holeCount: HoleCount,
  courseStyle: CourseStyle,
): HoleDefinition[] {
  const defaultHoles = createDefaultHoles(holeCount, courseStyle)

  return defaultHoles.map((defaultHole, index) => {
    const existingHole = existingHoles[index]
    if (!existingHole) {
      return defaultHole
    }

    return {
      holeNumber: index + 1,
      par: normalizePar(existingHole.par),
      tags: existingHole.tags,
    }
  })
}

export function applyCourseStyle(
  existingHoles: HoleDefinition[],
  holeCount: HoleCount,
  courseStyle: CourseStyle,
): HoleDefinition[] {
  if (courseStyle === 'custom') {
    return resizeHoles(existingHoles, holeCount, courseStyle)
  }

  const styledDefaults = createDefaultHoles(holeCount, courseStyle)

  return styledDefaults.map((hole, index) => {
    const existingHole = existingHoles[index]

    return {
      ...hole,
      tags: existingHole?.tags ?? [],
    }
  })
}

function normalizeDealMode(config: RoundConfig): RoundConfig {
  const autoAssignOne = config.toggles.autoAssignOne

  return {
    ...config,
    toggles: {
      ...config.toggles,
      drawTwoPickOne: !autoAssignOne,
      autoAssignOne,
    },
  }
}

function ensurePlayers(players: Player[]): Player[] {
  const limited = players.slice(0, MAX_GOLFERS)

  if (limited.length > 0) {
    return limited.map((player, index) => ({
      ...player,
      id: player.id || `player-${index + 1}`,
      expectedScore18: normalizeExpectedScore(player.expectedScore18),
    }))
  }

  return [
    {
      id: 'player-1',
      name: 'Golfer 1',
      expectedScore18: DEFAULT_EXPECTED_SCORE,
    },
  ]
}

function ensureHoles(config: RoundConfig, holes: HoleDefinition[]): HoleDefinition[] {
  return resizeHoles(holes, config.holeCount, config.courseStyle).map((hole, index) => ({
    holeNumber: index + 1,
    par: normalizePar(hole.par),
    tags: HOLE_TAG_OPTIONS.map((option) => option.tag).filter((tag) => hole.tags.includes(tag)),
  }))
}

function buildHoleCards(
  players: Player[],
  holes: HoleDefinition[],
): HoleCardsState[] {
  return holes.map((hole) => createEmptyHoleCardsState(players, hole.holeNumber))
}

function buildHoleResults(players: Player[], holes: HoleDefinition[]): HoleResultState[] {
  return holes.map((hole) => ({
    holeNumber: hole.holeNumber,
    strokesByPlayerId: Object.fromEntries(players.map((player) => [player.id, null])),
    missionStatusByPlayerId: Object.fromEntries(players.map((player) => [player.id, 'pending'])),
    publicPointDeltaByPlayerId: Object.fromEntries(players.map((player) => [player.id, 0])),
    publicCardResolutionsByCardId: {},
    publicCardResolutionNotes: 'Pending hole completion.',
  }))
}

function buildTotalsByPlayerId(
  players: Player[],
  previousTotals: RoundState['totalsByPlayerId'],
): RoundState['totalsByPlayerId'] {
  return Object.fromEntries(
    players.map((player) => [player.id, previousTotals[player.id] ?? createPlayerTotals(0, 0)]),
  )
}

export function applyRoundSetupDraft(
  currentState: RoundState,
  setupDraft: RoundSetupDraft,
): RoundState {
  const config = normalizeDealMode(setupDraft.config)
  const players = ensurePlayers(setupDraft.players)
  const holes = ensureHoles(config, setupDraft.holes)

  return {
    ...currentState,
    config,
    players,
    holes,
    currentHoleIndex: Math.min(currentState.currentHoleIndex, holes.length - 1),
    holeCards: buildHoleCards(players, holes),
    holeResults: buildHoleResults(players, holes),
    totalsByPlayerId: buildTotalsByPlayerId(players, currentState.totalsByPlayerId),
  }
}
