import { useEffect, useRef } from 'react'

export function useAutoClearMessage(
  message: string | null,
  clearMessage: () => void,
  timeoutMs: number,
): void {
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }

    if (!message) {
      return
    }

    timerRef.current = window.setTimeout(() => {
      clearMessage()
      timerRef.current = null
    }, timeoutMs)

    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [clearMessage, message, timeoutMs])
}
