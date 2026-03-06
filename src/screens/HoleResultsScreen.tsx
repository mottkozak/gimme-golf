import { useEffect, useState } from 'react'
import type { PersonalCard } from '../types/cards.ts'
import type {
  MissionStatus,
  PublicCardResolutionState,
  PublicResolutionMode,
} from '../types/game.ts'
import {
  buildPublicResolutionNotes,
  normalizePublicCardResolutions,
  resolvePublicCardPointDeltas,
} from '../logic/publicCardResolution.ts'
import type { ScreenProps } from './types.ts'

function isResolvedMissionStatus(status: MissionStatus): boolean {
  return status === 'success' || status === 'failed'
}

function isResolutionComplete(resolution: PublicCardResolutionState): boolean {
  if (!resolution.triggered) {
    return true
  }

  if (resolution.mode === 'yesNoTriggered') {
    return true
  }

  if (resolution.mode === 'winningPlayer') {
    return typeof resolution.winningPlayerId === 'string' && resolution.winningPlayerId.length > 0
  }

  return resolution.affectedPlayerIds.length > 0
}

function HoleResultsScreen({ roundState, onNavigate, onUpdateRoundState }: ScreenProps) {
  const [activeCardPreview, setActiveCardPreview] = useState<{
    playerName: string
    card: PersonalCard
  } | null>(null)

  const currentHole = roundState.holes[roundState.currentHoleIndex]
  const currentResult = roundState.holeResults[roundState.currentHoleIndex]
  const currentHoleCards = roundState.holeCards[roundState.currentHoleIndex]

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveCardPreview(null)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const currentResolutions = normalizePublicCardResolutions(
    currentHoleCards.publicCards,
    currentResult.publicCardResolutionsByCardId,
  )

  const updatePublicResolutions = (
    updater: (
      currentResolutionsByCardId: Record<string, PublicCardResolutionState>,
    ) => Record<string, PublicCardResolutionState>,
  ) => {
    onUpdateRoundState((currentState) => {
      const holeResults = [...currentState.holeResults]
      const currentHoleIndex = currentState.currentHoleIndex
      const holeResultState = holeResults[currentHoleIndex]
      const holeCardState = currentState.holeCards[currentHoleIndex]
      const normalizedCurrentResolutions = normalizePublicCardResolutions(
        holeCardState.publicCards,
        holeResultState.publicCardResolutionsByCardId,
      )

      const nextResolutionsByCardId = normalizePublicCardResolutions(
        holeCardState.publicCards,
        updater(normalizedCurrentResolutions),
      )

      const nextPublicPointDeltaByPlayerId = resolvePublicCardPointDeltas(
        currentState.players,
        holeCardState.publicCards,
        nextResolutionsByCardId,
      )

      holeResults[currentHoleIndex] = {
        ...holeResultState,
        publicCardResolutionsByCardId: nextResolutionsByCardId,
        publicPointDeltaByPlayerId: nextPublicPointDeltaByPlayerId,
        publicCardResolutionNotes: buildPublicResolutionNotes(
          holeCardState.publicCards,
          nextResolutionsByCardId,
        ),
      }

      return {
        ...currentState,
        holeResults,
      }
    })
  }

  const setCardTriggered = (cardId: string, triggered: boolean) => {
    updatePublicResolutions((resolutionsByCardId) => {
      const existing = resolutionsByCardId[cardId]
      if (!existing) {
        return resolutionsByCardId
      }

      return {
        ...resolutionsByCardId,
        [cardId]: {
          ...existing,
          triggered,
          winningPlayerId: triggered ? existing.winningPlayerId : null,
          affectedPlayerIds: triggered ? existing.affectedPlayerIds : [],
        },
      }
    })
  }

  const setCardMode = (cardId: string, mode: PublicResolutionMode) => {
    updatePublicResolutions((resolutionsByCardId) => {
      const existing = resolutionsByCardId[cardId]
      if (!existing) {
        return resolutionsByCardId
      }

      return {
        ...resolutionsByCardId,
        [cardId]: {
          ...existing,
          mode,
          winningPlayerId: mode === 'winningPlayer' ? existing.winningPlayerId : null,
          affectedPlayerIds: mode === 'affectedPlayers' ? existing.affectedPlayerIds : [],
        },
      }
    })
  }

  const setCardWinner = (cardId: string, winningPlayerId: string) => {
    updatePublicResolutions((resolutionsByCardId) => {
      const existing = resolutionsByCardId[cardId]
      if (!existing) {
        return resolutionsByCardId
      }

      return {
        ...resolutionsByCardId,
        [cardId]: {
          ...existing,
          winningPlayerId,
        },
      }
    })
  }

  const toggleAffectedPlayer = (cardId: string, playerId: string) => {
    updatePublicResolutions((resolutionsByCardId) => {
      const existing = resolutionsByCardId[cardId]
      if (!existing) {
        return resolutionsByCardId
      }

      const isAlreadyAffected = existing.affectedPlayerIds.includes(playerId)
      const nextAffectedPlayerIds = isAlreadyAffected
        ? existing.affectedPlayerIds.filter((id) => id !== playerId)
        : [...existing.affectedPlayerIds, playerId]

      return {
        ...resolutionsByCardId,
        [cardId]: {
          ...existing,
          affectedPlayerIds: nextAffectedPlayerIds,
        },
      }
    })
  }

  const setStrokes = (playerId: string, value: string) => {
    onUpdateRoundState((currentState) => {
      const normalizedValue = value.trim()
      const parsedValue = Number(normalizedValue)
      const nextStrokes =
        normalizedValue === ''
          ? null
          : Number.isFinite(parsedValue)
            ? Math.max(1, Math.round(parsedValue))
            : null

      const holeResults = [...currentState.holeResults]
      const holeResultState = holeResults[currentState.currentHoleIndex]

      holeResults[currentState.currentHoleIndex] = {
        ...holeResultState,
        strokesByPlayerId: {
          ...holeResultState.strokesByPlayerId,
          [playerId]: nextStrokes,
        },
      }

      return {
        ...currentState,
        holeResults,
      }
    })
  }

  const setMissionStatus = (playerId: string, status: Extract<MissionStatus, 'success' | 'failed'>) => {
    onUpdateRoundState((currentState) => {
      const holeResults = [...currentState.holeResults]
      const holeResultState = holeResults[currentState.currentHoleIndex]

      holeResults[currentState.currentHoleIndex] = {
        ...holeResultState,
        missionStatusByPlayerId: {
          ...holeResultState.missionStatusByPlayerId,
          [playerId]: status,
        },
      }

      return {
        ...currentState,
        holeResults,
      }
    })
  }

  const isHoleDataReady = roundState.players.every((player) => {
    const strokes = currentResult.strokesByPlayerId[player.id]
    const missionStatus = currentResult.missionStatusByPlayerId[player.id]

    return typeof strokes === 'number' && isResolvedMissionStatus(missionStatus)
  })

  const arePublicCardsResolved = currentHoleCards.publicCards.every((card) =>
    isResolutionComplete(currentResolutions[card.id]),
  )

  const canContinueToRecap = isHoleDataReady && arePublicCardsResolved

  return (
    <section className="screen stack-sm">
      <header className="screen__header">
        <h2>Hole Results</h2>
        <p className="muted">Enter strokes, challenge success, and resolve public cards manually.</p>
      </header>

      <section className="panel stack-xs">
        <div className="row-between">
          <strong>Hole {currentHole.holeNumber}</strong>
          <span className="chip">Par {currentHole.par}</span>
        </div>

        {roundState.players.map((player) => {
          const selectedCardId = currentHoleCards.selectedCardIdByPlayerId[player.id]
          const selectedCard = (currentHoleCards.dealtPersonalCardsByPlayerId[player.id] ?? []).find(
            (card) => card.id === selectedCardId,
          )
          const missionStatus = currentResult.missionStatusByPlayerId[player.id]
          const strokes = currentResult.strokesByPlayerId[player.id]

          return (
            <article key={player.id} className="panel inset stack-xs">
              <div className="row-between">
                <strong>{player.name}</strong>
                {selectedCard ? (
                  <button
                    type="button"
                    className="chip chip-button"
                    onClick={() =>
                      setActiveCardPreview({
                        playerName: player.name,
                        card: selectedCard,
                      })
                    }
                  >
                    Card: {selectedCard.code}
                  </button>
                ) : (
                  <span className="chip">No card</span>
                )}
              </div>

              <p className="muted">
                {selectedCard
                  ? `${selectedCard.name} (${selectedCard.points} pts on success)`
                  : 'No personal card selected for this golfer.'}
              </p>

              <label className="field field--inline">
                <span className="label">Strokes</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={strokes ?? ''}
                  onChange={(event) => setStrokes(player.id, event.target.value)}
                  onFocus={(event) => event.currentTarget.select()}
                />
              </label>

              <div className="button-row">
                <button
                  type="button"
                  className={missionStatus === 'success' ? 'button-primary' : ''}
                  onClick={() => setMissionStatus(player.id, 'success')}
                >
                  Challenge: Yes
                </button>
                <button
                  type="button"
                  className={missionStatus === 'failed' ? 'button-primary' : ''}
                  onClick={() => setMissionStatus(player.id, 'failed')}
                >
                  Challenge: No
                </button>
              </div>
            </article>
          )
        })}
      </section>

      {currentHoleCards.publicCards.length > 0 && (
        <section className="panel stack-xs">
          <h3>Public Card Resolution</h3>
          <p className="muted">Choose a manual resolution style for each revealed public card.</p>

          {currentHoleCards.publicCards.map((card) => {
            const resolution = currentResolutions[card.id]

            return (
              <article key={card.id} className="panel inset stack-xs">
                <div className="row-between">
                  <strong>{card.name}</strong>
                  <span className="chip">
                    {card.cardType.toUpperCase()} {card.points > 0 ? '+' : ''}
                    {card.points}
                  </span>
                </div>
                <p className="muted">{card.description}</p>
                <p className="muted">{card.rulesText}</p>

                <div className="button-row">
                  <button
                    type="button"
                    className={resolution.triggered ? 'button-primary' : ''}
                    onClick={() => setCardTriggered(card.id, true)}
                  >
                    Triggered
                  </button>
                  <button
                    type="button"
                    className={!resolution.triggered ? 'button-primary' : ''}
                    onClick={() => setCardTriggered(card.id, false)}
                  >
                    Not Triggered
                  </button>
                </div>

                <div className="button-row">
                  <button
                    type="button"
                    className={resolution.mode === 'yesNoTriggered' ? 'button-primary' : ''}
                    onClick={() => setCardMode(card.id, 'yesNoTriggered')}
                  >
                    Yes/No Trigger
                  </button>
                  <button
                    type="button"
                    className={resolution.mode === 'winningPlayer' ? 'button-primary' : ''}
                    onClick={() => setCardMode(card.id, 'winningPlayer')}
                  >
                    Pick Winner
                  </button>
                  <button
                    type="button"
                    className={resolution.mode === 'affectedPlayers' ? 'button-primary' : ''}
                    onClick={() => setCardMode(card.id, 'affectedPlayers')}
                  >
                    Pick Affected
                  </button>
                </div>

                {resolution.triggered && resolution.mode === 'winningPlayer' && (
                  <div className="button-row row-wrap">
                    {roundState.players.map((player) => (
                      <button
                        key={player.id}
                        type="button"
                        className={
                          resolution.winningPlayerId === player.id ? 'button-primary' : ''
                        }
                        onClick={() => setCardWinner(card.id, player.id)}
                      >
                        {player.name}
                      </button>
                    ))}
                  </div>
                )}

                {resolution.triggered && resolution.mode === 'affectedPlayers' && (
                  <div className="button-row row-wrap">
                    {roundState.players.map((player) => {
                      const isAffected = resolution.affectedPlayerIds.includes(player.id)

                      return (
                        <button
                          key={player.id}
                          type="button"
                          className={isAffected ? 'button-primary' : ''}
                          onClick={() => toggleAffectedPlayer(card.id, player.id)}
                        >
                          {player.name}
                        </button>
                      )
                    })}
                  </div>
                )}

                {!isResolutionComplete(resolution) && (
                  <p className="muted">Complete selection for this public card before continuing.</p>
                )}
              </article>
            )
          })}

          <div className="panel inset stack-xs">
            <strong>Public Point Delta Preview</strong>
            {roundState.players.map((player) => {
              const delta = currentResult.publicPointDeltaByPlayerId[player.id] ?? 0
              return (
                <div key={player.id} className="row-between">
                  <span>{player.name}</span>
                  <span>
                    {delta > 0 ? '+' : ''}
                    {delta}
                  </span>
                </div>
              )
            })}
            <p className="muted">{currentResult.publicCardResolutionNotes}</p>
          </div>
        </section>
      )}

      <section className="panel stack-xs">
        <button
          type="button"
          className="button-primary"
          disabled={!canContinueToRecap}
          onClick={() => onNavigate('leaderboard')}
        >
          Save Results And View Hole Recap
        </button>
        {!canContinueToRecap && (
          <p className="muted">
            Enter strokes/challenge outcome for all golfers and finish public card resolution first.
          </p>
        )}
      </section>

      {activeCardPreview && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setActiveCardPreview(null)}
        >
          <section
            className="panel modal-card stack-xs"
            role="dialog"
            aria-modal="true"
            aria-labelledby="personal-card-preview-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="row-between">
              <h3 id="personal-card-preview-title">{activeCardPreview.card.name}</h3>
              <button type="button" onClick={() => setActiveCardPreview(null)}>
                Close
              </button>
            </div>
            <p className="muted">
              {activeCardPreview.playerName} | {activeCardPreview.card.code}
            </p>
            <p>{activeCardPreview.card.description}</p>
            <p className="muted">{activeCardPreview.card.rulesText}</p>
            <p>
              Reward: {activeCardPreview.card.points > 0 ? '+' : ''}
              {activeCardPreview.card.points} points on success
            </p>
          </section>
        </div>
      )}
    </section>
  )
}

export default HoleResultsScreen
