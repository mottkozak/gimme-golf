import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from 'react'
import { hideSplashScreen, setStatusBarStyle } from '../../capacitor.ts'
import { hydrateMirroredStorageKeys } from '../../capacitor/nativeStorage.ts'
import {
  ACTIVE_ROUND_STORAGE_MIGRATION_KEYS,
  clearRoundState,
  loadRoundStateSnapshot,
  saveRoundState,
} from '../../logic/storage.ts'
import {
  THEME_PREFERENCE_STORAGE_KEY,
  applyThemePreference,
  loadThemePreference,
} from '../../logic/preferences.ts'
import type { AppAction, AppState } from '../stateMachine.ts'
import { getRecoveryLifecycleMessage } from './recoveryMessages.ts'

interface UseAppStartupOrchestrationArgs {
  appState: AppState
  dispatch: Dispatch<AppAction>
  hasSplashIntroFinished: boolean
  hasSavedRoundRef: MutableRefObject<boolean>
  isModeDetailOpen: boolean
  setLifecycleMessage: Dispatch<SetStateAction<string | null>>
}

export function useAppStartupOrchestration({
  appState,
  dispatch,
  hasSplashIntroFinished,
  hasSavedRoundRef,
  isModeDetailOpen,
  setLifecycleMessage,
}: UseAppStartupOrchestrationArgs): void {
  useEffect(() => {
    if (hasSplashIntroFinished) return
    const frameId = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        void hideSplashScreen()
      })
    })
    return () => cancelAnimationFrame(frameId)
  }, [hasSplashIntroFinished])

  useEffect(() => {
    if (!appState.shouldPersistRoundState) {
      return
    }

    dispatch({ type: 'mark_persisted', savedAtMs: saveRoundState(appState.roundState) })
  }, [appState.roundState, appState.shouldPersistRoundState, dispatch])

  useEffect(() => {
    let isCancelled = false

    void (async () => {
      await hydrateMirroredStorageKeys([
        ...ACTIVE_ROUND_STORAGE_MIGRATION_KEYS,
        THEME_PREFERENCE_STORAGE_KEY,
      ])

      if (isCancelled) {
        return
      }

      const savedRoundSnapshot = loadRoundStateSnapshot()
      if (!hasSavedRoundRef.current && savedRoundSnapshot.roundState) {
        dispatch({
          type: 'resume_saved_round',
          savedRoundState: savedRoundSnapshot.roundState,
          savedAtMs: savedRoundSnapshot.savedAtMs,
        })
      }

      const recoveryMessage = getRecoveryLifecycleMessage(savedRoundSnapshot.recoveryReason)
      if (recoveryMessage) {
        setLifecycleMessage(recoveryMessage)
      }
    })()

    return () => {
      isCancelled = true
    }
  }, [dispatch, hasSavedRoundRef, setLifecycleMessage])

  useEffect(() => {
    const theme = loadThemePreference()
    applyThemePreference(theme)
    setStatusBarStyle(theme)
  }, [])

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'auto',
    })
  }, [appState.activeScreen, isModeDetailOpen])

  useEffect(() => {
    if (appState.activeScreen !== 'endRound') {
      return
    }

    clearRoundState()
    dispatch({ type: 'clear_saved_round_flag' })
  }, [appState.activeScreen, dispatch])

}
