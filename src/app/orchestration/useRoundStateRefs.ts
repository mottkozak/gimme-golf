import { useEffect, useRef } from 'react'
import type { RoundState } from '../../types/game.ts'

export interface RoundStateRefs {
  roundStateRef: { current: RoundState }
  hasSavedRoundRef: { current: boolean }
  savedRoundUpdatedAtMsRef: { current: number | null }
}

export function useRoundStateRefs(
  roundState: RoundState,
  hasSavedRound: boolean,
  savedRoundUpdatedAtMs: number | null,
): RoundStateRefs {
  const roundStateRef = useRef(roundState)
  const hasSavedRoundRef = useRef(hasSavedRound)
  const savedRoundUpdatedAtMsRef = useRef<number | null>(savedRoundUpdatedAtMs)

  useEffect(() => {
    roundStateRef.current = roundState
    hasSavedRoundRef.current = hasSavedRound
    savedRoundUpdatedAtMsRef.current = savedRoundUpdatedAtMs
  }, [hasSavedRound, roundState, savedRoundUpdatedAtMs])

  return {
    roundStateRef,
    hasSavedRoundRef,
    savedRoundUpdatedAtMsRef,
  }
}
