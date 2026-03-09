import { useEffect, useState } from 'react'
import { ICONS } from '../app/icons.ts'
import FeaturedHoleBanner from '../components/FeaturedHoleBanner.tsx'
import {
  buildPublicResolutionNotes,
  getPublicCardResolutionMode,
  getPublicResolutionGuidance,
  getPublicResolutionInputRequirements,
  isPublicCardResolutionComplete,
  normalizePublicCardResolutions,
  resolvePublicCardPointDeltas,
} from '../logic/publicCardResolution.ts'
import { getAssignedPowerUp } from '../logic/powerUps.ts'
import {
  incrementHoleTapCount,
  markHoleCompletedAt,
  markPublicResolutionCompletedAt,
  markPublicResolutionStartedAt,
} from '../logic/uxMetrics.ts'
import { isResolvedMissionStatus } from '../logic/missionStatus.ts'
import type { PersonalCard, PublicCard } from '../types/cards.ts'
import type { MissionStatus, PublicCardResolutionState, RoundState } from '../types/game.ts'
import type { ScreenProps } from './types.ts'

const QUICK_STROKE_OFFSETS = [-2, -1, 0, 1, 2, 3] as const

type EffectOption = NonNullable<NonNullable<PublicCard['interaction']>['effectOptions']>[number]

function parseStrokeInput(rawValue: string): number | null {
  const digitsOnly = rawValue.replace(/[^\d]/g, '')
  if (!digitsOnly) {
    return null
  }

  const parsed = Number(digitsOnly)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null
  }

  return Math.round(parsed)
}

function buildQuickStrokeOptions(par: number): number[] {
  return Array.from(
    new Set(
      QUICK_STROKE_OFFSETS
        .map((offset) => par + offset)
        .filter((strokeOption) => strokeOption > 0),
    ),
  )
}

function sortPlayersByGamePoints(
  players: ScreenProps['roundState']['players'],
  totalsByPlayerId: ScreenProps['roundState']['totalsByPlayerId'],
): ScreenProps['roundState']['players'] {
  return [...players].sort((playerA, playerB) => {
    const pointsA = totalsByPlayerId[playerA.id]?.gamePoints ?? 0
    const pointsB = totalsByPlayerId[playerB.id]?.gamePoints ?? 0
    if (pointsA !== pointsB) {
      return pointsB - pointsA
    }

    const nameCompare = playerA.name.localeCompare(playerB.name)
    if (nameCompare !== 0) {
      return nameCompare
    }

    return playerA.id.localeCompare(playerB.id)
  })
}

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

function HoleResultsScreen({ roundState, onNavigate, onUpdateRoundState }: ScreenProps) {
  const [activeCardPreview, setActiveCardPreview] = useState<{
    playerName: string
    card: PersonalCard
  } | null>(null)
  const [missionSectionExpanded, setMissionSectionExpanded] = useState(false)
  const [publicSectionExpanded, setPublicSectionExpanded] = useState(false)

  const currentHole = roundState.holes[roundState.currentHoleIndex]
  const currentResult = roundState.holeResults[roundState.currentHoleIndex]
  const currentHoleCards = roundState.holeCards[roundState.currentHoleIndex]
  const currentHolePowerUps = roundState.holePowerUps[roundState.currentHoleIndex]
  const isPowerUpsMode = roundState.config.gameMode === 'powerUps'
  const playerIds = roundState.players.map((player) => player.id)
  const rankedPlayersByGamePoints = sortPlayersByGamePoints(
    roundState.players,
    roundState.totalsByPlayerId,
  )
  const leadingPlayerId = rankedPlayersByGamePoints[0]?.id ?? null
  const trailingPlayerId = rankedPlayersByGamePoints[rankedPlayersByGamePoints.length - 1]?.id ?? null

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveCardPreview(null)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const getSuggestedTargetPlayerId = (pointsDelta: number): string | null => {
    const fallbackPlayerId = roundState.players[0]?.id ?? null
    if (pointsDelta < 0) {
      return leadingPlayerId ?? fallbackPlayerId
    }

    return trailingPlayerId ?? fallbackPlayerId
  }

  const currentResolutions = normalizePublicCardResolutions(
    currentHoleCards.publicCards,
    currentResult.publicCardResolutionsByCardId,
  )

  const updateCurrentHoleWithTap = (
    updater: (currentState: RoundState) => RoundState,
    options?: { markPublicStart?: boolean },
  ) => {
    onUpdateRoundState((currentState) => {
      const now = Date.now()
      const holeIndex = currentState.currentHoleIndex
      const nextState = updater(currentState)

      let nextHoleUxMetrics = nextState.holeUxMetrics
      if (options?.markPublicStart) {
        nextHoleUxMetrics = markPublicResolutionStartedAt(nextHoleUxMetrics, holeIndex, now)
      }
      nextHoleUxMetrics = incrementHoleTapCount(nextHoleUxMetrics, holeIndex)

      return {
        ...nextState,
        holeUxMetrics: nextHoleUxMetrics,
      }
    })
  }

  const applyResolutionDefaults = (
    card: PublicCard,
    resolution: PublicCardResolutionState,
  ): PublicCardResolutionState => {
    const normalizedMode = getPublicCardResolutionMode(card, resolution)
    const baseResolution: PublicCardResolutionState = {
      ...resolution,
      mode: normalizedMode,
    }

    if (normalizedMode === 'yes_no_triggered') {
      return baseResolution
    }

    if (normalizedMode === 'vote_target_player') {
      const suggestedTarget = getSuggestedTargetPlayerId(card.points)
      if (!suggestedTarget) {
        return baseResolution
      }

      const nextVotesByVoterId: Record<string, string | null> = {
        ...baseResolution.targetPlayerIdByVoterId,
      }

      for (const player of roundState.players) {
        if (!nextVotesByVoterId[player.id]) {
          nextVotesByVoterId[player.id] = suggestedTarget
        }
      }

      return {
        ...baseResolution,
        targetPlayerIdByVoterId: nextVotesByVoterId,
      }
    }

    if (
      normalizedMode === 'leader_selects_target' ||
      normalizedMode === 'trailing_player_selects_target'
    ) {
      return {
        ...baseResolution,
        winningPlayerId:
          baseResolution.winningPlayerId ??
          getSuggestedTargetPlayerId(card.points),
      }
    }

    if (normalizedMode === 'pick_affected_players') {
      if (baseResolution.affectedPlayerIds.length > 0) {
        return baseResolution
      }

      const suggestedTarget = getSuggestedTargetPlayerId(card.points)
      return {
        ...baseResolution,
        affectedPlayerIds: suggestedTarget ? [suggestedTarget] : [],
      }
    }

    const effectOptions = getEffectOptions(card)
    const selectedEffectOptionId =
      baseResolution.selectedEffectOptionId ?? effectOptions[0]?.id ?? null
    const selectedEffect = effectOptions.find((effect) => effect.id === selectedEffectOptionId) ?? null

    if (!selectedEffect) {
      return {
        ...baseResolution,
        selectedEffectOptionId,
      }
    }

    if (selectedEffect.targetScope === 'all') {
      return {
        ...baseResolution,
        selectedEffectOptionId,
      }
    }

    if (selectedEffect.targetScope === 'target') {
      return {
        ...baseResolution,
        selectedEffectOptionId,
        winningPlayerId:
          baseResolution.winningPlayerId ??
          getSuggestedTargetPlayerId(selectedEffect.pointsDelta),
      }
    }

    if (baseResolution.affectedPlayerIds.length > 0) {
      return {
        ...baseResolution,
        selectedEffectOptionId,
      }
    }

    const suggestedTarget = getSuggestedTargetPlayerId(selectedEffect.pointsDelta)
    return {
      ...baseResolution,
      selectedEffectOptionId,
      affectedPlayerIds: suggestedTarget ? [suggestedTarget] : [],
    }
  }

  const updatePublicResolutions = (
    updater: (
      currentResolutionsByCardId: Record<string, PublicCardResolutionState>,
    ) => Record<string, PublicCardResolutionState>,
  ) => {
    updateCurrentHoleWithTap((currentState) => {
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
    }, { markPublicStart: true })
  }

  const setCardTriggered = (card: PublicCard, triggered: boolean) => {
    updatePublicResolutions((resolutionsByCardId) => {
      const existing = resolutionsByCardId[card.id]
      if (!existing) {
        return resolutionsByCardId
      }

      const nextResolution: PublicCardResolutionState = triggered
        ? applyResolutionDefaults(card, {
            ...existing,
            triggered: true,
          })
        : {
            ...existing,
            triggered: false,
            winningPlayerId: null,
            affectedPlayerIds: [],
            targetPlayerIdByVoterId: {},
          }

      return {
        ...resolutionsByCardId,
        [card.id]: nextResolution,
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

  const setUnifiedVoteTarget = (cardId: string, targetPlayerId: string) => {
    updatePublicResolutions((resolutionsByCardId) => {
      const existing = resolutionsByCardId[cardId]
      if (!existing) {
        return resolutionsByCardId
      }

      return {
        ...resolutionsByCardId,
        [cardId]: {
          ...existing,
          targetPlayerIdByVoterId: Object.fromEntries(
            roundState.players.map((player) => [player.id, targetPlayerId]),
          ),
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

  const setSelectedEffectOption = (card: PublicCard, effectOptionId: string) => {
    updatePublicResolutions((resolutionsByCardId) => {
      const existing = resolutionsByCardId[card.id]
      if (!existing) {
        return resolutionsByCardId
      }

      const nextResolution = applyResolutionDefaults(card, {
        ...existing,
        selectedEffectOptionId: effectOptionId,
      })

      return {
        ...resolutionsByCardId,
        [card.id]: nextResolution,
      }
    })
  }

  const setStrokes = (playerId: string, nextStrokes: number | null) => {
    updateCurrentHoleWithTap((currentState) => {
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
    updateCurrentHoleWithTap((currentState) => {
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

  const onToggleMissionSection = () => {
    setMissionSectionExpanded((current) => {
      const nextExpanded = !current

      onUpdateRoundState((currentState) => ({
        ...currentState,
        holeUxMetrics: incrementHoleTapCount(
          currentState.holeUxMetrics,
          currentState.currentHoleIndex,
        ),
      }))

      return nextExpanded
    })
  }

  const onTogglePublicSection = () => {
    setPublicSectionExpanded((current) => {
      const nextExpanded = !current

      onUpdateRoundState((currentState) => {
        const now = Date.now()
        const holeIndex = currentState.currentHoleIndex

        let nextHoleUxMetrics = incrementHoleTapCount(currentState.holeUxMetrics, holeIndex)
        if (nextExpanded) {
          nextHoleUxMetrics = markPublicResolutionStartedAt(nextHoleUxMetrics, holeIndex, now)
        }

        return {
          ...currentState,
          holeUxMetrics: nextHoleUxMetrics,
        }
      })

      return nextExpanded
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
    isPublicCardResolutionComplete(card, currentResolutions[card.id], playerIds),
  )

  const canContinueToRecap =
    isHoleDataReady && (isPowerUpsMode ? true : arePublicCardsResolved)

  const strokesCompletedCount = roundState.players.filter((player) =>
    typeof currentResult.strokesByPlayerId[player.id] === 'number',
  ).length

  const missionRequiredPlayerIds = roundState.players
    .filter((player) => {
      const dealtCards = currentHoleCards.dealtPersonalCardsByPlayerId[player.id] ?? []
      return dealtCards.length > 0
    })
    .map((player) => player.id)
  const missionResolvedCount = missionRequiredPlayerIds.filter((playerId) =>
    isResolvedMissionStatus(currentResult.missionStatusByPlayerId[playerId]),
  ).length
  const hasMissionStep = !isPowerUpsMode && missionRequiredPlayerIds.length > 0

  const resolvedPublicCardsCount = currentHoleCards.publicCards.filter((card) =>
    isPublicCardResolutionComplete(card, currentResolutions[card.id], playerIds),
  ).length

  const continueToRecap = () => {
    const now = Date.now()

    onUpdateRoundState((currentState) => {
      const holeIndex = currentState.currentHoleIndex
      const hasPublicCards = currentState.holeCards[holeIndex].publicCards.length > 0

      let nextHoleUxMetrics = incrementHoleTapCount(currentState.holeUxMetrics, holeIndex)
      if (!isPowerUpsMode && hasPublicCards) {
        nextHoleUxMetrics = markPublicResolutionCompletedAt(nextHoleUxMetrics, holeIndex, now)
      }
      nextHoleUxMetrics = markHoleCompletedAt(nextHoleUxMetrics, holeIndex, now)

      return {
        ...currentState,
        holeUxMetrics: nextHoleUxMetrics,
      }
    })

    onNavigate('leaderboard')
  }

  return (
    <section className="screen stack-sm hole-results-screen">
      <header className="screen__header">
        <div className="screen-title">
          <img className="screen-title__icon" src={ICONS.holeResults} alt="" aria-hidden="true" />
          <h2>Hole Results</h2>
        </div>
        <p className="muted">
          Required-first flow: finish strokes first, then expand challenge and public-card resolution.
        </p>
      </header>

      <FeaturedHoleBanner featuredHoleType={currentHole.featuredHoleType} compact />

      <section className="panel stack-xs hole-results-entry-panel">
        <div className="row-between">
          <strong>Step 1: Strokes (Required)</strong>
          <span className="chip">
            {strokesCompletedCount}/{roundState.players.length} entered
          </span>
        </div>

        {roundState.players.map((player) => {
          const selectedCardId = currentHoleCards.selectedCardIdByPlayerId[player.id]
          const selectedCard = (currentHoleCards.dealtPersonalCardsByPlayerId[player.id] ?? []).find(
            (card) => card.id === selectedCardId,
          )
          const assignedPowerUp = getAssignedPowerUp(currentHolePowerUps, player.id)
          const powerUpUsed = currentHolePowerUps?.usedPowerUpByPlayerId[player.id] ?? false
          const strokes = currentResult.strokesByPlayerId[player.id]
          const quickStrokeOptions = buildQuickStrokeOptions(currentHole.par)

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
                    {selectedCard.code} - {selectedCard.name}
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
                  {quickStrokeOptions.map((strokeOption) => {
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
                <label className="field field--inline">
                  <span className="label">Manual</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    step={1}
                    value={typeof strokes === 'number' ? String(strokes) : ''}
                    placeholder="Enter strokes"
                    onChange={(event) => {
                      const parsedStrokes = parseStrokeInput(event.target.value)
                      setStrokes(player.id, parsedStrokes)
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.currentTarget.blur()
                      }
                    }}
                  />
                </label>
              </section>
            </article>
          )
        })}
      </section>

      {hasMissionStep && (
        <section className="panel stack-xs">
          <div className="row-between">
            <strong>Step 2: Challenge Results (Required For Dealt Cards)</strong>
            <button
              type="button"
              className={missionSectionExpanded ? 'button-primary' : ''}
              onClick={onToggleMissionSection}
              aria-expanded={missionSectionExpanded}
              aria-controls="mission-resolution-section"
            >
              {missionSectionExpanded ? 'Hide' : 'Expand'}
            </button>
          </div>
          <p className="muted">
            {missionResolvedCount}/{missionRequiredPlayerIds.length} golfers resolved.
          </p>

          {missionSectionExpanded && (
            <section
              id="mission-resolution-section"
              className="stack-xs"
              role="region"
              aria-label="Mission resolution"
            >
              {roundState.players.map((player) => {
                const selectedCardId = currentHoleCards.selectedCardIdByPlayerId[player.id]
                const selectedCard = (currentHoleCards.dealtPersonalCardsByPlayerId[player.id] ?? []).find(
                  (card) => card.id === selectedCardId,
                )
                const missionStatus = currentResult.missionStatusByPlayerId[player.id]

                if (!selectedCard) {
                  return (
                    <article key={player.id} className="panel inset stack-xs">
                      <div className="row-between">
                        <strong>{player.name}</strong>
                        <span className="chip">No challenge</span>
                      </div>
                      <p className="muted">No personal challenge to resolve for this golfer.</p>
                    </article>
                  )
                }

                return (
                  <article key={player.id} className="panel inset stack-xs">
                    <div className="row-between">
                      <strong>{player.name}</strong>
                      <span className="chip">
                        {selectedCard.code} - {selectedCard.name}
                      </span>
                    </div>
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
                  </article>
                )
              })}
            </section>
          )}
        </section>
      )}

      {!isPowerUpsMode && currentHoleCards.publicCards.length > 0 && (
        <section className="panel stack-xs public-resolution-panel">
          <div className="row-between">
            <strong>Step 3: Public Card Resolution (Required)</strong>
            <button
              type="button"
              className={publicSectionExpanded ? 'button-primary' : ''}
              onClick={onTogglePublicSection}
              aria-expanded={publicSectionExpanded}
              aria-controls="public-resolution-section"
            >
              {publicSectionExpanded ? 'Hide' : 'Expand'}
            </button>
          </div>
          <p className="muted">
            {resolvedPublicCardsCount}/{currentHoleCards.publicCards.length} public cards resolved.
          </p>

          {publicSectionExpanded && (
            <section
              id="public-resolution-section"
              className="stack-xs"
              role="region"
              aria-label="Public card resolution"
            >
              <p className="muted">
                Resolve each card in order. Only required choices for that card will appear.
              </p>

              {currentHoleCards.publicCards.map((card) => {
                const resolution = currentResolutions[card.id]
                const normalizedMode = getPublicCardResolutionMode(card, resolution)
                const guidedResolution: PublicCardResolutionState = {
                  ...resolution,
                  mode: normalizedMode,
                }
                const guidance = getPublicResolutionGuidance(card, normalizedMode)
                const requirements = getPublicResolutionInputRequirements(card, guidedResolution)
                const hasMultiplePlayers = roundState.players.length > 1
                const voteTargets = roundState.players.map(
                  (player) => guidedResolution.targetPlayerIdByVoterId[player.id] ?? null,
                )
                const unanimousVoteTargetPlayerId =
                  voteTargets.length > 0 &&
                  voteTargets[0] &&
                  voteTargets.every((targetPlayerId) => targetPlayerId === voteTargets[0])
                    ? voteTargets[0]
                    : null

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
                    <p className="muted">
                      <strong>{guidance.title}</strong>
                    </p>
                    <p className="muted">{guidance.triggerHelp}</p>

                    <div className="button-row">
                      <button
                        type="button"
                        className={guidedResolution.triggered ? 'button-primary' : ''}
                        onClick={() => setCardTriggered(card, true)}
                      >
                        Triggered
                      </button>
                      <button
                        type="button"
                        className={!guidedResolution.triggered ? 'button-primary' : ''}
                        onClick={() => setCardTriggered(card, false)}
                      >
                        Not Triggered
                      </button>
                    </div>

                    <p className="muted">{guidance.triggerPrompt}</p>

                    {guidedResolution.triggered && requirements.requiresVoteTarget && hasMultiplePlayers && (
                      <div className="stack-xs">
                        <span className="label">{guidance.voteTargetLabel}</span>
                        <div className="button-row row-wrap">
                          {roundState.players.map((player) => (
                            <button
                              key={player.id}
                              type="button"
                              className={unanimousVoteTargetPlayerId === player.id ? 'button-primary' : ''}
                              onClick={() => setUnifiedVoteTarget(card.id, player.id)}
                            >
                              {player.name}
                            </button>
                          ))}
                        </div>
                        <p className="muted">
                          Quick-set applies the same vote target for all golfers.
                        </p>
                      </div>
                    )}

                    {guidedResolution.triggered && requirements.requiresVoteTarget && !hasMultiplePlayers && (
                      <p className="muted">{guidance.autoResolvedHint}</p>
                    )}

                    {guidedResolution.triggered && requirements.requiresEffectChoice && (
                      <div className="stack-xs">
                        <span className="label">{guidance.effectChoiceLabel}</span>
                        <div className="button-row">
                          {getEffectOptions(card).map((effectOption) => (
                            <button
                              key={effectOption.id}
                              type="button"
                              className={
                                guidedResolution.selectedEffectOptionId === effectOption.id
                                  ? 'button-primary'
                                  : ''
                              }
                              onClick={() => setSelectedEffectOption(card, effectOption.id)}
                            >
                              {effectOption.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {guidedResolution.triggered && requirements.requiresTargetSelection && hasMultiplePlayers && (
                      <div className="stack-xs">
                        <span className="label">{guidance.targetLabel}</span>
                        <div className="button-row row-wrap">
                          {roundState.players.map((player) => (
                            <button
                              key={player.id}
                              type="button"
                              className={
                                guidedResolution.winningPlayerId === player.id ? 'button-primary' : ''
                              }
                              onClick={() => setCardWinner(card.id, player.id)}
                            >
                              {player.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {guidedResolution.triggered && requirements.requiresTargetSelection && !hasMultiplePlayers && (
                      <p className="muted">{guidance.autoResolvedHint}</p>
                    )}

                    {guidedResolution.triggered && requirements.requiresAffectedSelection && hasMultiplePlayers && (
                      <div className="stack-xs">
                        <span className="label">{guidance.affectedLabel}</span>
                        <div className="button-row row-wrap">
                          {roundState.players.map((player) => {
                            const isAffected = guidedResolution.affectedPlayerIds.includes(player.id)

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

                    {guidedResolution.triggered && requirements.requiresAffectedSelection && !hasMultiplePlayers && (
                      <p className="muted">{guidance.autoResolvedHint}</p>
                    )}

                    {!isPublicCardResolutionComplete(card, guidedResolution, playerIds) && (
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
        </section>
      )}

      <section className="panel stack-xs hole-results-next">
        <button
          type="button"
          className="button-primary"
          disabled={!canContinueToRecap}
          onClick={continueToRecap}
        >
          <img className="button-icon" src={ICONS.holeRecap} alt="" aria-hidden="true" />
          Save Results And View Hole Recap
        </button>
        {!canContinueToRecap && (
          <p className="muted">
            Complete all required stroke, challenge, and public-card inputs before continuing.
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
