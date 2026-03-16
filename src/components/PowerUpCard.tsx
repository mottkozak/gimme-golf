import type { PowerUp } from '../data/powerUps.ts'

interface PowerUpCardProps {
  playerName?: string
  powerUp: PowerUp
  used?: boolean
  onUse?: () => void
  showPlayerName?: boolean
  showCategoryChips?: boolean
  showUseButton?: boolean
}

function PowerUpCard({
  playerName,
  powerUp,
  used = false,
  onUse,
  showPlayerName = true,
  showCategoryChips = true,
  showUseButton = true,
}: PowerUpCardProps) {
  const effectivePlayerName = playerName?.trim() || 'Player'
  const onUsePowerUp = onUse ?? (() => undefined)
  const shouldRenderHeader = showPlayerName || showCategoryChips

  return (
    <article className={`panel power-up-card stack-xs ${used ? 'power-up-card--used' : ''}`}>
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
