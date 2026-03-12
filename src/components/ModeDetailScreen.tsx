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
    <section className={`screen mode-detail-screen mode-tone--${mode.toneClassName}`}>
      <article className="mode-spotlight">
        <button
          type="button"
          className="mode-spotlight__back mode-spotlight__back--floating"
          aria-label="Back"
          onClick={onBack}
        >
          <AppIcon className="mode-spotlight__back-icon" icon="arrow_back" />
        </button>

        <section className="mode-spotlight__hero" aria-label={`${mode.name} mode details`}>
          <div className="mode-spotlight__emblem" aria-hidden="true">
            <AppIcon className="mode-spotlight__icon" icon={mode.icon} />
          </div>
          {mode.isPremium && <span className="chip mode-spotlight__premium-chip">Premium</span>}
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
