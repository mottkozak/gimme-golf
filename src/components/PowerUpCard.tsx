import type { PowerUp } from '../data/powerUps.ts'

interface PowerUpCardProps {
  playerName: string
  powerUp: PowerUp
  used: boolean
  onUse: () => void
}

function PowerUpCard({ playerName, powerUp, used, onUse }: PowerUpCardProps) {
  return (
    <article className={`panel power-up-card stack-xs ${used ? 'power-up-card--used' : ''}`}>
      <div className="row-between">
        <strong>{playerName}</strong>
        <div className="button-row">
          {powerUp.legendary && <span className="chip power-up-chip power-up-chip--legendary">Legendary</span>}
          {powerUp.category && <span className="chip power-up-chip">{powerUp.category}</span>}
        </div>
      </div>

      <h3 className="power-up-title">{powerUp.title}</h3>
      <p>{powerUp.description}</p>

      <button
        type="button"
        className={used ? '' : 'button-primary'}
        disabled={used}
        onClick={onUse}
      >
        {used ? 'Power Up Used' : 'Use Power Up'}
      </button>
    </article>
  )
}

export default PowerUpCard
