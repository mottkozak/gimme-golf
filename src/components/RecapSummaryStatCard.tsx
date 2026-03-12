interface RecapSummaryStatCardProps {
  label: string
  value: string
  detail: string
}

function RecapSummaryStatCard({ label, value, detail }: RecapSummaryStatCardProps) {
  return (
    <article className="summary-stat recap-summary-stat-card">
      <p className="label">{label}</p>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  )
}

export default RecapSummaryStatCard
