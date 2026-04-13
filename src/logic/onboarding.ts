import { readStorageItem, removeStorageItem, writeStorageItem } from '../platform/storage.ts'
export const ONBOARDING_STORAGE_KEY = 'gimme-golf-onboarding-v1'

export type OnboardingCompletionStatus = 'completed' | 'skipped'

interface PersistedOnboardingState {
  completionStatus: OnboardingCompletionStatus
}

export interface OnboardingVisibilityState {
  completionStatus: OnboardingCompletionStatus | null
  isReplayRequested: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isOnboardingCompletionStatus(value: unknown): value is OnboardingCompletionStatus {
  return value === 'completed' || value === 'skipped'
}

function isPersistedOnboardingState(value: unknown): value is PersistedOnboardingState {
  return isRecord(value) && isOnboardingCompletionStatus(value.completionStatus)
}

export function saveOnboardingCompletionStatus(completionStatus: OnboardingCompletionStatus): void {
  const nextState: PersistedOnboardingState = { completionStatus }
  writeStorageItem(ONBOARDING_STORAGE_KEY, JSON.stringify(nextState))
}

export function loadOnboardingCompletionStatus(): OnboardingCompletionStatus | null {
  const rawValue = readStorageItem(ONBOARDING_STORAGE_KEY)
  if (!rawValue) {
    return null
  }

  try {
    const parsedValue = JSON.parse(rawValue)
    if (!isPersistedOnboardingState(parsedValue)) {
      return null
    }

    return parsedValue.completionStatus
  } catch {
    return null
  }
}

export function clearOnboardingCompletionStatus(): void {
  removeStorageItem(ONBOARDING_STORAGE_KEY)
}

export function shouldShowOnboarding({
  completionStatus,
  isReplayRequested,
}: OnboardingVisibilityState): boolean {
  return isReplayRequested || completionStatus === null
}
