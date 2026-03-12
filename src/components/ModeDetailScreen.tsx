import AppIcon from './AppIcon.tsx'
import type { LandingModeDefinition } from '../logic/landingModes.ts'

interface ModeDetailScreenProps {
  mode: LandingModeDefinition
  hasSavedRoundProgress: boolean
  onBack: () => void
  onPlay: () => void
}

function ModeDetailScreen({
  mode,
  hasSavedRoundProgress,
  onBack,
  onPlay,
}: ModeDetailScreenProps) {
  return (
    <section className="screen mode-detail-screen">
      <article className={`mode-spotlight mode-tone--${mode.toneClassName}`}>
        <header className="mode-spotlight__header">
          <button
            type="button"
            className="mode-spotlight__back"
            aria-label="Back"
            onClick={onBack}
          >
            <AppIcon className="mode-spotlight__back-icon" icon="arrow_back" />
          </button>
          <p className="mode-spotlight__header-label">Game Mode</p>
          <span className="mode-spotlight__header-spacer" aria-hidden="true" />
        </header>

        <section className="mode-spotlight__hero" aria-label={`${mode.name} mode details`}>
          <div className="mode-spotlight__emblem" aria-hidden="true">
            <AppIcon className="mode-spotlight__icon" icon={mode.icon} />
          </div>
          <h2 className="mode-spotlight__title">{mode.name}</h2>
          <p className="mode-spotlight__summary">{mode.tagline}</p>
          <p className="mode-spotlight__description">{mode.description}</p>
        </section>

        {hasSavedRoundProgress && (
          <section className="mode-spotlight__callout" role="status" aria-live="polite">
            <p className="label">Saved Round In Progress</p>
            <p>
              Starting {mode.name} opens a new setup and replaces in-progress local hole data.
            </p>
          </section>
        )}

        <section className="mode-spotlight__footer">
          <button
            type="button"
            className="mode-spotlight__cta"
            onClick={onPlay}
          >
            {mode.ctaLabel}
            <AppIcon className="button-icon" icon="play_arrow" />
          </button>
        </section>
      </article>
    </section>
  )
}

export default ModeDetailScreen
