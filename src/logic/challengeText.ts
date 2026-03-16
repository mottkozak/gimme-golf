import { getSkillBandForExpectedScore, type SkillBand } from './gameBalance.ts'

interface ScoreTargetPhraseMap {
  parOrBetter: string
  bogeyOrBetter: string
  doubleBogeyOrBetter: string
  tripleBogeyOrBetter: string
}

const SCORE_TARGET_PHRASES_BY_SKILL_BAND: Record<SkillBand, ScoreTargetPhraseMap> = {
  advanced: {
    parOrBetter: 'par or better',
    bogeyOrBetter: 'bogey or better',
    doubleBogeyOrBetter: 'bogey or better',
    tripleBogeyOrBetter: 'double bogey or better',
  },
  intermediate: {
    parOrBetter: 'bogey or better',
    bogeyOrBetter: 'double bogey or better',
    doubleBogeyOrBetter: 'double bogey or better',
    tripleBogeyOrBetter: 'triple bogey or better',
  },
  developing: {
    parOrBetter: 'double bogey or better',
    bogeyOrBetter: 'triple bogey or better',
    doubleBogeyOrBetter: 'triple bogey or better',
    tripleBogeyOrBetter: 'triple bogey or better',
  },
}

const SCORE_TARGET_PHRASE_TOKENS = {
  tripleBogeyOrBetter: '__GG_TRIPLE_BOGEY_OR_BETTER__',
  doubleBogeyOrBetter: '__GG_DOUBLE_BOGEY_OR_BETTER__',
  bogeyOrBetter: '__GG_BOGEY_OR_BETTER__',
  parOrBetter: '__GG_PAR_OR_BETTER__',
} as const

export function getScoreTargetPhraseMapForExpectedScore(
  expectedScore18: number,
): ScoreTargetPhraseMap {
  const skillBand = getSkillBandForExpectedScore(expectedScore18)
  return SCORE_TARGET_PHRASES_BY_SKILL_BAND[skillBand]
}

export function adaptChallengeTextToSkillLevel(
  text: string,
  expectedScore18: number,
): string {
  if (text.length === 0) {
    return text
  }

  const scoreTargetPhraseMap = getScoreTargetPhraseMapForExpectedScore(expectedScore18)

  const tokenizedText = text
    .replace(/triple bogey or better/gi, SCORE_TARGET_PHRASE_TOKENS.tripleBogeyOrBetter)
    .replace(/double bogey or better/gi, SCORE_TARGET_PHRASE_TOKENS.doubleBogeyOrBetter)
    .replace(/bogey or better/gi, SCORE_TARGET_PHRASE_TOKENS.bogeyOrBetter)
    .replace(/par or better/gi, SCORE_TARGET_PHRASE_TOKENS.parOrBetter)

  return tokenizedText
    .replaceAll(
      SCORE_TARGET_PHRASE_TOKENS.tripleBogeyOrBetter,
      scoreTargetPhraseMap.tripleBogeyOrBetter,
    )
    .replaceAll(
      SCORE_TARGET_PHRASE_TOKENS.doubleBogeyOrBetter,
      scoreTargetPhraseMap.doubleBogeyOrBetter,
    )
    .replaceAll(
      SCORE_TARGET_PHRASE_TOKENS.bogeyOrBetter,
      scoreTargetPhraseMap.bogeyOrBetter,
    )
    .replaceAll(
      SCORE_TARGET_PHRASE_TOKENS.parOrBetter,
      scoreTargetPhraseMap.parOrBetter,
    )
}
