import type { MissionStatus } from '../types/game.ts'
import BadgeChip from './BadgeChip.tsx'

interface MissionResultCardProps {
  playerName: string
  missionLabel?: string
  missionStatus: MissionStatus
  onSetStatus?: (status: Extract<MissionStatus, 'success' | 'failed'>) => void
}

function MissionResultCard({
  playerName,
  missionLabel,
  missionStatus,
  onSetStatus,
}: MissionResultCardProps) {
  const isInteractive = typeof onSetStatus === 'function'

  return (
    <article className="panel inset stack-xs hole-mission-result-card">
      <div className="row-between">
        <strong>{playerName}</strong>
        {missionLabel ? (
          <BadgeChip tone="subtle">{missionLabel}</BadgeChip>
        ) : (
          <BadgeChip tone="subtle">No challenge</BadgeChip>
        )}
      </div>

      {isInteractive && missionLabel ? (
        <div className="segmented-control hole-result-toggle-group">
          <button
            type="button"
            className={`segmented-control__button ${
              missionStatus === 'success' ? 'segmented-control__button--active' : ''
            }`}
            onClick={() => onSetStatus('success')}
          >
            Completed
          </button>
          <button
            type="button"
            className={`segmented-control__button ${
              missionStatus === 'failed' ? 'segmented-control__button--active' : ''
            }`}
            onClick={() => onSetStatus('failed')}
          >
            Failed
          </button>
        </div>
      ) : null}
    </article>
  )
}

export default MissionResultCard
