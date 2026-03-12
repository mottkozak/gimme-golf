type MissionStatusTone = 'ready' | 'pending' | 'neutral'

interface MissionStatusPillProps {
  label: string
  tone: MissionStatusTone
}

function MissionStatusPill({ label, tone }: MissionStatusPillProps) {
  return <span className={`status-pill mission-status-pill mission-status-pill--${tone}`}>{label}</span>
}

export default MissionStatusPill
