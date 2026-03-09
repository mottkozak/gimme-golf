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
  const readyPlayersCount = playersRequiringSelection.filter((player) => {
    const selectedCardId = currentHoleCards.selectedCardIdByPlayerId[player.id]
    return typeof selectedCardId === 'string' && selectedCardId.length > 0
  }).length
  const canSelectCards = isDrawTwoPickOne && !isNoMercyHole
  const readinessSummary =
    playersRequiringSelection.length > 0
      ? `${readyPlayersCount} / ${playersRequiringSelection.length} golfers ready`
      : 'All golfers ready'
  const missionHelperCopy = canSelectCards
    ? 'Pick one mission per golfer.'
    : isNoMercyHole
      ? 'No Mercy active. Harder missions were forced this hole.'
      : 'Missions are auto-assigned for this hole.'

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
    <section className="screen stack-sm hole-play-screen">
      <header className="screen__header hole-play-header">
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
        <section className="panel stack-xs hole-setup-card">
          <div className="hole-setup-control-group">
            <span className="label hole-setup-label">Par (confirm)</span>
            <div className="segmented-control segmented-control--four" role="group" aria-label="Par selection">
              {[3, 4, 5, 6].map((par) => (
                <button
                  key={par}
                  type="button"
                  className={`segmented-control__button ${
                    currentHole.par === par ? 'segmented-control__button--active' : ''
                  }`}
                  onClick={() => setPar(par)}
                >
                  {par}
                </button>
              ))}
            </div>
          </div>

          <div className="hole-setup-control-group">
            <span className="label hole-setup-label hole-setup-label--optional">Course Tags (optional)</span>
            {currentHole.tags.length === 0 && (
              <p className="muted hole-setup-tags-empty">No tags selected</p>
            )}
            <div className="tag-grid hole-setup-tag-grid">
              {HOLE_TAG_OPTIONS.map((option) => {
                const isActive = currentHole.tags.includes(option.tag)
                return (
                  <button
                    key={option.tag}
                    type="button"
                    className={`tag-pill hole-setup-tag-pill ${isActive ? 'active' : ''}`}
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

          <button type="button" className="button-primary hole-setup-deal-button" onClick={dealForCurrentHole}>
            {isPowerUpsMode ? 'Deal Power Ups' : 'Deal Cards'}
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
          <p className="muted hole-cards-helper">{missionHelperCopy}</p>

          <section className="stack-sm hole-draft-list">
            {roundState.players.map((player) => {
              const dealtCards = currentHoleCards.dealtPersonalCardsByPlayerId[player.id] ?? []
              const offerState = currentHoleCards.personalCardOfferByPlayerId[player.id]
              const selectedCardId = currentHoleCards.selectedCardIdByPlayerId[player.id]
              const isPlayerReady =
                typeof selectedCardId === 'string' && selectedCardId.length > 0

              return (
                <article key={player.id} className="panel stack-xs hole-draft-player">
                  <header className="row-between setup-row-wrap">
                    <strong>{player.name}</strong>
                    {canSelectCards && (
                      <span className={`status-pill ${isPlayerReady ? 'status-success' : 'status-pending'}`}>
                        {isPlayerReady ? 'Ready' : 'Pending'}
                      </span>
                    )}
                  </header>

                  <div className="stack-xs hole-draft-options">
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
                        <ChallengeCardView
                          key={card.id}
                          card={card}
                          selected={selectedCardId === card.id}
                          offerKind={offerKind}
                          onSelect={
                            canSelectCards ? () => selectCard(player.id, card.id) : undefined
                          }
                        />
                      )
                    })}

                    {dealtCards.length === 0 && (
                      <p className="muted">No personal cards available from enabled packs.</p>
                    )}
                  </div>
                </article>
              )
            })}
          </section>

          <section className="panel stack-xs hole-public-preview">
            <div className="row-between setup-row-wrap">
              <h3>Public Cards</h3>
              <span className="chip">{currentHoleCards.publicCards.length}</span>
            </div>
            {currentHoleCards.publicCards.length === 0 && (
              <p className="muted">No public cards for this hole.</p>
            )}
            {currentHoleCards.publicCards.length > 0 && (
              <>
                <div className="stack-xs hole-public-preview__list">
                  {currentHoleCards.publicCards.map((card) => (
                    <PublicCardView key={card.id} card={card} />
                  ))}
                </div>
                <p className="muted hole-public-preview__helper">Preview only. Resolve on Hole Results.</p>
              </>
            )}
          </section>

          <section className="panel stack-xs hole-cards-footer">
            <p className="value hole-cards-footer__readiness">{readinessSummary}</p>
            <button
              type="button"
              className="button-primary hole-cards-footer__cta"
              disabled={!allPlayersHaveSelection}
              onClick={continueToResults}
            >
              Continue
            </button>
            {!allPlayersHaveSelection && (
              <p className="muted">Pick one mission for each golfer to continue.</p>
            )}
          </section>
        </>
      )}
    </section>
  )
}

export default HolePlayScreen
