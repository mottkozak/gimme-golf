import type { Player, PlayerTotals } from '../types/game.ts'

interface PlayerCardProps {
  player: Player
  totals: PlayerTotals
}

function PlayerCard({ player, totals }: PlayerCardProps) {
  return (
    <article className="panel player-card">
      <header className="row-between">
        <strong>{player.name}</strong>
        <span className="chip">EXP {player.expectedScore18}</span>
      </header>
      <div className="grid-3 player-card__stats">
        <div>
          <div className="label">Real</div>
          <div className="value">{totals.realScore}</div>
        </div>
        <div>
          <div className="label">Points</div>
          <div className="value">{totals.gamePoints}</div>
        </div>
        <div>
          <div className="label">Adj</div>
          <div className="value">{totals.adjustedScore}</div>
        </div>
      </div>
    </article>
  )
}

export default PlayerCard
