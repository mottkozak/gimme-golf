import { useEffect, useRef } from 'react'
import { HOLE_TAG_ICON_BY_TAG, ICONS } from '../app/icons.ts'
import AppIcon from '../components/AppIcon.tsx'
import ChallengeCardView from '../components/ChallengeCardView.tsx'
import FeaturedHoleBanner from '../components/FeaturedHoleBanner.tsx'
import GolferMissionModule from '../components/GolferMissionModule.tsx'
import HoleActionPanel from '../components/HoleActionPanel.tsx'
import HolePublicCardSection from '../components/HolePublicCardSection.tsx'
import PowerUpCard from '../components/PowerUpCard.tsx'
import PublicCardView from '../components/PublicCardView.tsx'
import { trackCardSelected, trackHoleStarted } from '../logic/analytics.ts'
import { createEmptyHoleCardsState } from '../logic/dealCards.ts'
import { prepareCurrentHoleForPlay } from '../logic/holeFlow.ts'
import { getDisplayPlayerName } from '../logic/playerNames.ts'
import {
  getAssignedCurse,
  getAssignedPowerUp,
  createEmptyHolePowerUpState,
} from '../logic/powerUps.ts'
import { HOLE_TAG_OPTIONS, normalizePar, toggleHoleTag } from '../logic/roundSetup.ts'
import { incrementHoleTapCount } from '../logic/uxMetrics.ts'
import type { RoundState } from '../types/game.ts'
import type { HoleTag } from '../types/cards.ts'
import type { ScreenProps } from './types.ts'

function HolePlayScreen({ roundState, onNavigate, onUpdateRoundState }: ScreenProps) {
  const trackedHoleIndexRef = useRef<number | null>(null)
  const currentHoleIndex = roundState.currentHoleIndex
  const currentHole = roundState.holes[currentHoleIndex]
  const currentHoleCards = roundState.holeCards[currentHoleIndex]
  const currentHolePowerUps = roundState.holePowerUps[currentHoleIndex]
  const isPowerUpsMode = roundState.config.gameMode === 'powerUps'
  const isNoMercyHole = currentHole.featuredHoleType === 'no_mercy'
  const playerNameById = Object.fromEntries(
    roundState.players.map((player, index) => [player.id, getDisplayPlayerName(player.name, index)]),
  )
  const isDrawTwoPickOne =
    roundState.config.toggles.drawTwoPickOne && !roundState.config.toggles.autoAssignOne

  const hasAnyPersonalCardsDealt = roundState.players.some((player) => {
    const dealtCards = currentHoleCards.dealtPersonalCardsByPlayerId[player.id] ?? []
    return dealtCards.length > 0
  })
  const hasAnyCardsDealt = hasAnyPersonalCardsDealt || currentHoleCards.publicCards.length > 0
  const hasAnyPowerUpsDealt = roundState.players.some((player) =>
    Boolean(
      currentHolePowerUps?.assignedPowerUpIdByPlayerId[player.id] ??
        currentHolePowerUps?.assignedCurseIdByPlayerId[player.id],
    ),
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
      ? `Selections ready: ${readyPlayersCount} / ${playersRequiringSelection.length}`
      : 'All selections ready'
  const missionHelperCopy = canSelectCards
    ? 'Pick one mission card for each golfer before continuing.'
    : isNoMercyHole
      ? 'No Mercy is active, so harder missions were auto-assigned this hole.'
      : 'Missions are auto-assigned this hole.'

  useEffect(() => {
    if (trackedHoleIndexRef.current === currentHoleIndex) {
      return
    }

    trackedHoleIndexRef.current = currentHoleIndex
    trackHoleStarted(roundState, currentHole.holeNumber, isHolePrepared)
  }, [currentHole.holeNumber, currentHoleIndex, isHolePrepared, roundState])

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
    trackCardSelected(roundState, currentHole.holeNumber, playerId, cardId)
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
    <section className={`screen stack-sm hole-play-screen ${isPowerUpsMode ? 'hole-play-screen--power-ups' : 'hole-play-screen--missions'}`}>
      <header className="screen__header hole-play-header">
        <h2>{isPowerUpsMode ? 'Hole Setup: Power Ups' : 'Hole Setup: Missions'}</h2>
        <p className="muted">
          Hole {currentHole.holeNumber} • Par {currentHole.par}
        </p>
      </header>

      <FeaturedHoleBanner featuredHoleType={currentHole.featuredHoleType} compact />
      <p className="muted hole-play-intro">
        {!isHolePrepared
          ? `Confirm par, optionally add tags, then ${isPowerUpsMode ? 'deal power-ups' : 'deal cards'}.`
          : 'Review assignments, play the hole, then continue to Hole Results.'}
      </p>

      {!isHolePrepared && (
        <section
          className={`${isPowerUpsMode ? 'panel' : ''} stack-xs hole-setup-card ${
            !isPowerUpsMode ? 'hole-setup-card--inline' : ''
          }`}
        >
          <div className="hole-setup-control-group">
            <span className="label hole-setup-label">Par</span>
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
              <p className="muted hole-setup-tags-empty">No tags selected yet (safe to skip).</p>
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
                    <AppIcon className="tag-pill__icon" icon={HOLE_TAG_ICON_BY_TAG[option.tag]} />
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>

          <button type="button" className="button-primary hole-setup-deal-button" onClick={dealForCurrentHole}>
            {isPowerUpsMode
              ? `Deal Hole ${currentHole.holeNumber} Power Ups`
              : `Deal Hole ${currentHole.holeNumber} Cards`}
          </button>
        </section>
      )}

      {isPowerUpsMode && isHolePrepared && (
        <>
          <section className="stack-sm">
            {roundState.players.map((player) => {
              const powerUp = getAssignedPowerUp(currentHolePowerUps, player.id)
              const curse = getAssignedCurse(currentHolePowerUps, player.id)
              const used = currentHolePowerUps?.usedPowerUpByPlayerId[player.id] ?? false

              if (!powerUp && !curse) {
                return (
                  <article key={player.id} className="panel stack-xs">
                    <strong>{playerNameById[player.id]}</strong>
                    <p className="muted">No power-up assigned for this hole.</p>
                  </article>
                )
              }

              return (
                <section key={player.id} className="stack-xs">
                  {powerUp ? (
                    <PowerUpCard
                      playerName={playerNameById[player.id]}
                      powerUp={powerUp}
                      used={used}
                      onUse={() => markPowerUpUsed(player.id)}
                    />
                  ) : (
                    <>
                      <strong>{playerNameById[player.id]}</strong>
                      <p className="muted">
                        {curse
                          ? 'Curse assigned for this hole, so no positive power-up.'
                          : 'No positive power-up assigned for this hole.'}
                      </p>
                    </>
                  )}
                  {curse && (
                    <section className="panel inset stack-xs">
                      <div className="row-between">
                        <strong>Curse</strong>
                        <span className="chip">{curse.category}</span>
                      </div>
                      <h3 className="power-up-title">{curse.title}</h3>
                      <p>{curse.description}</p>
                      <p className="muted">Restriction applies for this hole only.</p>
                    </section>
                  )}
                </section>
              )
            })}
          </section>

          <section className="panel stack-xs">
            <p className="muted">
              Declare power-ups before use. Curses apply to current round leader(s) for this hole
              only and replace their positive power-up.
            </p>
            <button type="button" className="button-primary" onClick={continueToResults}>
              <AppIcon className="button-icon" icon={ICONS.holeResults} />
              Enter Hole Results
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
              const selectedCardId = currentHoleCards.selectedCardIdByPlayerId[player.id]
              const isPlayerReady =
                typeof selectedCardId === 'string' && selectedCardId.length > 0

              return (
                <GolferMissionModule
                  key={player.id}
                  golferName={playerNameById[player.id]}
                  statusTone={canSelectCards ? (isPlayerReady ? 'ready' : 'pending') : undefined}
                  statusLabel={canSelectCards ? (isPlayerReady ? 'Ready' : 'Pending') : undefined}
                >
                  <div className="stack-xs hole-draft-options">
                    {dealtCards.map((card) => {
                      return (
                        <ChallengeCardView
                          key={card.id}
                          card={card}
                          selected={selectedCardId === card.id}
                          onSelect={
                            canSelectCards ? () => selectCard(player.id, card.id) : undefined
                          }
                        />
                      )
                    })}

                    {dealtCards.length === 0 && (
                      <p className="muted">No missions available from enabled packs for this golfer.</p>
                    )}
                  </div>
                </GolferMissionModule>
              )
            })}
          </section>

          {currentHoleCards.publicCards.length > 0 && (
            <HolePublicCardSection
              title="Public Cards"
              count={currentHoleCards.publicCards.length}
              emptyMessage="No public cards for this hole."
              helperText="Preview only. Public cards are resolved on Hole Results."
            >
              {currentHoleCards.publicCards.map((card) => (
                <PublicCardView key={card.id} card={card} />
              ))}
            </HolePublicCardSection>
          )}

          <HoleActionPanel
            summary={readinessSummary}
            buttonLabel="Go To Hole Results"
            disabled={!allPlayersHaveSelection}
            helperText={!allPlayersHaveSelection ? 'Pick one mission for each golfer before continuing.' : undefined}
            onContinue={continueToResults}
          />
        </>
      )}
    </section>
  )
}

export default HolePlayScreen
