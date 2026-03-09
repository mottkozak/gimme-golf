import { useEffect, useState } from 'react'
import FeaturedHoleBanner from '../components/FeaturedHoleBanner.tsx'
import type { PersonalCard, PublicCard } from '../types/cards.ts'
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
import { getAssignedPowerUp } from '../logic/powerUps.ts'
import type { ScreenProps } from './types.ts'

type CanonicalPublicResolutionMode =
  | 'yes_no_triggered'
  | 'vote_target_player'
  | 'choose_one_of_two_effects'
  | 'leader_selects_target'
  | 'trailing_player_selects_target'
  | 'pick_affected_players'

const PUBLIC_RESOLUTION_MODE_OPTIONS: Array<{
  mode: CanonicalPublicResolutionMode
  label: string
}> = [
  { mode: 'yes_no_triggered', label: 'Yes / No Trigger' },
  { mode: 'vote_target_player', label: 'Vote Target' },
  { mode: 'choose_one_of_two_effects', label: 'Choose Effect A/B' },
  { mode: 'leader_selects_target', label: 'Leader Selects Target' },
  { mode: 'trailing_player_selects_target', label: 'Trailing Selects Target' },
  { mode: 'pick_affected_players', label: 'Pick Affected Players' },
]

const STROKE_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8] as const

function normalizeMode(mode: PublicResolutionMode): CanonicalPublicResolutionMode {
  switch (mode) {
    case 'yesNoTriggered':
      return 'yes_no_triggered'
    case 'winningPlayer':
      return 'leader_selects_target'
    case 'affectedPlayers':
      return 'pick_affected_players'
    default:
      return mode
  }
}

function isResolvedMissionStatus(status: MissionStatus): boolean {
  return status === 'success' || status === 'failed'
}

type EffectOption = NonNullable<NonNullable<PublicCard['interaction']>['effectOptions']>[number]

function getEffectOptions(card: PublicCard): [EffectOption, EffectOption] {
  const absolutePoints = Math.max(1, Math.abs(card.points))
  return (
    card.interaction?.effectOptions ?? [
      {
        id: 'effect-positive',
        label: `+${absolutePoints} to selected players`,
        pointsDelta: absolutePoints,
        targetScope: 'affected',
      },
      {
        id: 'effect-negative',
        label: `-${absolutePoints} to selected players`,
        pointsDelta: -absolutePoints,
        targetScope: 'affected',
      },
    ]
  )
}

function getSelectedEffectOption(
  card: PublicCard,
  resolution: PublicCardResolutionState,
): EffectOption | null {
  const effectOptions = getEffectOptions(card)
  return (
    effectOptions.find((effect) => effect.id === resolution.selectedEffectOptionId) ??
    effectOptions[0] ??
    null
  )
}

function hasValidVoteSelection(
  resolution: PublicCardResolutionState,
  playerIds: string[],
): boolean {
  return playerIds.every((playerId) => {
    const votedPlayerId = resolution.targetPlayerIdByVoterId[playerId]
    return typeof votedPlayerId === 'string' && votedPlayerId.length > 0
  })
}

function isResolutionComplete(
  card: PublicCard,
  resolution: PublicCardResolutionState,
  playerIds: string[],
): boolean {
  if (!resolution.triggered) {
    return true
  }

  const normalizedMode = normalizeMode(resolution.mode)

  if (normalizedMode === 'yes_no_triggered') {
    return true
  }

  if (normalizedMode === 'vote_target_player') {
    return hasValidVoteSelection(resolution, playerIds)
  }

  if (
    normalizedMode === 'leader_selects_target' ||
    normalizedMode === 'trailing_player_selects_target'
  ) {
    return typeof resolution.winningPlayerId === 'string' && resolution.winningPlayerId.length > 0
  }

  if (normalizedMode === 'pick_affected_players') {
    return resolution.affectedPlayerIds.length > 0
  }

  const selectedEffectOption = getSelectedEffectOption(card, resolution)
  if (!selectedEffectOption) {
    return false
  }

  if (selectedEffectOption.targetScope === 'all') {
    return true
  }

  if (selectedEffectOption.targetScope === 'target') {
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
  const currentHolePowerUps = roundState.holePowerUps[roundState.currentHoleIndex]
  const isPowerUpsMode = roundState.config.gameMode === 'powerUps'
  const playerIds = roundState.players.map((player) => player.id)

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
          targetPlayerIdByVoterId: triggered ? existing.targetPlayerIdByVoterId : {},
        },
      }
    })
  }

  const setCardMode = (cardId: string, mode: CanonicalPublicResolutionMode) => {
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
          winningPlayerId:
            mode === 'leader_selects_target' || mode === 'trailing_player_selects_target'
              ? existing.winningPlayerId
              : null,
          affectedPlayerIds: mode === 'pick_affected_players' ? existing.affectedPlayerIds : [],
          targetPlayerIdByVoterId:
            mode === 'vote_target_player' ? existing.targetPlayerIdByVoterId : {},
          selectedEffectOptionId:
            mode === 'choose_one_of_two_effects' ? existing.selectedEffectOptionId : null,
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

  const setVotedTargetPlayer = (cardId: string, voterId: string, votedPlayerId: string | null) => {
    updatePublicResolutions((resolutionsByCardId) => {
      const existing = resolutionsByCardId[cardId]
      if (!existing) {
        return resolutionsByCardId
      }

      return {
        ...resolutionsByCardId,
        [cardId]: {
          ...existing,
          targetPlayerIdByVoterId: {
            ...existing.targetPlayerIdByVoterId,
            [voterId]: votedPlayerId,
          },
        },
      }
    })
  }

  const setSelectedEffectOption = (cardId: string, effectOptionId: string) => {
    updatePublicResolutions((resolutionsByCardId) => {
      const existing = resolutionsByCardId[cardId]
      if (!existing) {
        return resolutionsByCardId
      }

      return {
        ...resolutionsByCardId,
        [cardId]: {
          ...existing,
          selectedEffectOptionId: effectOptionId,
        },
      }
    })
  }

  const setStrokes = (playerId: string, nextStrokes: number | null) => {
    onUpdateRoundState((currentState) => {
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
    if (typeof strokes !== 'number') {
      return false
    }

    if (isPowerUpsMode) {
      return true
    }

    const missionStatus = currentResult.missionStatusByPlayerId[player.id]
    const dealtCards = currentHoleCards.dealtPersonalCardsByPlayerId[player.id] ?? []
    const requiresMissionResolution = dealtCards.length > 0

    return !requiresMissionResolution || isResolvedMissionStatus(missionStatus)
  })

  const arePublicCardsResolved = currentHoleCards.publicCards.every((card) =>
    isResolutionComplete(card, currentResolutions[card.id], playerIds),
  )

  const canContinueToRecap =
    isHoleDataReady && (isPowerUpsMode ? true : arePublicCardsResolved)

  return (
    <section className="screen stack-sm">
      <header className="screen__header">
        <h2>Hole Results</h2>
        <p className="muted">
          {isPowerUpsMode
            ? 'Enter strokes and confirm each player power-up status.'
            : 'Enter strokes, challenge success, and resolve public cards manually.'}
        </p>
      </header>

      <FeaturedHoleBanner featuredHoleType={currentHole.featuredHoleType} compact />

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
          const assignedPowerUp = getAssignedPowerUp(currentHolePowerUps, player.id)
          const powerUpUsed = currentHolePowerUps?.usedPowerUpByPlayerId[player.id] ?? false
          const missionStatus = currentResult.missionStatusByPlayerId[player.id]
          const strokes = currentResult.strokesByPlayerId[player.id]
          const hasPersonalCard = Boolean(selectedCard)

          return (
            <article key={player.id} className="panel inset stack-xs hole-results-player-card">
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
                  <span className="chip">{isPowerUpsMode ? 'Power Ups Mode' : 'No card'}</span>
                )}
              </div>

              <p className="muted">
                {isPowerUpsMode
                  ? assignedPowerUp
                    ? `${assignedPowerUp.title} (${powerUpUsed ? 'Used' : 'Unused'})`
                    : 'No power-up assigned for this golfer.'
                  : selectedCard
                  ? `${selectedCard.name} (${selectedCard.points} pts on success)`
                  : 'No personal card selected for this golfer.'}
              </p>

              {isPowerUpsMode ? (
                <p className="muted">
                  Power Up: <strong>{powerUpUsed ? 'Used' : 'Unused'}</strong>
                </p>
              ) : hasPersonalCard ? (
                <section className="stack-xs">
                  <span className="label">Challenge</span>
                  <div className="button-row hole-results-mission-row">
                    <button
                      type="button"
                      className={missionStatus === 'success' ? 'button-primary' : ''}
                      onClick={() => setMissionStatus(player.id, 'success')}
                    >
                      Completed
                    </button>
                    <button
                      type="button"
                      className={missionStatus === 'failed' ? 'button-primary' : ''}
                      onClick={() => setMissionStatus(player.id, 'failed')}
                    >
                      Failed
                    </button>
                  </div>
                </section>
              ) : (
                <p className="muted">No personal challenge to resolve for this golfer.</p>
              )}

              <section className="stack-xs">
                <div className="row-between">
                  <span className="label">Strokes</span>
                  <button
                    type="button"
                    className="chip chip-button"
                    onClick={() => setStrokes(player.id, null)}
                  >
                    Clear
                  </button>
                </div>
                <div className="button-row hole-results-strokes-row">
                  {STROKE_OPTIONS.map((strokeOption) => {
                    const isSelected = strokes === strokeOption

                    return (
                      <button
                        key={strokeOption}
                        type="button"
                        className={`hole-results-stroke-button ${isSelected ? 'button-primary' : ''}`}
                        onClick={() =>
                          setStrokes(player.id, isSelected ? null : strokeOption)
                        }
                        aria-pressed={isSelected}
                      >
                        {strokeOption}
                      </button>
                    )
                  })}
                </div>
              </section>
            </article>
          )
        })}
      </section>

      {!isPowerUpsMode && currentHoleCards.publicCards.length > 0 && (
        <section className="panel stack-xs">
          <h3>Public Card Resolution</h3>
          <p className="muted">Choose a manual resolution style for each revealed public card.</p>

          {currentHoleCards.publicCards.map((card) => {
            const resolution = currentResolutions[card.id]
            const normalizedMode = normalizeMode(resolution.mode)
            const selectedEffectOption = getSelectedEffectOption(card, resolution)
            const requiresTargetSelection =
              normalizedMode === 'leader_selects_target' ||
              normalizedMode === 'trailing_player_selects_target' ||
              (normalizedMode === 'choose_one_of_two_effects' &&
                selectedEffectOption?.targetScope === 'target')
            const requiresAffectedSelection =
              normalizedMode === 'pick_affected_players' ||
              (normalizedMode === 'choose_one_of_two_effects' &&
                selectedEffectOption?.targetScope === 'affected')

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

                <label className="field">
                  <span className="label">Resolution Mode</span>
                  <select
                    value={normalizedMode}
                    onChange={(event) =>
                      setCardMode(card.id, event.target.value as CanonicalPublicResolutionMode)
                    }
                  >
                    {PUBLIC_RESOLUTION_MODE_OPTIONS.map((modeOption) => (
                      <option key={modeOption.mode} value={modeOption.mode}>
                        {modeOption.label}
                      </option>
                    ))}
                  </select>
                </label>

                {resolution.triggered && normalizedMode === 'vote_target_player' && (
                  <div className="stack-xs">
                    <span className="label">Votes</span>
                    {roundState.players.map((voter) => (
                      <label key={voter.id} className="field field--inline">
                        <span className="label">{voter.name}</span>
                        <select
                          value={resolution.targetPlayerIdByVoterId[voter.id] ?? ''}
                          onChange={(event) =>
                            setVotedTargetPlayer(
                              card.id,
                              voter.id,
                              event.target.value || null,
                            )
                          }
                        >
                          <option value="">Select target</option>
                          {roundState.players.map((candidate) => (
                            <option key={candidate.id} value={candidate.id}>
                              {candidate.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                )}

                {resolution.triggered && normalizedMode === 'choose_one_of_two_effects' && (
                  <div className="stack-xs">
                    <span className="label">Effect Choice</span>
                    <div className="button-row">
                      {getEffectOptions(card).map((effectOption) => (
                        <button
                          key={effectOption.id}
                          type="button"
                          className={
                            resolution.selectedEffectOptionId === effectOption.id
                              ? 'button-primary'
                              : ''
                          }
                          onClick={() => setSelectedEffectOption(card.id, effectOption.id)}
                        >
                          {effectOption.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {resolution.triggered && requiresTargetSelection && (
                  <div className="stack-xs">
                    <span className="label">Select Target Player</span>
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
                  </div>
                )}

                {resolution.triggered && requiresAffectedSelection && (
                  <div className="stack-xs">
                    <span className="label">Pick Affected Players</span>
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
                  </div>
                )}

                {!isResolutionComplete(card, resolution, playerIds) && (
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
