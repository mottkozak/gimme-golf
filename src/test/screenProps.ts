import type { ScreenProps } from '../app/screenContracts.ts'
import { createNewRoundState } from '../logic/roundLifecycle.ts'

interface ScreenPropOverrides extends Partial<ScreenProps> {
  roundState?: ScreenProps['roundState']
}

export function createScreenProps(overrides: ScreenPropOverrides = {}): ScreenProps {
  return {
    roundState: createNewRoundState(),
    hasSavedRound: false,
    savedRoundUpdatedAtMs: null,
    isRoundSavePending: false,
    roundSaveWarning: null,
    onNavigate: () => {},
    onResumeSavedRound: () => true,
    onResetRound: () => {},
    onAbandonRound: () => {},
    onUpdateRoundState: () => {},
    ...overrides,
  }
}
