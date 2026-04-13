import { useEffect, useState } from 'react'

const KEYBOARD_VISIBILITY_THRESHOLD_PX = 120

interface KeyboardAvoidanceState {
  isKeyboardVisible: boolean
  keyboardInsetPx: number
}

function toEditableElement(candidate: unknown): HTMLElement | null {
  if (!(candidate instanceof HTMLElement)) {
    return null
  }

  const tagName = candidate.tagName.toLowerCase()
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
    return candidate
  }

  if (candidate.isContentEditable) {
    return candidate
  }

  return null
}

function computeKeyboardInsetPx(): number {
  if (typeof window === 'undefined') {
    return 0
  }

  const viewport = window.visualViewport
  if (!viewport) {
    return 0
  }

  const inset = window.innerHeight - (viewport.height + viewport.offsetTop)
  return Math.max(0, Math.round(inset))
}

export function useKeyboardAvoidance(): KeyboardAvoidanceState {
  const [state, setState] = useState<KeyboardAvoidanceState>({
    isKeyboardVisible: false,
    keyboardInsetPx: 0,
  })

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const viewport = window.visualViewport

    const syncState = () => {
      const nextInsetPx = computeKeyboardInsetPx()
      const nextIsVisible = nextInsetPx > KEYBOARD_VISIBILITY_THRESHOLD_PX

      setState((currentState) => {
        if (
          currentState.isKeyboardVisible === nextIsVisible &&
          currentState.keyboardInsetPx === nextInsetPx
        ) {
          return currentState
        }

        return {
          isKeyboardVisible: nextIsVisible,
          keyboardInsetPx: nextInsetPx,
        }
      })

      if (!nextIsVisible) {
        return
      }

      const activeElement = toEditableElement(document.activeElement)
      if (!activeElement) {
        return
      }

      requestAnimationFrame(() => {
        activeElement.scrollIntoView({
          block: 'center',
          inline: 'nearest',
          behavior: 'smooth',
        })
      })
    }

    syncState()
    viewport?.addEventListener('resize', syncState)
    viewport?.addEventListener('scroll', syncState)
    window.addEventListener('focusin', syncState)

    return () => {
      viewport?.removeEventListener('resize', syncState)
      viewport?.removeEventListener('scroll', syncState)
      window.removeEventListener('focusin', syncState)
    }
  }, [])

  return state
}
