import { useEffect, useId, useRef, useState } from 'react'
import { ICONS, type AppIconName } from '../app/icons.ts'
import AppIcon from './AppIcon.tsx'
import type { OnboardingCompletionStatus } from '../logic/onboarding.ts'

interface TutorialStep {
  id: string
  title: string
  description: string
  detail: string
  icon: AppIconName
}

interface OnboardingTutorialProps {
  onClose: (completionStatus: OnboardingCompletionStatus) => void
}

const TUTORIAL_STEPS: readonly TutorialStep[] = [
  {
    id: 'home',
    title: 'Home: Pick Your Mode',
    description: 'Choose Classic, Showtime, Wildcard, Forecast, or Arcade from the mode cards.',
    detail:
      'Classic is the easiest first round. Continue resumes a saved round, while choosing another mode starts a fresh setup.',
    icon: ICONS.teeOff,
  },
  {
    id: 'setup',
    title: 'Round Config: Course + Golfers',
    description: 'Set hole count, course style, and golfers, then press Play Round.',
    detail:
      'Use the Change button anytime to swap modes before teeing off.',
    icon: ICONS.roundSetup,
  },
  {
    id: 'play',
    title: 'Hole Setup: Deal and Choose',
    description: 'Set par/tags, deal cards, then each golfer picks one mission (or use power-ups in Arcade mode).',
    detail:
      'Card category is color-coded for quick scanning, and difficulty chips are Easy=green, Medium=orange, Hard=red.',
    icon: ICONS.holePlay,
  },
  {
    id: 'results',
    title: 'Hole Results + Recap',
    description: 'Enter strokes, resolve mission/public outcomes, then Save to update standings.',
    detail: 'Move to the next hole, and use recap cards/leaderboard to quickly see who gained points and why.',
    icon: ICONS.holeResults,
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
  )
}

export default OnboardingTutorial
