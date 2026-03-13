import type { CSSProperties } from 'react'
import { useEffect, useState } from 'react'

const LOGO_STEP_DURATION_MS = 280
const EXIT_FADE_DURATION_MS = 260

interface SplashScreenProps {
  backgroundImageSrc: string
  logoSources: readonly string[]
  durationMs: number
  onFinish: () => void
}

function SplashScreen({ backgroundImageSrc, logoSources, durationMs, onFinish }: SplashScreenProps) {
  const [isExiting, setIsExiting] = useState(false)
  const cycleDurationMs = Math.max(logoSources.length, 1) * LOGO_STEP_DURATION_MS

  useEffect(() => {
    const exitDelayMs = Math.max(durationMs - EXIT_FADE_DURATION_MS, 0)
    const exitTimeoutId = window.setTimeout(() => {
      setIsExiting(true)
    }, exitDelayMs)
    const finishTimeoutId = window.setTimeout(() => {
      onFinish()
    }, durationMs)

    return () => {
      window.clearTimeout(exitTimeoutId)
      window.clearTimeout(finishTimeoutId)
    }
  }, [durationMs, onFinish])

  return (
    <div
      className={`splash-screen ${isExiting ? 'splash-screen--exit' : ''}`}
      style={{ backgroundImage: `url("${backgroundImageSrc}")` }}
      role="status"
      aria-live="polite"
      aria-label="Loading Gimme Golf"
    >
      <div className="splash-screen__logo-stack" aria-hidden="true">
        {logoSources.map((logoSource, logoIndex) => {
          const animationStyle = {
            '--splash-logo-cycle-duration': `${cycleDurationMs}ms`,
            '--splash-logo-step-duration': `${LOGO_STEP_DURATION_MS}ms`,
            '--splash-logo-index': String(logoIndex),
          } as CSSProperties

          return (
            <img
              key={logoSource}
              className="splash-screen__logo"
              src={logoSource}
              alt=""
              loading="eager"
              decoding="async"
              fetchPriority="high"
              style={animationStyle}
            />
          )
        })}
      </div>
    </div>
  )
}

export default SplashScreen
