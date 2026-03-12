interface RecapHeroCardProps {
  label: string
  headline: string
  supportingText?: string
}

function RecapHeroCard({ label, headline, supportingText }: RecapHeroCardProps) {
  return (
    <section className="panel stack-xs recap-hero-card" aria-live="polite">
      <p className="label recap-hero-card__label">{label}</p>
      <p className="recap-hero-card__headline">{headline}</p>
      {supportingText ? <p className="muted recap-hero-card__supporting">{supportingText}</p> : null}
    </section>
  )
}

export default RecapHeroCard
