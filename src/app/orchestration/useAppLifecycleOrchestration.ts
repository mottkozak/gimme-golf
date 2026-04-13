import { useEffect, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from 'react'
import { addAppStateChangeListener, addBackButtonListener } from '../../capacitor.ts'
import { registerRoundLifecyclePersistence } from '../../logic/lifecyclePersistence.ts'
import { loadRoundStateSnapshot, saveRoundState } from '../../logic/storage.ts'
import type { RoundState } from '../../types/game.ts'
import type { AppScreen } from '../router.tsx'
import type { AppAction } from '../stateMachine.ts'
import { getRecoveryLifecycleMessage } from './recoveryMessages.ts'

interface UseAppLifecycleOrchestrationArgs {
  backTargetScreen: AppScreen | null
  dispatch: Dispatch<AppAction>
  hasSavedRoundRef: MutableRefObject<boolean>
  onNavigate: (screen: AppScreen) => void
  roundStateRef: MutableRefObject<RoundState>
  savedRoundUpdatedAtMsRef: MutableRefObject<number | null>
  setLifecycleMessage: Dispatch<SetStateAction<string | null>>
}

export function useAppLifecycleOrchestration({
  backTargetScreen,
  dispatch,
  hasSavedRoundRef,
  onNavigate,
  roundStateRef,
  savedRoundUpdatedAtMsRef,
  setLifecycleMessage,
}: UseAppLifecycleOrchestrationArgs): void {
  const backTargetScreenRef = useRef<AppScreen | null>(backTargetScreen)
  const onNavigateRef = useRef(onNavigate)

  useEffect(() => {
    backTargetScreenRef.current = backTargetScreen
    onNavigateRef.current = onNavigate
  }, [backTargetScreen, onNavigate])

  useEffect(() => {
    return addAppStateChangeListener((isActive) => {
      if (!isActive) {
        if (hasSavedRoundRef.current) {
          saveRoundState(roundStateRef.current)
        }
        return
      }

      const persistedSnapshot = loadRoundStateSnapshot()
      if (
        persistedSnapshot.roundState &&
        typeof persistedSnapshot.savedAtMs === 'number' &&
        (savedRoundUpdatedAtMsRef.current === null ||
          persistedSnapshot.savedAtMs > savedRoundUpdatedAtMsRef.current)
      ) {
        dispatch({
          type: 'resume_saved_round',
          savedRoundState: persistedSnapshot.roundState,
          savedAtMs: persistedSnapshot.savedAtMs,
        })
      }

      if (hasSavedRoundRef.current) {
        const recoveryMessage = getRecoveryLifecycleMessage(persistedSnapshot.recoveryReason)
        setLifecycleMessage(recoveryMessage ?? 'Welcome back. Your round is ready to resume.')
      }
    })
  }, [dispatch, hasSavedRoundRef, roundStateRef, savedRoundUpdatedAtMsRef, setLifecycleMessage])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    return registerRoundLifecyclePersistence({
      windowObject: window,
      hasSavedRound: () => hasSavedRoundRef.current,
      persistRoundState: () => {
        saveRoundState(roundStateRef.current)
      },
    })
  }, [hasSavedRoundRef, roundStateRef])

  useEffect(() => {
    return addBackButtonListener(() => {
      const target = backTargetScreenRef.current
      if (target) {
        onNavigateRef.current(target)
        return true
      }
      return false
    })
  }, [])
}
