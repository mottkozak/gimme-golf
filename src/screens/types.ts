import type { AppScreen } from '../app/router.tsx'
import type { RoundState } from '../types/game.ts'

export type RoundStateUpdater = (currentState: RoundState) => RoundState

export interface ScreenProps {
  roundState: RoundState
  hasSavedRound: boolean
  savedRoundUpdatedAtMs: number | null
  isRoundSavePending: boolean
  roundSaveWarning: string | null
  onNavigate: (screen: AppScreen) => void
  onResumeSavedRound: () => boolean
  onResetRound: () => void
  onAbandonRound: () => void
  onReplayTutorial: () => void
  onUpdateRoundState: (updater: RoundStateUpdater) => void
}
