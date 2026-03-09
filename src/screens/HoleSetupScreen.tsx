import { HOLE_TAG_ICON_BY_TAG, ICONS } from '../app/icons.ts'
import FeaturedHoleBanner from '../components/FeaturedHoleBanner.tsx'
import { PERSONAL_CARDS, PUBLIC_CARDS } from '../data/cards.ts'
import {
  buildDeckMemoryFromHoleCards,
  createDealtHoleCardsState,
  createEmptyHoleCardsState,
} from '../logic/dealCards.ts'
import { assignPowerUpsForHole, createEmptyHolePowerUpState } from '../logic/powerUps.ts'
import { HOLE_TAG_OPTIONS, normalizePar, toggleHoleTag } from '../logic/roundSetup.ts'
import type { HoleTag } from '../types/cards.ts'
import type { ScreenProps } from './types.ts'

function HoleSetupScreen({ roundState, onNavigate, onUpdateRoundState }: ScreenProps) {
  const currentHole = roundState.holes[roundState.currentHoleIndex]
  const isLastHole = roundState.currentHoleIndex === roundState.holes.length - 1

  const setPar = (nextPar: number) => {
    onUpdateRoundState((currentState) => {
      const holes = [...currentState.holes]
      holes[currentState.currentHoleIndex] = {
        ...holes[currentState.currentHoleIndex],
        par: normalizePar(nextPar),
      }

      const holeCards = [...currentState.holeCards]
      holeCards[currentState.currentHoleIndex] = createEmptyHoleCardsState(
        currentState.players,
        holes[currentState.currentHoleIndex].holeNumber,
      )
      const holePowerUps = [...currentState.holePowerUps]
      holePowerUps[currentState.currentHoleIndex] = createEmptyHolePowerUpState(
        currentState.players,
        holes[currentState.currentHoleIndex].holeNumber,
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
    onUpdateRoundState((currentState) => {
      const holes = [...currentState.holes]
      const hole = holes[currentState.currentHoleIndex]

      holes[currentState.currentHoleIndex] = {
        ...hole,
        tags: toggleHoleTag(hole.tags, tag),
      }

      const holeCards = [...currentState.holeCards]
      holeCards[currentState.currentHoleIndex] = createEmptyHoleCardsState(
        currentState.players,
        holes[currentState.currentHoleIndex].holeNumber,
      )
      const holePowerUps = [...currentState.holePowerUps]
      holePowerUps[currentState.currentHoleIndex] = createEmptyHolePowerUpState(
        currentState.players,
        holes[currentState.currentHoleIndex].holeNumber,
      )

      return {
        ...currentState,
        holes,
        holeCards,
        holePowerUps,
      }
    })
  }

  const dealCardsForCurrentHole = () => {
    onUpdateRoundState((currentState) => {
      const currentHoleIndex = currentState.currentHoleIndex
      const hole = currentState.holes[currentHoleIndex]
      const isPowerUpsMode = currentState.config.gameMode === 'powerUps'

      const holeCards = [...currentState.holeCards]
      const holePowerUps = [...currentState.holePowerUps]

      if (isPowerUpsMode) {
        holeCards[currentHoleIndex] = createEmptyHoleCardsState(
          currentState.players,
          hole.holeNumber,
        )
        holePowerUps[currentHoleIndex] = assignPowerUpsForHole(
          currentState.players,
          hole.holeNumber,
        )
      } else {
        const priorHoleCards = currentState.holeCards.filter((_, holeIndex) => holeIndex !== currentHoleIndex)
        const deckMemoryForDeal = buildDeckMemoryFromHoleCards(priorHoleCards)

        holeCards[currentHoleIndex] = createDealtHoleCardsState(
          currentState.players,
          hole,
          currentState.config,
          PERSONAL_CARDS,
          PUBLIC_CARDS,
          deckMemoryForDeal,
          priorHoleCards,
        )
        holePowerUps[currentHoleIndex] = createEmptyHolePowerUpState(
          currentState.players,
          hole.holeNumber,
        )
      }

      const holeResults = [...currentState.holeResults]
      holeResults[currentHoleIndex] = {
        ...holeResults[currentHoleIndex],
        strokesByPlayerId: Object.fromEntries(
          currentState.players.map((player) => [player.id, null]),
        ),
        missionStatusByPlayerId: Object.fromEntries(
          currentState.players.map((player) => [player.id, 'pending']),
        ),
        publicPointDeltaByPlayerId: Object.fromEntries(
          currentState.players.map((player) => [player.id, 0]),
        ),
        publicCardResolutionsByCardId: {},
        publicCardResolutionNotes: 'Pending public card resolution.',
      }

      return {
        ...currentState,
        holeCards,
        holePowerUps,
        holeResults,
        deckMemory: buildDeckMemoryFromHoleCards(holeCards),
      }
    })

    onNavigate('holePlay')
  }

  return (
    <section className="screen stack-sm">
      <header className="screen__header">
        <div className="screen-title">
          <img className="screen-title__icon" src={ICONS.roundSetup} alt="" aria-hidden="true" />
          <h2>Hole Setup</h2>
        </div>
        <p className="muted">
          Hole {currentHole.holeNumber} of {roundState.holes.length} {isLastHole ? '(Final Hole)' : ''}
        </p>
      </header>

      <FeaturedHoleBanner featuredHoleType={currentHole.featuredHoleType} />

      <section className="panel stack-xs">
        <div className="row-between">
          <strong>Confirm Hole Details</strong>
          <span className="chip">Par {currentHole.par}</span>
        </div>

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

        <button type="button" className="button-primary" onClick={dealCardsForCurrentHole}>
          <img className="button-icon" src={ICONS.dealCards} alt="" aria-hidden="true" />
          {roundState.config.gameMode === 'powerUps'
            ? `Deal Power Ups For Hole ${currentHole.holeNumber}`
            : `Deal Cards For Hole ${currentHole.holeNumber}`}
        </button>
      </section>
    </section>
  )
}

export default HoleSetupScreen
