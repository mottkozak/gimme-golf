import { useEffect, useState } from 'react'
import { ICONS } from '../app/icons.ts'
import AppIcon from '../components/AppIcon.tsx'
import BadgeChip from '../components/BadgeChip.tsx'
import FeaturedHoleBanner from '../components/FeaturedHoleBanner.tsx'
import GolferScoreModule from '../components/GolferScoreModule.tsx'
import HoleActionPanel from '../components/HoleActionPanel.tsx'
import HoleInfoCard from '../components/HoleInfoCard.tsx'
import HoleResultsProgressBoard, { type HoleResultsProgressItem } from '../components/HoleResultsProgressBoard.tsx'
import MissionResultCard from '../components/MissionResultCard.tsx'
import MissionStatusPill from '../components/MissionStatusPill.tsx'
import PublicCardResolutionPanel from '../components/PublicCardResolutionPanel.tsx'
import ScoreButtonGroup from '../components/ScoreButtonGroup.tsx'
import {
  trackHoleCompleted,
  trackPublicCardResolution,
  trackScoreEntered,
} from '../logic/analytics.ts'
import {
  buildPublicResolutionNotes,
  getPublicCardResolutionMode,
  getPublicResolutionGuidance,
  getPublicResolutionInputRequirements,
  isPublicCardResolutionComplete,
  normalizePublicCardResolutions,
  resolvePublicCardPointDeltas,
} from '../logic/publicCardResolution.ts'
import { getDisplayPlayerName } from '../logic/playerNames.ts'
import { getAssignedCurse, getAssignedPowerUp } from '../logic/powerUps.ts'
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
const HIGH_STROKE_OPTIONS = [7, 8, 9, 10, 12] as const

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

function buildHighStrokeOptions(
  quickStrokeOptions: number[],
): number[] {
  return HIGH_STROKE_OPTIONS.filter((strokeOption) => !quickStrokeOptions.includes(strokeOption))
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
  const [manualStrokeInputByPlayerId, setManualStrokeInputByPlayerId] = useState<
    Record<string, boolean>
  >({})

  const currentHole = roundState.holes[roundState.currentHoleIndex]
  const currentResult = roundState.holeResults[roundState.currentHoleIndex]
  const currentHoleCards = roundState.holeCards[roundState.currentHoleIndex]
  const currentHolePowerUps = roundState.holePowerUps[roundState.currentHoleIndex]
  const isPowerUpsMode = roundState.config.gameMode === 'powerUps'
  const playerNameById = Object.fromEntries(
    roundState.players.map((player, index) => [player.id, getDisplayPlayerName(player.name, index)]),
  )
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
    trackPublicCardResolution(roundState, currentHole.holeNumber, card.id, 'trigger_toggle')
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
    trackPublicCardResolution(roundState, currentHole.holeNumber, cardId, 'winner_select')
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
    trackPublicCardResolution(roundState, currentHole.holeNumber, cardId, 'vote_target_select')
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
    trackPublicCardResolution(roundState, currentHole.holeNumber, cardId, 'affected_toggle')
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
    trackPublicCardResolution(roundState, currentHole.holeNumber, card.id, 'effect_select')
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

  const setStrokes = (
    playerId: string,
    nextStrokes: number | null,
    inputMethod:
      | 'quick_button'
      | 'high_button'
      | 'adjust_minus'
      | 'adjust_plus'
      | 'quick_9_plus'
      | 'manual_input'
      | 'manual_reset' = 'manual_input',
  ) => {
    trackScoreEntered(roundState, currentHole.holeNumber, playerId, nextStrokes, inputMethod)
    const nextStrokesByPlayerId = {
      ...currentResult.strokesByPlayerId,
      [playerId]: nextStrokes,
    }
    const nextStrokesStepComplete = roundState.players.every(
      (player) => typeof nextStrokesByPlayerId[player.id] === 'number',
    )
    if (nextStrokesStepComplete) {
      if (hasMissionStep && !missionStepComplete && !missionSectionExpanded) {
        setMissionSectionExpanded(true)
      }

      if (!hasMissionStep && hasPublicStep && !publicStepComplete && !publicSectionExpanded) {
        setPublicSectionExpanded(true)
      }
    }

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
    const nextMissionStatusByPlayerId = {
      ...currentResult.missionStatusByPlayerId,
      [playerId]: status,
    }
    const nextMissionStepComplete = missionRequiredPlayerIds.every((requiredPlayerId) =>
      isResolvedMissionStatus(nextMissionStatusByPlayerId[requiredPlayerId]),
    )

    if (nextMissionStepComplete && hasPublicStep && !publicStepComplete && !publicSectionExpanded) {
      setPublicSectionExpanded(true)
    }

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
  const hasPublicStep = !isPowerUpsMode && currentHoleCards.publicCards.length > 0

  const strokesStepComplete = strokesCompletedCount === roundState.players.length
  const missionStepComplete =
    !hasMissionStep || missionResolvedCount === missionRequiredPlayerIds.length
  const publicStepComplete =
    !hasPublicStep || resolvedPublicCardsCount === currentHoleCards.publicCards.length

  const totalSteps = 1 + (hasMissionStep ? 1 : 0) + (hasPublicStep ? 1 : 0)
  const completedSteps =
    (strokesStepComplete ? 1 : 0) +
    (hasMissionStep && missionStepComplete ? 1 : 0) +
    (hasPublicStep && publicStepComplete ? 1 : 0)

  const missionCanExpand = strokesStepComplete
  const publicCanExpand = strokesStepComplete && missionStepComplete

  const missionStepNumber = 2
  const publicStepNumber = hasMissionStep ? 3 : 2

  const stepItems: HoleResultsProgressItem[] = [
    {
      id: 'strokes',
      label: 'Strokes',
      complete: strokesStepComplete,
      progressText: `${strokesCompletedCount}/${roundState.players.length} entered`,
    },
  ]

  if (hasMissionStep) {
    stepItems.push({
      id: 'challenge',
      label: 'Challenge',
      complete: missionStepComplete,
      progressText: `${missionResolvedCount}/${missionRequiredPlayerIds.length} resolved`,
    })
  }

  if (hasPublicStep) {
    stepItems.push({
      id: 'public-card',
      label: 'Public Card',
      complete: publicStepComplete,
      progressText: `${resolvedPublicCardsCount}/${currentHoleCards.publicCards.length} resolved`,
    })
  }

  const continueToRecap = () => {
    if (!canContinueToRecap) {
      return
    }
    trackHoleCompleted(roundState, currentHole.holeNumber)

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
    <section className="screen stack-sm hole-results-screen hole-results-screen--editorial">
      <header className="screen__header hole-results-header hole-results-header--editorial">
        <div className="row-between hole-results-header__title-row">
          <div className="screen-title">
            <AppIcon className="screen-title__icon" icon={ICONS.holeResults} />
            <h2>Hole Results</h2>
          </div>
          <BadgeChip tone="count" className="hole-results-progress-chip">
            Hole {currentHole.holeNumber} of {roundState.holes.length}
          </BadgeChip>
        </div>
        <p className="muted">Step 2 of 2: enter strokes first, then resolve required cards.</p>
      </header>

      <FeaturedHoleBanner featuredHoleType={currentHole.featuredHoleType} compact />

      <HoleResultsProgressBoard
        items={stepItems}
        helperText="Only required sections appear for this hole."
      />

      <section className="panel stack-xs hole-results-entry-panel">
        <div className="row-between hole-results-step-header">
          <strong>1. Strokes</strong>
          <MissionStatusPill
            label={
              strokesStepComplete
                ? 'All scores entered'
                : `${strokesCompletedCount}/${roundState.players.length} entered`
            }
            tone={strokesStepComplete ? 'ready' : 'pending'}
          />
        </div>
        <p className="muted">Tap a common score, or use Other score for anything else.</p>

        {roundState.players.map((player) => {
          const selectedCardId = currentHoleCards.selectedCardIdByPlayerId[player.id]
          const selectedCard = (currentHoleCards.dealtPersonalCardsByPlayerId[player.id] ?? []).find(
            (card) => card.id === selectedCardId,
          )
          const assignedPowerUp = getAssignedPowerUp(currentHolePowerUps, player.id)
          const assignedCurse = getAssignedCurse(currentHolePowerUps, player.id)
          const powerUpUsed = currentHolePowerUps?.usedPowerUpByPlayerId[player.id] ?? false
          const strokes = currentResult.strokesByPlayerId[player.id]
          const quickStrokeOptions = buildQuickStrokeOptions(currentHole.par)
          const highStrokeOptions = buildHighStrokeOptions(quickStrokeOptions)
          const hasManualValue =
            typeof strokes === 'number' && !quickStrokeOptions.includes(strokes)
          const showManualInput = manualStrokeInputByPlayerId[player.id] || hasManualValue
          const scoreStatusLabel = typeof strokes === 'number' ? `${strokes} strokes` : 'Pending'
          const scoreStatusTone = typeof strokes === 'number' ? 'ready' : 'pending'

          return (
            <GolferScoreModule
              key={player.id}
              playerName={playerNameById[player.id]}
              statusSlot={<MissionStatusPill label={scoreStatusLabel} tone={scoreStatusTone} />}
              missionSlot={
                selectedCard ? (
                  <button
                    type="button"
                    className="chip chip-button badge-chip badge-chip--subtle hole-score-module__mission-chip"
                    onClick={() =>
                      setActiveCardPreview({
                        playerName: playerNameById[player.id],
                        card: selectedCard,
                      })
                    }
                  >
                    {selectedCard.code} - {selectedCard.name}
                  </button>
                ) : (
                  <BadgeChip tone="subtle">{isPowerUpsMode ? 'Power Ups Mode' : 'No card'}</BadgeChip>
                )
              }
              helperText={
                isPowerUpsMode
                  ? [
                      assignedPowerUp
                        ? `Power Up: ${assignedPowerUp.title} (${powerUpUsed ? 'Used' : 'Unused'})`
                        : 'Power Up: none',
                      assignedCurse ? `Curse: ${assignedCurse.title}` : 'Curse: none',
                    ].join(' | ')
                  : selectedCard
                    ? `${selectedCard.name} (${selectedCard.points} pts on success)`
                    : 'No personal card selected for this golfer.'
              }
            >
              <span className="label">Strokes</span>
              <ScoreButtonGroup
                options={quickStrokeOptions}
                selectedScore={strokes}
                onToggle={(strokeOption, isSelected) => {
                  const nextStrokeValue = isSelected ? null : strokeOption
                  setStrokes(player.id, nextStrokeValue, 'quick_button')
                  if (!isSelected) {
                    setManualStrokeInputByPlayerId((current) => ({
                      ...current,
                      [player.id]: false,
                    }))
                  }
                }}
              />

              {highStrokeOptions.length > 0 && (
                <ScoreButtonGroup
                  options={highStrokeOptions}
                  selectedScore={strokes}
                  variant="high"
                  onToggle={(strokeOption, isSelected) => {
                    const nextStrokeValue = isSelected ? null : strokeOption
                    setStrokes(player.id, nextStrokeValue, 'high_button')
                    if (!isSelected && strokeOption >= 9) {
                      setManualStrokeInputByPlayerId((current) => ({
                        ...current,
                        [player.id]: true,
                      }))
                    }
                  }}
                />
              )}

              <div className="button-row hole-score-adjust-row">
                <button
                  type="button"
                  className="chip chip-button badge-chip badge-chip--subtle hole-score-adjust-button"
                  onClick={() => {
                    const baseStrokes = typeof strokes === 'number' ? strokes : currentHole.par
                    setStrokes(player.id, Math.max(1, baseStrokes - 1), 'adjust_minus')
                  }}
                >
                  -1 stroke
                </button>
                <button
                  type="button"
                  className="chip chip-button badge-chip badge-chip--subtle hole-score-adjust-button"
                  onClick={() => {
                    const baseStrokes = typeof strokes === 'number' ? strokes : currentHole.par
                    const nextStrokeValue = baseStrokes + 1
                    setStrokes(player.id, nextStrokeValue, 'adjust_plus')
                    if (nextStrokeValue >= 9) {
                      setManualStrokeInputByPlayerId((current) => ({
                        ...current,
                        [player.id]: true,
                      }))
                    }
                  }}
                >
                  +1 stroke
                </button>
                <button
                  type="button"
                  className="chip chip-button badge-chip badge-chip--subtle hole-score-adjust-button"
                  onClick={() => {
                    const nextStrokeValue =
                      typeof strokes === 'number' ? Math.max(strokes, 9) : 9
                    setStrokes(player.id, nextStrokeValue, 'quick_9_plus')
                    setManualStrokeInputByPlayerId((current) => ({
                      ...current,
                      [player.id]: true,
                    }))
                  }}
                >
                  9+ quick
                </button>
              </div>

              {!showManualInput && (
                <button
                  type="button"
                  className="chip chip-button badge-chip badge-chip--subtle hole-score-manual-toggle"
                  onClick={() =>
                    setManualStrokeInputByPlayerId((current) => ({
                      ...current,
                      [player.id]: true,
                    }))
                  }
                >
                  Other score
                </button>
              )}

              {showManualInput && (
                <div className="stack-xs hole-score-manual-entry">
                  <label className="field field--inline hole-score-manual-field">
                    <span className="label">Other score</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      step={1}
                      value={typeof strokes === 'number' ? String(strokes) : ''}
                      placeholder="Score"
                      onChange={(event) => {
                        const parsedStrokes = parseStrokeInput(event.target.value)
                        setStrokes(player.id, parsedStrokes, 'manual_input')
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.currentTarget.blur()
                        }
                      }}
                    />
                  </label>
                  <div className="button-row">
                    {typeof strokes === 'number' && (
                      <button
                        type="button"
                        className="chip chip-button badge-chip badge-chip--subtle hole-score-reset-button"
                        onClick={() => setStrokes(player.id, null, 'manual_reset')}
                      >
                        Reset
                      </button>
                    )}
                    {!hasManualValue && (
                      <button
                        type="button"
                        className="chip chip-button badge-chip badge-chip--subtle hole-score-reset-button"
                        onClick={() =>
                          setManualStrokeInputByPlayerId((current) => ({
                            ...current,
                            [player.id]: false,
                          }))
                        }
                      >
                        Hide
                      </button>
                    )}
                  </div>
                </div>
              )}
            </GolferScoreModule>
          )
        })}
      </section>

      {hasMissionStep && (
        <section className="panel stack-xs hole-results-step-panel hole-results-step-panel--mission">
          <div className="row-between hole-results-step-header">
            <strong>{missionStepNumber}. Mission Results</strong>
            <MissionStatusPill
              label={
                missionStepComplete
                  ? 'Missions resolved'
                  : `${missionResolvedCount}/${missionRequiredPlayerIds.length} resolved`
              }
              tone={missionStepComplete ? 'ready' : 'pending'}
            />
          </div>
          <div className="row-between hole-results-step-actions">
            <p className="muted">Mark each selected mission as completed or failed.</p>
            <button
              type="button"
              className={`hole-results-toggle-button ${
                missionSectionExpanded ? 'hole-results-toggle-button--active' : ''
              }`}
              onClick={onToggleMissionSection}
              aria-expanded={missionSectionExpanded}
              aria-controls="mission-resolution-section"
              disabled={!missionCanExpand}
            >
              {missionSectionExpanded ? 'Hide' : missionStepComplete ? 'Review' : 'Resolve'}
            </button>
          </div>

          {!missionCanExpand && <p className="muted">Finish Step 1 to unlock this section.</p>}

          {missionSectionExpanded && (
            <section
              id="mission-resolution-section"
              className="stack-xs hole-results-resolution-list"
              role="region"
              aria-label="Mission resolution"
            >
              {roundState.players.map((player) => {
                const selectedCardId = currentHoleCards.selectedCardIdByPlayerId[player.id]
                const selectedCard = (currentHoleCards.dealtPersonalCardsByPlayerId[player.id] ?? []).find(
                  (card) => card.id === selectedCardId,
                )
                const missionStatus = currentResult.missionStatusByPlayerId[player.id]

                return (
                  <MissionResultCard
                    key={player.id}
                    playerName={playerNameById[player.id]}
                    missionLabel={
                      selectedCard ? `${selectedCard.code} - ${selectedCard.name}` : undefined
                    }
                    missionStatus={missionStatus}
                    onSetStatus={
                      selectedCard
                        ? (status) => {
                            setMissionStatus(player.id, status)
                          }
                        : undefined
                    }
                  />
                )
              })}
            </section>
          )}
        </section>
      )}

      {hasPublicStep && (
        <section className="panel stack-xs hole-results-step-panel hole-results-step-panel--public">
          <div className="row-between hole-results-step-header">
            <strong>{publicStepNumber}. Public Card Resolution</strong>
            <MissionStatusPill
              label={
                publicStepComplete
                  ? 'Public cards resolved'
                  : `${resolvedPublicCardsCount}/${currentHoleCards.publicCards.length} resolved`
              }
              tone={publicStepComplete ? 'ready' : 'pending'}
            />
          </div>
          <div className="row-between hole-results-step-actions">
            <p className="muted">Resolve each public card, then confirm the score preview.</p>
            <button
              type="button"
              className={`hole-results-toggle-button ${
                publicSectionExpanded ? 'hole-results-toggle-button--active' : ''
              }`}
              onClick={onTogglePublicSection}
              aria-expanded={publicSectionExpanded}
              aria-controls="public-resolution-section"
              disabled={!publicCanExpand}
            >
              {publicSectionExpanded ? 'Hide' : publicStepComplete ? 'Review' : 'Resolve'}
            </button>
          </div>

          {!publicCanExpand && <p className="muted">Finish earlier required steps first.</p>}

          {publicSectionExpanded && (
            <section
              id="public-resolution-section"
              className="stack-xs hole-results-resolution-list"
              role="region"
              aria-label="Public card resolution"
            >
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
                const effectOptions = getEffectOptions(card)
                const isCardResolved = isPublicCardResolutionComplete(card, guidedResolution, playerIds)

                return (
                  <PublicCardResolutionPanel
                    key={card.id}
                    title={card.name}
                    statusSlot={
                      <MissionStatusPill
                        label={isCardResolved ? 'Resolved' : 'Needs input'}
                        tone={isCardResolved ? 'ready' : 'pending'}
                      />
                    }
                    metadataSlot={
                      <>
                        <BadgeChip tone="subtle">{card.cardType.toUpperCase()}</BadgeChip>
                        <BadgeChip tone="reward">
                          {card.points > 0 ? '+' : ''}
                          {card.points} pts
                        </BadgeChip>
                      </>
                    }
                    description={card.description}
                  >
                    <div className="stack-xs hole-results-public-field">
                      <span className="label">{guidance.triggerPrompt}</span>
                      <div className="segmented-control hole-result-toggle-group">
                        <button
                          type="button"
                          className={`segmented-control__button ${
                            guidedResolution.triggered ? 'segmented-control__button--active' : ''
                          }`}
                          onClick={() => setCardTriggered(card, true)}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          className={`segmented-control__button ${
                            !guidedResolution.triggered ? 'segmented-control__button--active' : ''
                          }`}
                          onClick={() => setCardTriggered(card, false)}
                        >
                          No
                        </button>
                      </div>
                      {guidance.triggerHelp && <p className="muted">{guidance.triggerHelp}</p>}
                    </div>

                    {guidedResolution.triggered && requirements.requiresVoteTarget && hasMultiplePlayers && (
                      <div className="stack-xs hole-results-public-field">
                        <span className="label">{guidance.voteTargetLabel}</span>
                        <div className="button-row row-wrap">
                          {roundState.players.map((player) => (
                            <button
                              key={player.id}
                              type="button"
                              className={`hole-public-target-button ${
                                unanimousVoteTargetPlayerId === player.id
                                  ? 'hole-public-target-button--selected'
                                  : ''
                              }`}
                              onClick={() => setUnifiedVoteTarget(card.id, player.id)}
                            >
                              {playerNameById[player.id]}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {guidedResolution.triggered && requirements.requiresVoteTarget && !hasMultiplePlayers && (
                      <p className="muted">{guidance.autoResolvedHint}</p>
                    )}

                    {guidedResolution.triggered && requirements.requiresEffectChoice && (
                      <div className="stack-xs hole-results-public-field">
                        <span className="label">{guidance.effectChoiceLabel}</span>
                        <div
                          className={
                            effectOptions.length === 2
                              ? 'segmented-control hole-result-toggle-group'
                              : 'button-row row-wrap'
                          }
                        >
                          {effectOptions.map((effectOption) => {
                            const isSelected = guidedResolution.selectedEffectOptionId === effectOption.id

                            return (
                              <button
                                key={effectOption.id}
                                type="button"
                                className={
                                  effectOptions.length === 2
                                    ? `segmented-control__button ${
                                        isSelected ? 'segmented-control__button--active' : ''
                                      }`
                                    : `hole-public-target-button ${
                                        isSelected ? 'hole-public-target-button--selected' : ''
                                      }`
                                }
                                onClick={() => setSelectedEffectOption(card, effectOption.id)}
                              >
                                {effectOption.label}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {guidedResolution.triggered && requirements.requiresTargetSelection && hasMultiplePlayers && (
                      <div className="stack-xs hole-results-public-field">
                        <span className="label">{guidance.targetLabel}</span>
                        <div className="button-row row-wrap">
                          {roundState.players.map((player) => (
                            <button
                              key={player.id}
                              type="button"
                              className={`hole-public-target-button ${
                                guidedResolution.winningPlayerId === player.id
                                  ? 'hole-public-target-button--selected'
                                  : ''
                              }`}
                              onClick={() => setCardWinner(card.id, player.id)}
                            >
                              {playerNameById[player.id]}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {guidedResolution.triggered && requirements.requiresTargetSelection && !hasMultiplePlayers && (
                      <p className="muted">{guidance.autoResolvedHint}</p>
                    )}

                    {guidedResolution.triggered && requirements.requiresAffectedSelection && hasMultiplePlayers && (
                      <div className="stack-xs hole-results-public-field">
                        <span className="label">{guidance.affectedLabel}</span>
                        <div className="button-row row-wrap">
                          {roundState.players.map((player) => {
                            const isAffected = guidedResolution.affectedPlayerIds.includes(player.id)

                            return (
                              <button
                                key={player.id}
                                type="button"
                                className={`hole-public-target-button ${
                                  isAffected ? 'hole-public-target-button--selected' : ''
                                }`}
                                onClick={() => toggleAffectedPlayer(card.id, player.id)}
                              >
                                {playerNameById[player.id]}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {guidedResolution.triggered && requirements.requiresAffectedSelection && !hasMultiplePlayers && (
                      <p className="muted">{guidance.autoResolvedHint}</p>
                    )}
                  </PublicCardResolutionPanel>
                )
              })}

              <HoleInfoCard title="Preview Score Change" className="hole-results-public-summary-card">
                <div className="stack-xs hole-results-public-summary">
                  {roundState.players.map((player) => {
                    const delta = currentResult.publicPointDeltaByPlayerId[player.id] ?? 0
                    return (
                      <div key={player.id} className="row-between hole-results-public-summary-row">
                        <span>{playerNameById[player.id]}</span>
                        <span>
                          {delta > 0 ? '+' : ''}
                          {delta}
                        </span>
                      </div>
                    )
                  })}
                  {currentResult.publicCardResolutionNotes && (
                    <p className="muted">{currentResult.publicCardResolutionNotes}</p>
                  )}
                </div>
              </HoleInfoCard>
            </section>
          )}
        </section>
      )}

      <HoleInfoCard title="Scoring Clarity" className="hole-results-trust-note">
        <p className="muted">
          Real score tracks strokes only and is never modified by cards or power-ups. Game points
          come from side-game outcomes. Adjusted score updates automatically after you save.
        </p>
      </HoleInfoCard>

      <HoleActionPanel
        summary={`${completedSteps}/${totalSteps} steps complete`}
        statusSlot={
          <MissionStatusPill
            label={canContinueToRecap ? 'Ready to save' : 'In progress'}
            tone={canContinueToRecap ? 'ready' : 'pending'}
          />
        }
        buttonLabel="Save Hole & View Recap"
        buttonIcon={<AppIcon className="button-icon" icon={ICONS.holeRecap} />}
        disabled={!canContinueToRecap}
        helperText={canContinueToRecap ? undefined : 'Complete required steps to save this hole.'}
        onContinue={continueToRecap}
      />

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
