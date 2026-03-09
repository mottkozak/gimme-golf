import type { MissionStatus } from '../types/game.ts'

export function isResolvedMissionStatus(status: MissionStatus): status is 'success' | 'failed' {
  return status === 'success' || status === 'failed'
}

export function getMissionStatusPillClass(missionStatus: MissionStatus): string {
  if (missionStatus === 'success') {
    return 'status-pill status-success'
  }

  if (missionStatus === 'failed') {
    return 'status-pill status-failed'
  }

  return 'status-pill status-pending'
}
