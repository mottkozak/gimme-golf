import { useEffect, useState } from 'react'

const LOGO_ROTATION_INTERVAL_MS = 140
const EXIT_FADE_DURATION_MS = 260

interface SplashScreenProps {
  backgroundImageSrc: string
  logoSources: readonly string[]
  durationMs: number
  onFinish: () => void
}

function SplashScreen({ backgroundImageSrc, logoSources, durationMs, onFinish }: SplashScreenProps) {
  const [activeLogoIndex, setActiveLogoIndex] = useState(0)
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    if (logoSources.length <= 1) {
      return
    }

    const intervalId = window.setInterval(() => {
      setActiveLogoIndex((currentValue) => (currentValue + 1) % logoSources.length)
    }, LOGO_ROTATION_INTERVAL_MS)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [logoSources.length])

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
        {logoSources.map((logoSource, logoIndex) => (
          <img
            key={logoSource}
            className={`splash-screen__logo ${logoIndex === activeLogoIndex ? 'splash-screen__logo--active' : ''}`}
            src={logoSource}
            alt=""
            loading="eager"
            decoding="async"
            fetchPriority="high"
          />
        ))}
      </div>
    </div>
  )
}

export default SplashScreen
