import type { AppVibe, ChallengeLayout, PlayCadence, TypicalGroupSize } from './account.ts'

export type OnboardingStep = 0 | 1 | 2 | 3

export interface OnboardingDraft {
  displayName: string
  expectedScore18: number
  challengeLayout: ChallengeLayout
  appVibe: AppVibe
  typicalGroupSize: TypicalGroupSize
  playCadence: PlayCadence
  remindersEnabled: boolean
}

export const CHALLENGE_LAYOUT_OPTIONS: Array<{
  id: ChallengeLayout
  label: string
  helper: string
}> = [
  {
    id: 'compact',
    label: 'Compact',
    helper: 'Current view. Dense and quick to scan.',
  },
  {
    id: 'illustrative',
    label: 'Illustrative',
    helper: 'Full card look with a larger visual layout.',
  },
]

export function normalizeExpectedScore(value: number): number {
  return Math.min(Math.max(Math.round(value), 54), 140)
}

export function createDefaultDraft(): OnboardingDraft {
  return {
    displayName: '',
    expectedScore18: 95,
    challengeLayout: 'illustrative',
    appVibe: 'balanced',
    typicalGroupSize: 'foursome_plus',
    playCadence: 'monthly',
    remindersEnabled: true,
  }
}

export function getStepTitle(step: OnboardingStep): string {
  if (step === 0) return 'Welcome to Gimme Golf'
  if (step === 1) return 'What should we call you?'
  if (step === 2) return 'Your usual 18-hole score'
  return 'How should challenge cards look?'
}
