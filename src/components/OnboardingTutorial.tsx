import { useEffect, useId, useRef, useState } from 'react'
import { ICONS, type AppIconName } from '../app/icons.ts'
import AppIcon from './AppIcon.tsx'
import OverlayPortal from './OverlayPortal.tsx'
import type { OnboardingCompletionStatus } from '../logic/onboarding.ts'

interface TutorialStep {
  id: string
  title: string
  description: string
  detail: string
  icon: AppIconName
  preview?: {
    golfers: Array<{
      golferName: string
      strokes: number
      challengeStatus: 'completed' | 'failed'
    }>
    recapLabel: string
    cardChoice?: {
      golferName: string
      dealtCards: [string, string]
      selectedCard: string
    }
  }
}

interface OnboardingTutorialProps {
  onClose: (completionStatus: OnboardingCompletionStatus) => void
}

const TUTORIAL_STEPS: readonly TutorialStep[] = [
  {
    id: 'home',
    title: 'Home: Pick Your Mode',
    description: 'Tap a mode card to start a new round, or use Continue to jump back into a saved round.',
    detail:
      'Classic is the fastest first game; you can switch modes again from setup before tee-off.',
    icon: ICONS.teeOff,
  },
  {
    id: 'setup',
    title: 'Round Config: Course + Golfers',
    description: 'Set hole count, course style, and golfers, then press Play Round.',
    detail: 'Use Change anytime to swap modes before teeing off.',
    icon: ICONS.roundSetup,
  },
  {
    id: 'play',
    title: 'Hole Setup: Deal and Choose',
    description: 'Set par/tags, deal cards, then lock each golfer into one mission (or power-ups in Arcade).',
    detail:
      'Color chips help scan quickly: Easy=green, Medium=orange, Hard=red.',
    icon: ICONS.holePlay,
    preview: {
      golfers: [],
      recapLabel: 'Deal -> Pick 1 mission -> Start hole',
      cardChoice: {
        golferName: 'Alex',
        dealtCards: ['Fairway Finder', 'Birdie Chance'],
        selectedCard: 'Birdie Chance',
      },
    },
  },
  {
    id: 'results',
    title: 'Hole Results + Recap',
    description: 'Enter strokes, resolve mission/public outcomes, then Save to update standings.',
    detail: 'Use recap cards and leaderboard to confirm swings, then continue to the next tee.',
    icon: ICONS.holeResults,
    preview: {
      golfers: [
        {
          golferName: 'Alex',
          strokes: 4,
          challengeStatus: 'completed',
        },
        {
          golferName: 'Jordan',
          strokes: 6,
          challengeStatus: 'failed',
        },
      ],
      recapLabel: 'Save Hole -> View Recap -> Next Tee',
    },
  },
] as const

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => !element.hasAttribute('hidden') && element.getAttribute('aria-hidden') !== 'true',
  )
}

function OnboardingTutorial({ onClose }: OnboardingTutorialProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const dialogRef = useRef<HTMLElement | null>(null)
  const titleRef = useRef<HTMLHeadingElement | null>(null)
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null)
  const titleId = useId()
  const descriptionId = useId()

  const currentStep = TUTORIAL_STEPS[currentStepIndex]
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === TUTORIAL_STEPS.length - 1

  useEffect(() => {
    previouslyFocusedElementRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    const animationFrameId = window.requestAnimationFrame(() => {
      titleRef.current?.focus()
    })

    const handleDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose('skipped')
        return
      }

      if (event.key !== 'Tab') {
        return
      }

      const dialog = dialogRef.current
      if (!dialog) {
        return
      }

      const focusableElements = getFocusableElements(dialog)
      if (focusableElements.length === 0) {
        event.preventDefault()
        return
      }

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]
      const activeElement = document.activeElement

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
        return
      }

      if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    document.addEventListener('keydown', handleDocumentKeyDown)

    return () => {
      window.cancelAnimationFrame(animationFrameId)
      document.removeEventListener('keydown', handleDocumentKeyDown)
      previouslyFocusedElementRef.current?.focus()
    }
  }, [onClose])

  useEffect(() => {
    titleRef.current?.focus()
  }, [currentStepIndex])

  return (
    <OverlayPortal>
      <div className="modal-backdrop" role="presentation">
        <section
          ref={dialogRef}
          className="panel modal-card stack-sm onboarding-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
        >
          <header className="row-between onboarding-modal__header">
            <p className="label">Quick Tutorial</p>
            <span className="chip onboarding-modal__step-chip" aria-live="polite">
              Step {currentStepIndex + 1} of {TUTORIAL_STEPS.length}
            </span>
          </header>

          <section className="stack-xs onboarding-modal__content">
            <div className="step-title onboarding-modal__title">
              <AppIcon className="step-title__icon" icon={currentStep.icon} />
              <h3 id={titleId} ref={titleRef} tabIndex={-1}>
                {currentStep.title}
              </h3>
            </div>
            <p id={descriptionId}>{currentStep.description}</p>
            <p className="muted">{currentStep.detail}</p>
            {currentStep.preview && (
              <section className="onboarding-preview stack-xs" aria-label="Example hole log">
                <p className="label">Example Hole Log</p>
                <div className="onboarding-preview__rows" role="list">
                  {currentStep.preview.golfers.map((golfer) => (
                    <div key={golfer.golferName} className="onboarding-preview__row" role="listitem">
                      <span className="onboarding-preview__golfer">{golfer.golferName}</span>
                      <span className="onboarding-preview__score-bubble">{golfer.strokes}</span>
                      <span
                        className={`onboarding-preview__challenge-bubble ${
                          golfer.challengeStatus === 'completed'
                            ? 'onboarding-preview__challenge-bubble--success'
                            : 'onboarding-preview__challenge-bubble--failed'
                        }`}
                      >
                        Mission {golfer.challengeStatus === 'completed' ? 'Completed' : 'Failed'}
                      </span>
                    </div>
                  ))}
                </div>
                {currentStep.preview.cardChoice && (
                  <article className="onboarding-preview__choice" aria-label="Example mission selection">
                    <p className="onboarding-preview__choice-golfer">
                      {currentStep.preview.cardChoice.golferName}
                    </p>
                    <div className="onboarding-preview__choice-row">
                      <span className="onboarding-preview__choice-card">
                        {currentStep.preview.cardChoice.dealtCards[0]}
                      </span>
                      <span className="onboarding-preview__choice-arrow" aria-hidden="true">
                        vs
                      </span>
                      <span className="onboarding-preview__choice-card">
                        {currentStep.preview.cardChoice.dealtCards[1]}
                      </span>
                    </div>
                    <p className="onboarding-preview__choice-result">
                      Selected: <strong>{currentStep.preview.cardChoice.selectedCard}</strong>
                    </p>
                  </article>
                )}
                <p className="onboarding-preview__recap-pill">{currentStep.preview.recapLabel}</p>
              </section>
            )}
          </section>

          <footer className="stack-xs">
            <button type="button" className="onboarding-modal__skip" onClick={() => onClose('skipped')}>
              Skip
            </button>
            <div className="onboarding-modal__actions">
              <button
                type="button"
                disabled={isFirstStep}
                onClick={() => setCurrentStepIndex((value) => Math.max(0, value - 1))}
              >
                Back
              </button>
              {isLastStep ? (
                <button type="button" className="button-primary" onClick={() => onClose('completed')}>
                  Finish
                </button>
              ) : (
                <button
                  type="button"
                  className="button-primary"
                  onClick={() =>
                    setCurrentStepIndex((value) => Math.min(TUTORIAL_STEPS.length - 1, value + 1))
                  }
                >
                  Next
                </button>
              )}
            </div>
          </footer>
        </section>
      </div>
    </OverlayPortal>
  )
}

export default OnboardingTutorial
