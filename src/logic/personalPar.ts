import type { HoleCount, HoleDefinition, Player } from '../types/game.ts'

export interface ScoreTargetMatch {
  phrase: 'par or better' | 'bogey or better' | 'double bogey or better' | 'triple bogey or better'
  offsetFromPar: 0 | 1 | 2 | 3
}

const MIN_PERSONAL_PAR = 1

const SCORE_TARGET_PATTERNS: Array<{ phrase: ScoreTargetMatch['phrase']; regex: RegExp }> = [
  { phrase: 'triple bogey or better', regex: /\btriple bogey or better\b/i },
  { phrase: 'double bogey or better', regex: /\bdouble bogey or better\b/i },
  { phrase: 'bogey or better', regex: /\bbogey or better\b/i },
  { phrase: 'par or better', regex: /\bpar or better\b/i },
]

function getOffsetForPhrase(phrase: ScoreTargetMatch['phrase']): ScoreTargetMatch['offsetFromPar'] {
  if (phrase === 'bogey or better') {
    return 1
  }

  if (phrase === 'double bogey or better') {
    return 2
  }

  if (phrase === 'triple bogey or better') {
    return 3
  }

  return 0
}

function sumPar(holes: HoleDefinition[]): number {
  return holes.reduce((total, hole) => total + hole.par, 0)
}

function distributeDeltaAcrossHoles(delta: number, holeCount: number): number[] {
  if (holeCount <= 0) {
    return []
  }

  const baseAdjustment = Math.trunc(delta / holeCount)
  const remainder = delta - baseAdjustment * holeCount
  const remainderSign = Math.sign(remainder)
  const remainderMagnitude = Math.abs(remainder)

  return Array.from({ length: holeCount }, (_, index) => {
    const remainderAdjustment = index < remainderMagnitude ? remainderSign : 0
    return baseAdjustment + remainderAdjustment
  })
}

export function getProjectedRoundScore(expectedScore18: number, holeCount: HoleCount): number {
  return Math.round(expectedScore18 * (holeCount / 18))
}

export function getPersonalParByHole(
  expectedScore18: number,
  holes: HoleDefinition[],
  holeCount: HoleCount,
): number[] {
  const projectedRoundScore = getProjectedRoundScore(expectedScore18, holeCount)
  const deltaFromCoursePar = projectedRoundScore - sumPar(holes)
  const adjustmentsByHole = distributeDeltaAcrossHoles(deltaFromCoursePar, holes.length)

  return holes.map((hole, index) =>
    Math.max(MIN_PERSONAL_PAR, hole.par + (adjustmentsByHole[index] ?? 0)),
  )
}

export function getPersonalParByHoleByPlayerId(
  players: Player[],
  holes: HoleDefinition[],
  holeCount: HoleCount,
): Record<string, number[]> {
  return Object.fromEntries(
    players.map((player) => [player.id, getPersonalParByHole(player.expectedScore18, holes, holeCount)]),
  )
}

export function findScoreTargetMatch(text: string): ScoreTargetMatch | null {
  for (const pattern of SCORE_TARGET_PATTERNS) {
    if (pattern.regex.test(text)) {
      return {
        phrase: pattern.phrase,
        offsetFromPar: getOffsetForPhrase(pattern.phrase),
      }
    }
  }

  return null
}

export function getScoreTargetStrokes(text: string, personalPar: number): number | null {
  const match = findScoreTargetMatch(text)
  if (!match) {
    return null
  }

  return Math.max(MIN_PERSONAL_PAR, personalPar + match.offsetFromPar)
}
