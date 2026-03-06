import ChallengeCardView from '../components/ChallengeCardView.tsx'
import PublicCardView from '../components/PublicCardView.tsx'
import type { ScreenProps } from './types.ts'

function HolePlayScreen({ roundState, onNavigate, onUpdateRoundState }: ScreenProps) {
  const currentHole = roundState.holes[roundState.currentHoleIndex]
  const currentHoleCards = roundState.holeCards[roundState.currentHoleIndex]
  const isDrawTwoPickOne =
    roundState.config.toggles.drawTwoPickOne && !roundState.config.toggles.autoAssignOne

  const allPlayersHaveSelection = roundState.players.every((player) => {
    const selectedCardId = currentHoleCards.selectedCardIdByPlayerId[player.id]
    return typeof selectedCardId === 'string' && selectedCardId.length > 0
  })

  const hasAnyCardsDealt = roundState.players.some((player) => {
    const dealtCards = currentHoleCards.dealtPersonalCardsByPlayerId[player.id] ?? []
    return dealtCards.length > 0
  })

  const selectCard = (playerId: string, cardId: string) => {
    onUpdateRoundState((currentState) => {
      const holeCards = [...currentState.holeCards]
      const holeCardState = holeCards[currentState.currentHoleIndex]

      holeCards[currentState.currentHoleIndex] = {
        ...holeCardState,
        selectedCardIdByPlayerId: {
          ...holeCardState.selectedCardIdByPlayerId,
          [playerId]: cardId,
        },
      }

      return {
        ...currentState,
        holeCards,
      }
    })
  }

  return (
    <section className="screen stack-sm">
      <header className="screen__header">
        <h2>Hole Cards</h2>
        <p className="muted">
          Hole {currentHole.holeNumber} | Par {currentHole.par}
        </p>
      </header>

      {!hasAnyCardsDealt && (
        <section className="panel stack-xs">
          <p className="muted">No cards dealt for this hole yet.</p>
          <button type="button" onClick={() => onNavigate('holeSetup')}>
            Back To Hole Setup
          </button>
        </section>
      )}

      {hasAnyCardsDealt && (
        <>
          <section className="stack-sm">
            {roundState.players.map((player) => {
              const dealtCards = currentHoleCards.dealtPersonalCardsByPlayerId[player.id] ?? []
              const selectedCardId = currentHoleCards.selectedCardIdByPlayerId[player.id]

              return (
                <article key={player.id} className="panel stack-xs">
                  <div className="row-between">
                    <strong>{player.name}</strong>
                    <span className="chip">Selected: {selectedCardId ?? 'None'}</span>
                  </div>

                  <div className="stack-xs">
                    {dealtCards.map((card) => (
                      <div key={card.id} className="stack-xs">
                        <ChallengeCardView card={card} selected={selectedCardId === card.id} />
                        {isDrawTwoPickOne && (
                          <button
                            type="button"
                            className={selectedCardId === card.id ? 'button-primary' : ''}
                            onClick={() => selectCard(player.id, card.id)}
                          >
                            {selectedCardId === card.id ? 'Selected' : 'Choose This Card'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {!isDrawTwoPickOne && (
                    <p className="muted">Auto-assign mode enabled. Card assigned automatically.</p>
                  )}
                </article>
              )
            })}
          </section>

          <section className="stack-xs">
            <h3>Public Cards (Preview Only)</h3>
            {currentHoleCards.publicCards.length === 0 && (
              <p className="panel muted">No public cards enabled for this round.</p>
            )}
            {currentHoleCards.publicCards.map((card) => (
              <PublicCardView key={card.id} card={card} />
            ))}
            <p className="muted">Public Chaos/Prop cards are resolved on the Hole Results screen.</p>
          </section>

          <section className="panel stack-xs">
            <button
              type="button"
              className="button-primary"
              disabled={!allPlayersHaveSelection}
              onClick={() => onNavigate('holeResults')}
            >
              Continue To Hole Results
            </button>
            {!allPlayersHaveSelection && (
              <p className="muted">Each golfer must have one selected personal card.</p>
            )}
          </section>
        </>
      )}
    </section>
  )
}

export default HolePlayScreen
