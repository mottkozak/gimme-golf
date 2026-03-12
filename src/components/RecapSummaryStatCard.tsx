interface RecapSummaryStatCardProps {
  label: string
  value: string
  detail: string
  valueClassName?: string
}

function RecapSummaryStatCard({ label, value, detail, valueClassName }: RecapSummaryStatCardProps) {
  return (
    <article className="summary-stat recap-summary-stat-card">
      <p className="label">{label}</p>
      <strong className={['recap-summary-stat-card__value', valueClassName ?? ''].filter(Boolean).join(' ')}>
        {value}
      </strong>
      <p>{detail}</p>
    </article>
  )
}

export default RecapSummaryStatCard
