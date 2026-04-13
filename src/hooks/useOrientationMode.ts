import { useEffect, useState } from 'react'

function isLandscapeViewport(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  return window.matchMedia('(orientation: landscape)').matches || window.innerWidth > window.innerHeight
}

export function useOrientationMode(): 'portrait' | 'landscape' {
  const [mode, setMode] = useState<'portrait' | 'landscape'>(() =>
    isLandscapeViewport() ? 'landscape' : 'portrait',
  )

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const orientationMedia = window.matchMedia('(orientation: landscape)')

    const syncMode = () => {
      setMode(isLandscapeViewport() ? 'landscape' : 'portrait')
    }

    syncMode()
    orientationMedia.addEventListener('change', syncMode)
    window.addEventListener('resize', syncMode)

    return () => {
      orientationMedia.removeEventListener('change', syncMode)
      window.removeEventListener('resize', syncMode)
    }
  }, [])

  return mode
}
