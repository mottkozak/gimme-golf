import {
  CHALLENGE_LAYOUT_OPTIONS,
  getStepTitle,
  normalizeExpectedScore,
  type OnboardingDraft,
  type OnboardingStep,
} from '../../logic/authOnboarding.ts'
import ChallengeCardView from '../ChallengeCardView.tsx'
import { getPersonalCardArtwork } from '../../logic/cardArtwork.ts'
import type { PersonalCard } from '../../types/cards.ts'

interface AuthOnboardingPanelProps {
  step: OnboardingStep
  draft: OnboardingDraft
  expectedScoreInput: string
  isSubmitting: boolean
  onSetStep: (step: OnboardingStep) => void
  onSetDraft: (updater: (current: OnboardingDraft) => OnboardingDraft) => void
  onSetExpectedScoreInput: (value: string) => void
  onKeepFieldVisible: (element: HTMLInputElement) => void
  onGoBack: () => void
  onGoNext: () => void
  onOpenGameplayWalkthrough: () => void
  onFinishOnboarding: () => Promise<void>
  onSelectOptionWithHaptic: () => void
  onClearStatusMessage: () => void
}

function clampExpectedScoreInput(value: string): string {
  return value.replace(/[^\d]/g, '')
}

const RECOVERY_ARTIST_SAMPLE_CARD: PersonalCard = {
  id: 'c-common-008',
  code: 'COM-008',
  name: 'Recovery Artist',
  description: 'Miss the fairway but still make bogey or better.',
  cardType: 'common',
  packId: 'classic',
  points: 1,
  eligiblePars: [4, 5],
  requiredTags: [],
  excludedTags: [],
  difficulty: 'medium',
  isPublic: false,
  rulesText: 'Success if player misses fairway off tee and still scores bogey or better.',
}

export default function AuthOnboardingPanel({
  step,
  draft,
  expectedScoreInput,
  isSubmitting,
  onSetStep,
  onSetDraft,
  onSetExpectedScoreInput,
  onKeepFieldVisible,
  onGoBack,
  onGoNext,
  onOpenGameplayWalkthrough,
  onFinishOnboarding,
  onSelectOptionWithHaptic,
  onClearStatusMessage,
}: AuthOnboardingPanelProps) {
  const recoveryArtistArtwork = getPersonalCardArtwork(RECOVERY_ARTIST_SAMPLE_CARD)

  return (
    <section className="panel stack-sm onboarding-modal auth-gate-card">
      <div className="stack-xs onboarding-modal__content">
        <h3 className="step-title onboarding-modal__step-title">{getStepTitle(step)}</h3>

        {step === 0 && (
          <div className="stack-xs">
            <img
              className="auth-gate-welcome-logo"
              src={`${import.meta.env.BASE_URL}Gimme-Golf-Bold-Logo-app.png`}
              alt="Gimme Golf"
            />
            <p className="auth-gate-welcome-tagline">Golf, but better.</p>
            <p>Play your round. Add a game anyone can win.</p>
          </div>
        )}

        {step === 1 && (
          <label className="field">
            <input
              value={draft.displayName}
              onChange={(event) =>
                onSetDraft((current) => ({ ...current, displayName: event.target.value }))
              }
              onFocus={(event) => onKeepFieldVisible(event.currentTarget)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' || event.nativeEvent.isComposing) {
                  return
                }
                event.preventDefault()
                onGoNext()
              }}
              placeholder="Your group knows you as..."
            />
          </label>
        )}

        {step === 2 && (
          <label className="field">
            <span className="label">Typical 18-hole score</span>
            <input
              type="text"
              inputMode="numeric"
              value={expectedScoreInput}
              onChange={(event) => {
                onSetExpectedScoreInput(clampExpectedScoreInput(event.target.value))
              }}
              onBlur={() => {
                const parsed = clampExpectedScoreInput(expectedScoreInput)
                const num = parsed === '' ? null : Number(parsed)
                const normalized =
                  num === null ? draft.expectedScore18 : normalizeExpectedScore(num)
                onSetDraft((current) => ({ ...current, expectedScore18: normalized }))
                onSetExpectedScoreInput(String(normalized))
              }}
              onFocus={(event) => event.currentTarget.select()}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.currentTarget.blur()
                }
              }}
            />
            <p className="muted">Ballpark is fine - keeps things fair.</p>
          </label>
        )}

        {step === 3 && (
          <div className="stack-xs auth-gate-option-list">
            {CHALLENGE_LAYOUT_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`settings-link-row ${
                  draft.challengeLayout === option.id ? 'auth-gate-option--active' : ''
                }`}
                onClick={() => {
                  onSelectOptionWithHaptic()
                  onSetDraft((current) => ({ ...current, challengeLayout: option.id }))
                }}
              >
                <strong>{option.label}</strong>
                <span className="muted">{option.helper}</span>
              </button>
            ))}
            {draft.challengeLayout === 'illustrative' && (
              <div className="auth-layout-preview-stack">
                <figure className="auth-layout-preview">
                  <p className="label auth-layout-preview__label">Illustrative</p>
                  <img
                    className="auth-layout-preview__image auth-layout-preview__image--full"
                    src={
                      recoveryArtistArtwork?.src ??
                      `${import.meta.env.BASE_URL}cards/core54/medium/COM-008-Recovery%20Artist.png`
                    }
                    alt={recoveryArtistArtwork?.alt ?? 'Recovery Artist challenge card artwork'}
                  />
                </figure>
              </div>
            )}
            {draft.challengeLayout === 'compact' && (
              <div className="auth-layout-preview-stack">
                <figure className="auth-layout-preview">
                  <p className="label auth-layout-preview__label">Compact</p>
                  <div className="auth-layout-preview__compact">
                    <ChallengeCardView
                      card={RECOVERY_ARTIST_SAMPLE_CARD}
                      selected={false}
                      expectedScore18={90}
                      showSupplementaryBadges={false}
                    />
                  </div>
                </figure>
              </div>
            )}
          </div>
        )}
      </div>

      {step === 0 ? (
        <div className="onboarding-modal__actions">
          <button type="button" onClick={onOpenGameplayWalkthrough}>
            Begin tutorial
          </button>
          <button
            type="button"
            className="button-primary"
            onClick={() => {
              onSelectOptionWithHaptic()
              onClearStatusMessage()
              onSetStep(1)
            }}
          >
            Account setup
          </button>
        </div>
      ) : (
        <div className="onboarding-modal__actions">
          <button type="button" onClick={onGoBack}>
            Back
          </button>
          {step < 3 ? (
            <button type="button" className="button-primary" onClick={onGoNext}>
              Keep going
            </button>
          ) : (
            <button
              type="button"
              className="button-primary"
              data-requires-network="true"
              onClick={() => {
                void onFinishOnboarding()
              }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Start playing'}
            </button>
          )}
        </div>
      )}
    </section>
  )
}
