interface ScoreTargetPhraseMap {
  parOrBetter: string
  bogeyOrBetter: string
  doubleBogeyOrBetter: string
  tripleBogeyOrBetter: string
}

const CANONICAL_SCORE_TARGET_PHRASE_MAP: ScoreTargetPhraseMap = {
  parOrBetter: 'par or better',
  bogeyOrBetter: 'bogey or better',
  doubleBogeyOrBetter: 'double bogey or better',
  tripleBogeyOrBetter: 'triple bogey or better',
}

export function getScoreTargetPhraseMapForExpectedScore(
  _expectedScore18: number,
): ScoreTargetPhraseMap {
  return CANONICAL_SCORE_TARGET_PHRASE_MAP
}

export function adaptChallengeTextToSkillLevel(
  text: string,
  _expectedScore18: number,
): string {
  return text
}
