import { ICONS } from '../app/icons.ts'
import ChallengeCardView from '../components/ChallengeCardView.tsx'
import FeaturedHoleBanner from '../components/FeaturedHoleBanner.tsx'
import PowerUpCard from '../components/PowerUpCard.tsx'
import PublicCardView from '../components/PublicCardView.tsx'
import { getAssignedPowerUp } from '../logic/powerUps.ts'
import type { ScreenProps } from './types.ts'

function HolePlayScreen({ roundState, onNavigate, onUpdateRoundState }: ScreenProps) {
  const currentHole = roundState.holes[roundState.currentHoleIndex]
  const currentHoleCards = roundState.holeCards[roundState.currentHoleIndex]
  const currentHolePowerUps = roundState.holePowerUps[roundState.currentHoleIndex]
  const isPowerUpsMode = roundState.config.gameMode === 'powerUps'
  const isNoMercyHole = currentHole.featuredHoleType === 'no_mercy'
  const isDrawTwoPickOne =
    roundState.config.toggles.drawTwoPickOne && !roundState.config.toggles.autoAssignOne

  const playersRequiringSelection = isDrawTwoPickOne && !isNoMercyHole
    ? roundState.players.filter((player) => {
        const dealtCards = currentHoleCards.dealtPersonalCardsByPlayerId[player.id] ?? []
        return dealtCards.length > 0
      })
    : []

  const allPlayersHaveSelection = playersRequiringSelection.every((player) => {
    const selectedCardId = currentHoleCards.selectedCardIdByPlayerId[player.id]
    return typeof selectedCardId === 'string' && selectedCardId.length > 0
  })

  const hasAnyPersonalCardsDealt = roundState.players.some((player) => {
    const dealtCards = currentHoleCards.dealtPersonalCardsByPlayerId[player.id] ?? []
    return dealtCards.length > 0
  })
  const hasAnyCardsDealt = hasAnyPersonalCardsDealt || currentHoleCards.publicCards.length > 0
  const hasAnyPowerUpsDealt = roundState.players.some((player) => {
    return Boolean(currentHolePowerUps?.assignedPowerUpIdByPlayerId[player.id])
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

  const markPowerUpUsed = (playerId: string) => {
    onUpdateRoundState((currentState) => {
      const holePowerUps = [...currentState.holePowerUps]
      const currentHolePowerUpState = holePowerUps[currentState.currentHoleIndex]
      if (!currentHolePowerUpState) {
        return currentState
      }

      holePowerUps[currentState.currentHoleIndex] = {
        ...currentHolePowerUpState,
        usedPowerUpByPlayerId: {
          ...currentHolePowerUpState.usedPowerUpByPlayerId,
          [playerId]: true,
        },
      }

      return {
        ...currentState,
        holePowerUps,
      }
    })
  }

  return (
    <section className="screen stack-sm">
      <header className="screen__header">
        <div className="screen-title">
          <img
            className="screen-title__icon"
            src={isPowerUpsMode ? ICONS.holePlay : ICONS.dealCards}
            alt=""
            aria-hidden="true"
          />
          <h2>{isPowerUpsMode ? 'Hole Power Ups' : 'Hole Cards'}</h2>
        </div>
        <p className="muted">
          Hole {currentHole.holeNumber} | Par {currentHole.par}
        </p>
      </header>

      <FeaturedHoleBanner featuredHoleType={currentHole.featuredHoleType} compact />

      {isPowerUpsMode && !hasAnyPowerUpsDealt && (
        <section className="panel stack-xs">
          <p className="muted">No power-ups dealt for this hole yet.</p>
          <button type="button" onClick={() => onNavigate('holeSetup')}>
            Back To Hole Setup
          </button>
        </section>
      )}

      {!isPowerUpsMode && !hasAnyCardsDealt && (
        <section className="panel stack-xs">
          <p className="muted">No cards dealt for this hole yet.</p>
          <button type="button" onClick={() => onNavigate('holeSetup')}>
            Back To Hole Setup
          </button>
        </section>
      )}

      {isPowerUpsMode && hasAnyPowerUpsDealt && (
        <>
          <section className="stack-sm">
            {roundState.players.map((player) => {
              const powerUp = getAssignedPowerUp(currentHolePowerUps, player.id)
              const used = currentHolePowerUps?.usedPowerUpByPlayerId[player.id] ?? false

              if (!powerUp) {
                return (
                  <article key={player.id} className="panel stack-xs">
                    <strong>{player.name}</strong>
                    <p className="muted">No power-up assigned for this hole.</p>
                  </article>
                )
              }

              return (
                <PowerUpCard
                  key={player.id}
                  playerName={player.name}
                  powerUp={powerUp}
                  used={used}
                  onUse={() => markPowerUpUsed(player.id)}
                />
              )
            })}
          </section>

          <section className="panel stack-xs">
            <p className="muted">
              Declare your power-up before using it. Unused power-ups expire at the end of this hole.
            </p>
            <button
              type="button"
              className="button-primary"
              onClick={() => onNavigate('holeResults')}
            >
              <img className="button-icon" src={ICONS.holeResults} alt="" aria-hidden="true" />
              Continue To Hole Results
            </button>
          </section>
        </>
      )}

      {!isPowerUpsMode && hasAnyCardsDealt && (
        <>
          <section className="stack-sm">
            {roundState.players.map((player) => {
              const dealtCards = currentHoleCards.dealtPersonalCardsByPlayerId[player.id] ?? []
              const offerState = currentHoleCards.personalCardOfferByPlayerId[player.id]
              const selectedCardId = currentHoleCards.selectedCardIdByPlayerId[player.id]

              return (
                <article key={player.id} className="panel stack-xs">
                  <div className="row-between">
                    <strong>{player.name}</strong>
                    <span className="chip">Selected: {selectedCardId ?? 'None'}</span>
                  </div>
                  {isDrawTwoPickOne && !isNoMercyHole && (
                    <p className="muted">
                      Choose between a safer option and a higher-upside hard option.
                    </p>
                  )}

                  <div className="stack-xs">
                    {dealtCards.map((card) => {
                      const offerKind =
                        offerState?.safeCardId === card.id && offerState?.hardCardId === null
                          ? 'single'
                          : offerState?.safeCardId === card.id
                            ? 'safe'
                            : offerState?.hardCardId === card.id
                              ? 'hard'
                              : undefined

                      return (
                        <div key={card.id} className="stack-xs">
                          <ChallengeCardView
                            card={card}
                            selected={selectedCardId === card.id}
                            offerKind={offerKind}
                          />
                          {isDrawTwoPickOne && !isNoMercyHole && (
                            <button
                              type="button"
                              className={selectedCardId === card.id ? 'button-primary' : ''}
                              onClick={() => selectCard(player.id, card.id)}
                            >
                              {selectedCardId === card.id ? 'Selected' : 'Choose This Card'}
                            </button>
                          )}
                        </div>
                      )
                    })}

                    {dealtCards.length === 0 && (
                      <p className="muted">No personal cards available from enabled packs.</p>
                    )}
                  </div>

                  {!isDrawTwoPickOne && (
                    <p className="muted">Auto-assign mode enabled. Card assigned automatically.</p>
                  )}
                  {isNoMercyHole && (
                    <p className="muted">
                      No Mercy active. Safer option removed and a harder card was forced.
                    </p>
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
              <img className="button-icon" src={ICONS.holeResults} alt="" aria-hidden="true" />
              Continue To Hole Results
            </button>
            {!allPlayersHaveSelection && (
              <p className="muted">Select one personal card for each golfer who was dealt cards.</p>
            )}
          </section>
        </>
      )}
    </section>
  )
}

export default HolePlayScreen
