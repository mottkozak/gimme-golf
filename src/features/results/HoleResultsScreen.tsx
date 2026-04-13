import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { ICONS } from '../../app/icons.ts'
import { hapticLightImpact, hapticSelection, hapticSuccess } from '../../capacitor/haptics.ts'
import AppIcon from '../../components/AppIcon.tsx'
import FeaturedHoleBanner from '../../components/FeaturedHoleBanner.tsx'
import HoleActionPanel from '../../components/HoleActionPanel.tsx'
import HoleInfoCard from '../../components/HoleInfoCard.tsx'
import MissionStatusPill from '../../components/MissionStatusPill.tsx'
import {
  HoleResultsPlayerEntries,
  HoleResultsPublicResolutionSection,
} from './HoleResultsSections.tsx'
import {
  getNextPlayerNeedingScore as getNextPlayerNeedingScoreForResults,
  getNextUnresolvedPublicCardId as getNextUnresolvedPublicCardIdForResults,
  getSuggestedTargetPlayerId as getSuggestedTargetPlayerIdForResults,
} from './holeResultsOrchestration.ts'
import {
  getEffectOptions,
  sortPlayersByGamePoints,
} from '../../logic/holeResults/utils.ts'
import {
  buildPublicResolutionNotes,
  getPublicCardResolutionMode,
  isPublicCardResolutionComplete,
  normalizePublicCardResolutions,
  resolvePublicCardPointDeltas,
} from '../../logic/publicCardResolution.ts'
import { getDisplayPlayerName } from '../../logic/playerNames.ts'
import {
  incrementHoleTapCount,
  markHoleCompletedAt,
  markPublicResolutionCompletedAt,
  markPublicResolutionStartedAt,
} from '../../logic/uxMetrics.ts'
import type { PersonalCard, PublicCard } from '../../types/cards.ts'
import type { MissionStatus, PublicCardResolutionState, RoundState } from '../../types/game.ts'
import type { PowerUp } from '../../data/powerUps.ts'
import type { ScreenProps } from '../../app/screenContracts.ts'

const PersonalCardPreviewModal = lazy(() => import('../../components/hole-results/PersonalCardPreviewModal.tsx'))
const PowerUpCardPreviewModal = lazy(() => import('../../components/hole-results/PowerUpCardPreviewModal.tsx'))

let analyticsModulePromise: Promise<typeof import('../../logic/analytics.ts')> | null = null

function loadAnalyticsModule() {
  if (!analyticsModulePromise) {
    analyticsModulePromise = import('../../logic/analytics.ts')
  }

  return analyticsModulePromise
}

function trackPublicCardResolutionDeferred(
  roundState: RoundState,
  holeNumber: number,
  cardId: string,
  interaction:
    | 'trigger_toggle'
    | 'winner_select'
    | 'vote_target_select'
    | 'affected_toggle'
    | 'effect_select',
): void {
  void loadAnalyticsModule()
    .then(({ trackPublicCardResolution }) => {
      trackPublicCardResolution(roundState, holeNumber, cardId, interaction)
    })
    .catch(() => {
      // Analytics should stay best-effort and never block hole results flow.
    })
}

function trackScoreEnteredDeferred(
  roundState: RoundState,
  holeNumber: number,
  playerId: string,
  nextStrokes: number | null,
  inputMethod: 'quick_button' | 'quick_9_plus' | 'manual_input',
): void {
  void loadAnalyticsModule()
    .then(({ trackScoreEntered }) => {
      trackScoreEntered(roundState, holeNumber, playerId, nextStrokes, inputMethod)
    })
    .catch(() => {
      // Analytics should stay best-effort and never block score capture flow.
    })
}

function trackHoleCompletedDeferred(roundState: RoundState, holeNumber: number): void {
  void loadAnalyticsModule()
    .then(({ trackHoleCompleted }) => {
      trackHoleCompleted(roundState, holeNumber)
    })
    .catch(() => {
      // Analytics should stay best-effort and never block round progression.
    })
}

function HoleResultsScreen({ roundState, onNavigate, onUpdateRoundState }: ScreenProps) {
  const [activeCardPreview, setActiveCardPreview] = useState<{
    playerName: string
    expectedScore18: number
    personalPar: number
    targetStrokes: number | null
    card: PersonalCard
  } | null>(null)
  const [activePowerUpPreview, setActivePowerUpPreview] = useState<{
    playerName: string
    card: PowerUp
  } | null>(null)
  const [publicSectionExpanded, setPublicSectionExpanded] = useState(false)
  const [manualStrokeInputByPlayerId, setManualStrokeInputByPlayerId] = useState<
    Record<string, boolean>
  >({})
  const playerSectionRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const publicCardSectionRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const publicResolutionSectionRef = useRef<HTMLElement | null>(null)
  const actionPanelRef = useRef<HTMLDivElement | null>(null)

  const keepFieldVisible = (element: HTMLElement) => {
    window.requestAnimationFrame(() => {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    })
  }
  const hideManualStrokeInput = (playerId: string) => {
    hapticSelection()
    setManualStrokeInputByPlayerId((current) => ({
      ...current,
      [playerId]: false,
    }))
  }
  const showManualStrokeInput = (playerId: string) => {
    hapticSelection()
    setManualStrokeInputByPlayerId((current) => ({
      ...current,
      [playerId]: true,
    }))
  }
  const openCardPreview = (preview: {
    playerName: string
    expectedScore18: number
    personalPar: number
    targetStrokes: number | null
    card: PersonalCard
  }) => {
    hapticLightImpact()
    setActiveCardPreview(preview)
  }
  const closeCardPreview = () => {
    hapticSelection()
    setActiveCardPreview(null)
  }
  const openPowerUpPreview = (preview: { playerName: string; card: PowerUp }) => {
    hapticLightImpact()
    setActivePowerUpPreview(preview)
  }
  const closePowerUpPreview = () => {
    hapticSelection()
    setActivePowerUpPreview(null)
  }
  const currentHole = roundState.holes[roundState.currentHoleIndex]
  const currentResult = roundState.holeResults[roundState.currentHoleIndex]
  const currentHoleCards = roundState.holeCards[roundState.currentHoleIndex]
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

  const currentResolutions = normalizePublicCardResolutions(
    currentHoleCards.publicCards,
    currentResult.publicCardResolutionsByCardId,
  )
  const getSuggestedTargetPlayerId = (pointsDelta: number): string | null =>
    getSuggestedTargetPlayerIdForResults(
      pointsDelta,
      leadingPlayerId,
      trailingPlayerId,
      roundState.players[0]?.id ?? null,
    )
  const getNextPlayerNeedingScore = (
    currentPlayerId: string,
    strokesByPlayerId: Record<string, number | null>,
  ): string | null =>
    getNextPlayerNeedingScoreForResults(
      currentPlayerId,
      playerIds,
      strokesByPlayerId,
    )
  const getNextUnresolvedPublicCardId = (
    resolutionsByCardId: Record<string, PublicCardResolutionState>,
    currentCardId: string | null = null,
  ): string | null =>
    getNextUnresolvedPublicCardIdForResults({
      currentCardId,
      playerIds,
      publicCards: currentHoleCards.publicCards,
      resolutionsByCardId,
    })

  const queueScrollTo = (getTarget: () => HTMLElement | null) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const target = getTarget()
        if (!target) {
          return
        }

        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      })
    })
  }

  const scrollToPublicResolution = (cardId: string | null) => {
    if (!publicSectionExpanded) {
      setPublicSectionExpanded(true)
    }

    queueScrollTo(() => {
      if (cardId) {
        return publicCardSectionRefs.current[cardId] ?? publicResolutionSectionRef.current
      }

      return publicResolutionSectionRef.current
    })
  }

  const autoAdvanceFromScoreEntry = (
    currentPlayerId: string,
    strokesByPlayerId: Record<string, number | null>,
  ) => {
    const nextPlayerId = getNextPlayerNeedingScore(currentPlayerId, strokesByPlayerId)
    if (nextPlayerId) {
      queueScrollTo(() => playerSectionRefs.current[nextPlayerId])
      return
    }

    const allScoresEntered = roundState.players.every(
      (player) => typeof strokesByPlayerId[player.id] === 'number',
    )
    if (!allScoresEntered) {
      return
    }

    if (hasPublicStep) {
      const nextPublicCardId = getNextUnresolvedPublicCardId(currentResolutions)
      if (nextPublicCardId) {
        scrollToPublicResolution(nextPublicCardId)
        return
      }
    }

    queueScrollTo(() => actionPanelRef.current)
  }

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
    options?: { sourceCardId?: string },
  ) => {
    const nextResolutionsPreview = normalizePublicCardResolutions(
      currentHoleCards.publicCards,
      updater(currentResolutions),
    )
    const sourceCardId = options?.sourceCardId ?? null
    let nextPublicCardIdToFocus: string | null = null
    let shouldFocusActionPanel = false

    if (sourceCardId) {
      const sourceCard = currentHoleCards.publicCards.find((card) => card.id === sourceCardId)
      if (sourceCard) {
        const wasResolved = isPublicCardResolutionComplete(
          sourceCard,
          currentResolutions[sourceCardId],
          playerIds,
        )
        const isResolvedNow = isPublicCardResolutionComplete(
          sourceCard,
          nextResolutionsPreview[sourceCardId],
          playerIds,
        )

        if (!wasResolved && isResolvedNow) {
          nextPublicCardIdToFocus = getNextUnresolvedPublicCardId(
            nextResolutionsPreview,
            sourceCardId,
          )
          shouldFocusActionPanel = !nextPublicCardIdToFocus
        }
      }
    }

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

    if (nextPublicCardIdToFocus) {
      scrollToPublicResolution(nextPublicCardIdToFocus)
      return
    }

    if (shouldFocusActionPanel) {
      queueScrollTo(() => actionPanelRef.current)
    }
  }

  const setCardTriggered = (card: PublicCard, triggered: boolean) => {
    hapticSelection()
    trackPublicCardResolutionDeferred(roundState, currentHole.holeNumber, card.id, 'trigger_toggle')
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
    }, { sourceCardId: card.id })
  }

  const setCardWinner = (cardId: string, winningPlayerId: string) => {
    hapticSelection()
    trackPublicCardResolutionDeferred(roundState, currentHole.holeNumber, cardId, 'winner_select')
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
    }, { sourceCardId: cardId })
  }

  const setUnifiedVoteTarget = (cardId: string, targetPlayerId: string) => {
    hapticSelection()
    trackPublicCardResolutionDeferred(roundState, currentHole.holeNumber, cardId, 'vote_target_select')
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
    }, { sourceCardId: cardId })
  }

  const toggleAffectedPlayer = (cardId: string, playerId: string) => {
    hapticSelection()
    trackPublicCardResolutionDeferred(roundState, currentHole.holeNumber, cardId, 'affected_toggle')
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
    }, { sourceCardId: cardId })
  }

  const setSelectedEffectOption = (card: PublicCard, effectOptionId: string) => {
    hapticSelection()
    trackPublicCardResolutionDeferred(roundState, currentHole.holeNumber, card.id, 'effect_select')
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
    }, { sourceCardId: card.id })
  }

  const setStrokes = (
    playerId: string,
    nextStrokes: number | null,
    inputMethod:
      | 'quick_button'
      | 'quick_9_plus'
      | 'manual_input' = 'manual_input',
    options?: {
      autoAdvance?: boolean
    },
  ) => {
    hapticSelection()
    trackScoreEnteredDeferred(roundState, currentHole.holeNumber, playerId, nextStrokes, inputMethod)
    const nextStrokesByPlayerId = {
      ...currentResult.strokesByPlayerId,
      [playerId]: nextStrokes,
    }
    const nextStrokesStepComplete = roundState.players.every(
      (player) => typeof nextStrokesByPlayerId[player.id] === 'number',
    )
    if (nextStrokesStepComplete) {
      if (hasPublicStep && !publicStepComplete && !publicSectionExpanded) {
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

    const shouldAutoAdvance =
      options?.autoAdvance ?? (inputMethod === 'quick_button' && typeof nextStrokes === 'number')
    if (shouldAutoAdvance && typeof nextStrokes === 'number') {
      autoAdvanceFromScoreEntry(playerId, nextStrokesByPlayerId)
    }
  }

  const setMissionStatus = (playerId: string, status: Extract<MissionStatus, 'success' | 'failed'>) => {
    hapticSelection()
    if (hasPublicStep && strokesStepComplete && !publicStepComplete && !publicSectionExpanded) {
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

  const onTogglePublicSection = () => {
    hapticLightImpact()
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

  const missionRequiredPlayerIds = roundState.players
    .filter((player) => {
      const dealtCards = currentHoleCards.dealtPersonalCardsByPlayerId[player.id] ?? []
      return dealtCards.length > 0
    })
    .map((player) => player.id)
  const hasMissionStep = !isPowerUpsMode && missionRequiredPlayerIds.length > 0
  const effectiveMissionStatusByPlayerId: Record<string, Extract<MissionStatus, 'success' | 'failed'>> =
    Object.fromEntries(
      roundState.players.map((player) => [
        player.id,
        currentResult.missionStatusByPlayerId[player.id] === 'success' ? 'success' : 'failed',
      ]),
    )
  const isHoleDataReady = roundState.players.every((player) => {
    const strokes = currentResult.strokesByPlayerId[player.id]
    return typeof strokes === 'number'
  })

  const arePublicCardsResolved = currentHoleCards.publicCards.every((card) =>
    isPublicCardResolutionComplete(card, currentResolutions[card.id], playerIds),
  )

  const canContinueToRecap =
    isHoleDataReady && (isPowerUpsMode ? true : arePublicCardsResolved)

  const strokesCompletedCount = roundState.players.filter((player) =>
    typeof currentResult.strokesByPlayerId[player.id] === 'number',
  ).length

  const resolvedPublicCardsCount = currentHoleCards.publicCards.filter((card) =>
    isPublicCardResolutionComplete(card, currentResolutions[card.id], playerIds),
  ).length
  const hasPublicStep = !isPowerUpsMode && currentHoleCards.publicCards.length > 0

  const strokesStepComplete = strokesCompletedCount === roundState.players.length
  const missionStepComplete = !hasMissionStep || strokesStepComplete
  const publicStepComplete =
    !hasPublicStep || resolvedPublicCardsCount === currentHoleCards.publicCards.length

  const totalSteps = 1 + (hasMissionStep ? 1 : 0) + (hasPublicStep ? 1 : 0)
  const completedSteps =
    (strokesStepComplete ? 1 : 0) +
    (hasMissionStep && missionStepComplete ? 1 : 0) +
    (hasPublicStep && publicStepComplete ? 1 : 0)

  const publicCanExpand = strokesStepComplete
  const continueToRecap = () => {
    if (!canContinueToRecap) {
      return
    }
    hapticSuccess()
    trackHoleCompletedDeferred(roundState, currentHole.holeNumber)

    const now = Date.now()

    onUpdateRoundState((currentState) => {
      const holeIndex = currentState.currentHoleIndex
      const holeCardState = currentState.holeCards[holeIndex]
      const holeResultState = currentState.holeResults[holeIndex]
      const holeResults = [...currentState.holeResults]
      const hasPublicCards = currentState.holeCards[holeIndex].publicCards.length > 0
      const nextMissionStatusByPlayerId = {
        ...holeResultState.missionStatusByPlayerId,
      }

      for (const player of currentState.players) {
        const dealtCards = holeCardState.dealtPersonalCardsByPlayerId[player.id] ?? []
        if (dealtCards.length > 0 && nextMissionStatusByPlayerId[player.id] !== 'success') {
          nextMissionStatusByPlayerId[player.id] = 'failed'
        }
      }

      let nextHoleUxMetrics = incrementHoleTapCount(currentState.holeUxMetrics, holeIndex)
      if (!isPowerUpsMode && hasPublicCards) {
        nextHoleUxMetrics = markPublicResolutionCompletedAt(nextHoleUxMetrics, holeIndex, now)
      }
      nextHoleUxMetrics = markHoleCompletedAt(nextHoleUxMetrics, holeIndex, now)

      holeResults[holeIndex] = {
        ...holeResultState,
        missionStatusByPlayerId: nextMissionStatusByPlayerId,
      }

      return {
        ...currentState,
        holeResults,
        holeUxMetrics: nextHoleUxMetrics,
      }
    })

    onNavigate('leaderboard')
  }

  return (
    <section className="screen stack-sm hole-results-screen hole-results-screen--editorial">
      <header className="screen__header">
        <h2>Hole Results</h2>
        <p className="muted">Enter strokes first, then resolve required cards.</p>
      </header>

      <FeaturedHoleBanner featuredHoleType={currentHole.featuredHoleType} compact />
      <p className="muted hole-results-progress-text">
        {completedSteps}/{totalSteps} required sections complete.
      </p>

      {currentHole.holeNumber === 1 && (
        <HoleInfoCard title="Scoring Clarity" className="hole-results-trust-note">
          <p className="muted">
            Real score tracks strokes only and is never modified by cards or power-ups. Game
            points come from side-game outcomes. Adjusted score updates automatically after you save.
          </p>
        </HoleInfoCard>
      )}

      <section className="stack-xs hole-results-entry-copy">
        <div className="row-between hole-results-step-header">
          <strong>Strokes + Challenge</strong>
          <MissionStatusPill
            label={
              strokesStepComplete
                ? 'All scores entered'
                : `${strokesCompletedCount}/${roundState.players.length} entered`
            }
            tone={strokesStepComplete ? 'ready' : 'pending'}
          />
        </div>
        <p className="muted">
          Enter scores and set each golfer&apos;s challenge result on their card.
        </p>
      </section>

      <HoleResultsPlayerEntries
        roundState={roundState}
        currentHoleCards={currentHoleCards}
        currentResult={currentResult}
        isPowerUpsMode={isPowerUpsMode}
        playerNameById={playerNameById}
        effectiveMissionStatusByPlayerId={effectiveMissionStatusByPlayerId}
        manualStrokeInputByPlayerId={manualStrokeInputByPlayerId}
        playerSectionRefs={playerSectionRefs}
        onOpenCardPreview={openCardPreview}
        onOpenPowerUpPreview={openPowerUpPreview}
        onSetMissionStatus={setMissionStatus}
        onSetStrokes={setStrokes}
        onHideManualInput={hideManualStrokeInput}
        onShowManualInput={showManualStrokeInput}
        keepFieldVisible={keepFieldVisible}
      />

      <HoleResultsPublicResolutionSection
        hasPublicStep={hasPublicStep}
        publicSectionExpanded={publicSectionExpanded}
        publicCanExpand={publicCanExpand}
        publicStepComplete={publicStepComplete}
        resolvedPublicCardsCount={resolvedPublicCardsCount}
        currentHoleCards={currentHoleCards}
        currentResolutions={currentResolutions}
        playerIds={playerIds}
        roundState={roundState}
        playerNameById={playerNameById}
        currentResult={currentResult}
        publicCardSectionRefs={publicCardSectionRefs}
        publicResolutionSectionRef={publicResolutionSectionRef}
        onTogglePublicSection={onTogglePublicSection}
        onSetCardTriggered={setCardTriggered}
        onSetCardWinner={setCardWinner}
        onSetUnifiedVoteTarget={setUnifiedVoteTarget}
        onToggleAffectedPlayer={toggleAffectedPlayer}
        onSetSelectedEffectOption={setSelectedEffectOption}
      />

      <div ref={actionPanelRef}>
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
      </div>

      {activeCardPreview && (
        <Suspense fallback={null}>
          <PersonalCardPreviewModal
            preview={activeCardPreview}
            onClose={closeCardPreview}
          />
        </Suspense>
      )}

      {activePowerUpPreview && (
        <Suspense fallback={null}>
          <PowerUpCardPreviewModal
            preview={activePowerUpPreview}
            onClose={closePowerUpPreview}
          />
        </Suspense>
      )}
    </section>
  )
}

export default HoleResultsScreen
