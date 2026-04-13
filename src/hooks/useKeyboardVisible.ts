import { useEffect, useState } from 'react'

function isKeyboardLikelyVisible(viewportHeight: number, windowHeight: number): boolean {
  const keyboardHeight = windowHeight - viewportHeight
  return keyboardHeight > 120
}

export function useKeyboardVisible(): boolean {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) {
      return
    }

    const viewport = window.visualViewport
    const updateKeyboardVisibility = () => {
      setIsKeyboardVisible(isKeyboardLikelyVisible(viewport.height, window.innerHeight))
    }

    updateKeyboardVisibility()
    viewport.addEventListener('resize', updateKeyboardVisibility)
    viewport.addEventListener('scroll', updateKeyboardVisibility)
    return () => {
      viewport.removeEventListener('resize', updateKeyboardVisibility)
      viewport.removeEventListener('scroll', updateKeyboardVisibility)
    }
  }, [])

  return isKeyboardVisible
}
