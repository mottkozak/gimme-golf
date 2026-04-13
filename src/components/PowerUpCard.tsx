import { useState } from 'react'
import type { ChallengeLayout } from '../logic/account.ts'
import type { PowerUp } from '../data/powerUps.ts'

interface PowerUpCardProps {
  playerName?: string
  powerUp: PowerUp
  layout?: ChallengeLayout
  illustrativeImageSrc?: string | null
  illustrativeImageAlt?: string
  used?: boolean
  onUse?: () => void
  showPlayerName?: boolean
  showCategoryChips?: boolean
  showUseButton?: boolean
}

function PowerUpCard({
  playerName,
  powerUp,
  layout = 'compact',
  illustrativeImageSrc,
  illustrativeImageAlt,
  used = false,
  onUse,
  showPlayerName = true,
  showCategoryChips = true,
  showUseButton = true,
}: PowerUpCardProps) {
  const effectivePlayerName = playerName?.trim() || 'Player'
  const onUsePowerUp = onUse ?? (() => undefined)
  const shouldRenderHeader = showPlayerName || showCategoryChips
  const [failedIllustrativeImageSrc, setFailedIllustrativeImageSrc] = useState<string | null>(null)
  const hasIllustrativeImage =
    layout === 'illustrative' &&
    typeof illustrativeImageSrc === 'string' &&
    illustrativeImageSrc.length > 0 &&
    illustrativeImageSrc !== failedIllustrativeImageSrc

  return (
    <article
      className={`panel power-up-card stack-xs ${used ? 'power-up-card--used' : ''} ${
        layout === 'illustrative' ? 'power-up-card--illustrative' : 'power-up-card--compact'
      }`}
    >
      {hasIllustrativeImage && (
        <figure className="power-up-card__illustration-frame">
          <img
            className="power-up-card__illustration"
            src={illustrativeImageSrc}
            alt={illustrativeImageAlt ?? `${powerUp.title} card`}
            loading="lazy"
            onError={() => setFailedIllustrativeImageSrc(illustrativeImageSrc)}
          />
        </figure>
      )}
      {shouldRenderHeader && (
        <div className="row-between">
          {showPlayerName ? <strong>{effectivePlayerName}</strong> : <span aria-hidden="true" />}
          {showCategoryChips && (
            <div className="button-row">
              {powerUp.legendary && (
                <span className="chip power-up-chip power-up-chip--legendary">Legendary</span>
              )}
              {powerUp.category && <span className="chip power-up-chip">{powerUp.category}</span>}
            </div>
          )}
        </div>
      )}

      <h3 className="power-up-title">{powerUp.title}</h3>
      <p>{powerUp.description}</p>

      {showUseButton && (
        <button
          type="button"
          className={used ? '' : 'button-primary'}
          disabled={used}
          onClick={onUsePowerUp}
        >
          {used ? 'Power Up Used' : 'Use Power Up'}
        </button>
      )}
    </article>
  )
}

export default PowerUpCard
