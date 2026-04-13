import { useEffect, useState } from 'react'
import AppIcon from './AppIcon.tsx'
import { ICONS } from '../app/icons.ts'
import OverlayPortal from './OverlayPortal.tsx'

type WalkthroughCloseStatus = 'completed' | 'dismissed'

interface WalkthroughStep {
  id: string
  title: string
  description?: string
  detail?: string
  icon: string
  points: readonly string[]
}

interface GameplayOverviewWalkthroughProps {
  onClose: (status: WalkthroughCloseStatus) => void
}

const WALKTHROUGH_STEPS: readonly WalkthroughStep[] = [
  {
    id: 'core-loop',
    title: 'Every hole has a mission',
    description: 'Pick a challenge. Complete it. Earn points.',
    icon: ICONS.holePlay,
    points: [
      'Deal -> pick -> play',
      'Points only - scores stay real',
      'Big swings, fast',
    ],
  },
  {
    id: 'hole-flow',
    title: 'Same flow every hole',
    icon: ICONS.roundSetup,
    points: [
      'Set hole -> deal',
      'Play -> log',
      'Recap -> next tee',
    ],
  },
  {
    id: 'scoring-model',
    title: 'Three ways to win',
    detail: 'Lowest adjusted wins.',
    icon: ICONS.holeResults,
    points: [
      'Real - your strokes',
      'Points - from missions',
      'Adjusted - score minus points',
    ],
  },
] as const

function StepExample({ stepId }: { stepId: string }) {
  if (stepId === 'core-loop') {
    return (
      <section className="gameplay-overview-modal__example stack-xs" aria-label="Mission card examples">
        <p className="label">Example mission choices</p>
        <div className="gameplay-overview-modal__card-grid">
          <article className="panel inset gameplay-overview-modal__mini-card">
            <header className="row-between">
              <strong>Fairway Finder</strong>
              <span className="chip">+2 pts</span>
            </header>
            <p className="muted">Hit fairway and make bogey or better.</p>
          </article>
          <article className="panel inset gameplay-overview-modal__mini-card">
            <header className="row-between">
              <strong>Hero Putt</strong>
              <span className="chip">+4 pts</span>
            </header>
            <p className="muted">One-putt from 12+ feet for a momentum swing.</p>
          </article>
        </div>
      </section>
    )
  }

  if (stepId === 'scoring-model') {
    return (
      <section className="gameplay-overview-modal__example stack-xs" aria-label="Scoring example">
        <p className="label">Scoring example after Hole 4</p>
        <div className="gameplay-overview-modal__score-grid">
          <p className="gameplay-overview-modal__score-header">Golfer</p>
          <p className="gameplay-overview-modal__score-header">Real</p>
          <p className="gameplay-overview-modal__score-header">Game</p>
          <p className="gameplay-overview-modal__score-header">Adjusted</p>

          <p>Matt</p>
          <p>+4</p>
          <p>+6</p>
          <p className="gameplay-overview-modal__score-strong">-2</p>

          <p>Zach</p>
          <p>+3</p>
          <p>+3</p>
          <p>0</p>

          <p>Liam</p>
          <p>+2</p>
          <p>+1</p>
          <p>+1</p>
        </div>
      </section>
    )
  }

  if (stepId === 'hole-flow') {
    return (
      <section className="gameplay-overview-modal__example stack-xs" aria-label="Same flow example">
        <p className="label">Example: scroll score wheel + mission result</p>
        <article className="panel inset gameplay-overview-modal__flow-sample hole-results-screen--editorial stack-xs">
          <div className="row-between">
            <strong>Hole 5</strong>
            <span className="chip">Ready To Save</span>
          </div>
          <div className="gameplay-overview-modal__flow-rows" role="list">
            <div className="gameplay-overview-modal__flow-row" role="listitem">
              <span className="gameplay-overview-modal__flow-name">Matt</span>
              <div className="hole-score-strokes-picker gameplay-overview-modal__strokes-picker">
                <p className="hole-score-strokes-picker__label">Strokes</p>
                <div className="hole-score-strokes-picker__viewport">
                  <div
                    className="hole-score-button-group hole-score-button-group--wheel gameplay-overview-modal__flow-wheel"
                    role="group"
                    aria-label="Matt score"
                  >
                    <button type="button" className="hole-score-button" aria-pressed="false">
                      1
                    </button>
                    <button type="button" className="hole-score-button" aria-pressed="false">
                      2
                    </button>
                    <button type="button" className="hole-score-button" aria-pressed="false">
                      3
                    </button>
                    <button
                      type="button"
                      className="hole-score-button hole-score-button--selected"
                      aria-pressed="true"
                    >
                      4
                    </button>
                    <button type="button" className="hole-score-button" aria-pressed="false">
                      5
                    </button>
                    <button type="button" className="hole-score-button" aria-pressed="false">
                      6
                    </button>
                    <button type="button" className="hole-score-button hole-score-button--manual" aria-pressed="false">
                      7+
                    </button>
                  </div>
                </div>
                <div className="hole-score-strokes-picker__track" aria-hidden="true">
                  <div
                    className="hole-score-strokes-picker__thumb gameplay-overview-modal__flow-wheel-thumb"
                    style={{ width: '38%', left: '31%' }}
                  />
                </div>
              </div>
              <div
                className="segmented-control hole-result-toggle-group hole-score-module__mission-toggle"
                role="group"
                aria-label="Matt mission result"
              >
                <button
                  type="button"
                  className="segmented-control__button hole-score-module__mission-toggle-button hole-score-module__mission-toggle-button--failed"
                >
                  Failed
                </button>
                <button
                  type="button"
                  className="segmented-control__button hole-score-module__mission-toggle-button hole-score-module__mission-toggle-button--completed segmented-control__button--active"
                >
                  Completed
                </button>
              </div>
            </div>
          </div>
          <p className="muted">Tap score bubble, choose Completed/Failed, then save and go to recap.</p>
        </article>
      </section>
    )
  }

  return null
}

function GameplayOverviewWalkthrough({ onClose }: GameplayOverviewWalkthroughProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const currentStep = WALKTHROUGH_STEPS[currentStepIndex]
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === WALKTHROUGH_STEPS.length - 1

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return
      }
      event.preventDefault()
      onClose('dismissed')
    }

    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  return (
    <OverlayPortal>
      <div className="modal-backdrop" role="presentation">
        <section className="panel stack-sm onboarding-modal gameplay-overview-modal" role="dialog" aria-modal="true">
          <header className="row-between onboarding-modal__header">
            <p className="label">Core Walkthrough</p>
          </header>

          <section className="stack-xs onboarding-modal__content">
            <h3 className="step-title onboarding-modal__step-title">
              <AppIcon className="step-title__icon" icon={currentStep.icon} />
              {currentStep.title}
            </h3>
            {currentStep.description && <p>{currentStep.description}</p>}
            {currentStep.detail && <p className="muted">{currentStep.detail}</p>}
            <ul className="gameplay-overview-modal__points">
              {currentStep.points.map((point) => (
                <li key={`${currentStep.id}-${point}`}>{point}</li>
              ))}
            </ul>
            <StepExample stepId={currentStep.id} />
          </section>

          <footer className="stack-xs">
            <button type="button" className="onboarding-modal__skip" onClick={() => onClose('dismissed')}>
              Skip walkthrough
            </button>
            <div className="onboarding-modal__actions">
              <button
                type="button"
                disabled={isFirstStep}
                onClick={() => setCurrentStepIndex((value) => Math.max(0, value - 1))}
              >
                Previous
              </button>
              {isLastStep ? (
                <button type="button" className="button-primary" onClick={() => onClose('completed')}>
                  Start setup
                </button>
              ) : (
                <button
                  type="button"
                  className="button-primary"
                  onClick={() =>
                    setCurrentStepIndex((value) => Math.min(WALKTHROUGH_STEPS.length - 1, value + 1))
                  }
                >
                  Keep going
                </button>
              )}
            </div>
          </footer>
        </section>
      </div>
    </OverlayPortal>
  )
}

export default GameplayOverviewWalkthrough
