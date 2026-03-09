import { HOLE_TAG_ICON_BY_TAG, ICONS } from '../app/icons.ts'
import ChallengeCardView from '../components/ChallengeCardView.tsx'
import FeaturedHoleBanner from '../components/FeaturedHoleBanner.tsx'
import PowerUpCard from '../components/PowerUpCard.tsx'
import PublicCardView from '../components/PublicCardView.tsx'
import { createEmptyHoleCardsState } from '../logic/dealCards.ts'
import { prepareCurrentHoleForPlay } from '../logic/holeFlow.ts'
import { getAssignedPowerUp, createEmptyHolePowerUpState } from '../logic/powerUps.ts'
import { HOLE_TAG_OPTIONS, normalizePar, toggleHoleTag } from '../logic/roundSetup.ts'
import { incrementHoleTapCount } from '../logic/uxMetrics.ts'
import type { RoundState } from '../types/game.ts'
import type { HoleTag } from '../types/cards.ts'
import type { ScreenProps } from './types.ts'

function HolePlayScreen({ roundState, onNavigate, onUpdateRoundState }: ScreenProps) {
  const currentHoleIndex = roundState.currentHoleIndex
  const currentHole = roundState.holes[currentHoleIndex]
  const currentHoleCards = roundState.holeCards[currentHoleIndex]
  const currentHolePowerUps = roundState.holePowerUps[currentHoleIndex]
  const isPowerUpsMode = roundState.config.gameMode === 'powerUps'
  const isNoMercyHole = currentHole.featuredHoleType === 'no_mercy'
  const isDrawTwoPickOne =
    roundState.config.toggles.drawTwoPickOne && !roundState.config.toggles.autoAssignOne

  const hasAnyPersonalCardsDealt = roundState.players.some((player) => {
    const dealtCards = currentHoleCards.dealtPersonalCardsByPlayerId[player.id] ?? []
    return dealtCards.length > 0
  })
  const hasAnyCardsDealt = hasAnyPersonalCardsDealt || currentHoleCards.publicCards.length > 0
  const hasAnyPowerUpsDealt = roundState.players.some((player) =>
    Boolean(currentHolePowerUps?.assignedPowerUpIdByPlayerId[player.id]),
  )
  const isHolePrepared = isPowerUpsMode ? hasAnyPowerUpsDealt : hasAnyCardsDealt

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

  const updateCurrentHole = (updater: (currentState: RoundState) => RoundState) => {
    onUpdateRoundState((currentState) => {
      const nextState = updater(currentState)

      return {
        ...nextState,
        holeUxMetrics: incrementHoleTapCount(nextState.holeUxMetrics, currentState.currentHoleIndex),
      }
    })
  }

  const setPar = (nextPar: number) => {
    updateCurrentHole((currentState) => {
      const holes = [...currentState.holes]
      const updatedHole = {
        ...holes[currentState.currentHoleIndex],
        par: normalizePar(nextPar),
      }
      holes[currentState.currentHoleIndex] = updatedHole

      const holeCards = [...currentState.holeCards]
      holeCards[currentState.currentHoleIndex] = createEmptyHoleCardsState(
        currentState.players,
        updatedHole.holeNumber,
      )

      const holePowerUps = [...currentState.holePowerUps]
      holePowerUps[currentState.currentHoleIndex] = createEmptyHolePowerUpState(
        currentState.players,
        updatedHole.holeNumber,
      )

      return {
        ...currentState,
        holes,
        holeCards,
        holePowerUps,
      }
    })
  }

  const setHoleTag = (tag: HoleTag) => {
    updateCurrentHole((currentState) => {
      const holes = [...currentState.holes]
      const hole = holes[currentState.currentHoleIndex]

      const updatedHole = {
        ...hole,
        tags: toggleHoleTag(hole.tags, tag),
      }
      holes[currentState.currentHoleIndex] = updatedHole

      const holeCards = [...currentState.holeCards]
      holeCards[currentState.currentHoleIndex] = createEmptyHoleCardsState(
        currentState.players,
        updatedHole.holeNumber,
      )

      const holePowerUps = [...currentState.holePowerUps]
      holePowerUps[currentState.currentHoleIndex] = createEmptyHolePowerUpState(
        currentState.players,
        updatedHole.holeNumber,
      )

      return {
        ...currentState,
        holes,
        holeCards,
        holePowerUps,
      }
    })
  }

  const dealForCurrentHole = () => {
    updateCurrentHole((currentState) => prepareCurrentHoleForPlay(currentState))
  }

  const selectCard = (playerId: string, cardId: string) => {
    updateCurrentHole((currentState) => {
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
    updateCurrentHole((currentState) => {
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

  const continueToResults = () => {
    onUpdateRoundState((currentState) => ({
      ...currentState,
      holeUxMetrics: incrementHoleTapCount(currentState.holeUxMetrics, currentState.currentHoleIndex),
    }))
    onNavigate('holeResults')
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

      {!isHolePrepared && (
        <section className="panel stack-xs">
          <div className="row-between">
            <strong>Hole Setup</strong>
            <span className="chip">Par {currentHole.par}</span>
          </div>
          <p className="muted">Confirm the hole details, then deal once to start play.</p>

          <div className="stack-xs">
            <span className="label">Par</span>
            <div className="button-row">
              {[3, 4, 5, 6].map((par) => (
                <button
                  key={par}
                  type="button"
                  className={currentHole.par === par ? 'button-primary' : ''}
                  onClick={() => setPar(par)}
                >
                  Par {par}
                </button>
              ))}
            </div>
          </div>

          <div className="stack-xs">
            <span className="label">Hole Tags</span>
            <div className="tag-grid">
              {HOLE_TAG_OPTIONS.map((option) => {
                const isActive = currentHole.tags.includes(option.tag)
                return (
                  <button
                    key={option.tag}
                    type="button"
                    className={`tag-pill ${isActive ? 'active' : ''}`}
                    onClick={() => setHoleTag(option.tag)}
                  >
                    <img
                      className="tag-pill__icon"
                      src={HOLE_TAG_ICON_BY_TAG[option.tag]}
                      alt=""
                      aria-hidden="true"
                    />
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>

          <button type="button" className="button-primary" onClick={dealForCurrentHole}>
            <img className="button-icon" src={ICONS.dealCards} alt="" aria-hidden="true" />
            {isPowerUpsMode
              ? `Deal Power Ups For Hole ${currentHole.holeNumber}`
              : `Deal Cards For Hole ${currentHole.holeNumber}`}
          </button>
        </section>
      )}

      {isPowerUpsMode && isHolePrepared && (
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
              Declare your power-up before using it. Unused power-ups expire at the end of this
              hole.
            </p>
            <button type="button" className="button-primary" onClick={continueToResults}>
              <img className="button-icon" src={ICONS.holeResults} alt="" aria-hidden="true" />
              Continue To Hole Results
            </button>
          </section>
        </>
      )}

      {!isPowerUpsMode && isHolePrepared && (
        <>
          <section className="stack-sm">
            {roundState.players.map((player) => {
              const dealtCards = currentHoleCards.dealtPersonalCardsByPlayerId[player.id] ?? []
              const offerState = currentHoleCards.personalCardOfferByPlayerId[player.id]
              const selectedCardId = currentHoleCards.selectedCardIdByPlayerId[player.id]
              const selectedCard = dealtCards.find((card) => card.id === selectedCardId) ?? null

              return (
                <article key={player.id} className="panel stack-xs">
                  <div className="row-between">
                    <strong>{player.name}</strong>
                    <span className="chip">
                      Selected: {selectedCard ? `${selectedCard.code} - ${selectedCard.name}` : 'None'}
                    </span>
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
              onClick={continueToResults}
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
