import type { AppScreen } from '../app/router.tsx'
import type { RoundState } from '../types/game.ts'

export type RoundStateUpdater = (currentState: RoundState) => RoundState

export interface ScreenProps {
  roundState: RoundState
  hasSavedRound: boolean
  onNavigate: (screen: AppScreen) => void
  onResumeSavedRound: () => void
  onResetRound: () => void
  onAbandonRound: () => void
  onUpdateRoundState: (updater: RoundStateUpdater) => void
}
