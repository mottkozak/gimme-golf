import { useEffect, useRef, useState } from 'react'
import { ICONS } from '../app/icons.ts'
import AppIcon from '../components/AppIcon.tsx'
import BadgeChip from '../components/BadgeChip.tsx'
import FeaturedHoleBanner from '../components/FeaturedHoleBanner.tsx'
import GolferScoreModule from '../components/GolferScoreModule.tsx'
import HoleActionPanel from '../components/HoleActionPanel.tsx'
import HoleInfoCard from '../components/HoleInfoCard.tsx'
import MissionStatusPill from '../components/MissionStatusPill.tsx'
import PublicCardResolutionPanel from '../components/PublicCardResolutionPanel.tsx'
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
import type { PersonalCard, PublicCard } from '../types/cards.ts'
import type { MissionStatus, PublicCardResolutionState, RoundState } from '../types/game.ts'
import type { ScreenProps } from './types.ts'

const QUICK_STROKE_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const
const MANUAL_STROKE_MIN = 13
const SCORE_VALUE_ANIMATION_DURATION_MS = 360
const SCORE_VALUE_FLASH_DURATION_MS = 620

type EffectOption = NonNullable<NonNullable<PublicCard['interaction']>['effectOptions']>[number]

function toTitleCase(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`
}

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

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function easeOutCubic(value: number): number {
  return 1 - (1 - value) ** 3
}

interface AnimatedStrokeLabelProps {
  strokes: number | null
}

function AnimatedStrokeLabel({ strokes }: AnimatedStrokeLabelProps) {
  const [displayedStrokes, setDisplayedStrokes] = useState<number | null>(strokes)
  const [flashTone, setFlashTone] = useState<'increase' | 'decrease' | null>(null)
  const previousStrokesRef = useRef<number | null>(strokes)
  const animationFrameRef = useRef<number | null>(null)
  const flashTimeoutRef = useRef<number | null>(null)
  const pendingStateFrameRef = useRef<number | null>(null)

  const scheduleStateUpdate = (updateCallback: () => void) => {
    if (pendingStateFrameRef.current !== null) {
      window.cancelAnimationFrame(pendingStateFrameRef.current)
    }

    pendingStateFrameRef.current = window.requestAnimationFrame(() => {
      updateCallback()
      pendingStateFrameRef.current = null
    })
  }

  useEffect(() => {
    if (pendingStateFrameRef.current !== null) {
      window.cancelAnimationFrame(pendingStateFrameRef.current)
      pendingStateFrameRef.current = null
    }

    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    if (flashTimeoutRef.current !== null) {
      window.clearTimeout(flashTimeoutRef.current)
      flashTimeoutRef.current = null
    }

    if (typeof strokes !== 'number') {
      previousStrokesRef.current = null
      scheduleStateUpdate(() => {
        setDisplayedStrokes(null)
        setFlashTone(null)
      })
      return
    }

    const previousStrokes = previousStrokesRef.current
    previousStrokesRef.current = strokes

    if (typeof previousStrokes !== 'number' || previousStrokes === strokes) {
      scheduleStateUpdate(() => {
        setDisplayedStrokes(strokes)
        setFlashTone(null)
      })
      return
    }

    const nextFlashTone = strokes > previousStrokes ? 'increase' : 'decrease'
    scheduleStateUpdate(() => {
      setFlashTone(nextFlashTone)
    })
    flashTimeoutRef.current = window.setTimeout(() => {
      setFlashTone(null)
      flashTimeoutRef.current = null
    }, SCORE_VALUE_FLASH_DURATION_MS)

    if (prefersReducedMotion()) {
      scheduleStateUpdate(() => {
        setDisplayedStrokes(strokes)
      })
      return
    }

    const startedAt = performance.now()
    const delta = strokes - previousStrokes

    const tick = (currentTime: number) => {
      const elapsed = currentTime - startedAt
      const progress = Math.min(1, elapsed / SCORE_VALUE_ANIMATION_DURATION_MS)
      const easedProgress = easeOutCubic(progress)
      const nextDisplayedValue = Math.round(previousStrokes + delta * easedProgress)
      setDisplayedStrokes(nextDisplayedValue)

      if (progress < 1) {
        animationFrameRef.current = window.requestAnimationFrame(tick)
        return
      }

      animationFrameRef.current = null
    }

    animationFrameRef.current = window.requestAnimationFrame(tick)

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }

      if (flashTimeoutRef.current !== null) {
        window.clearTimeout(flashTimeoutRef.current)
        flashTimeoutRef.current = null
      }

      if (pendingStateFrameRef.current !== null) {
        window.cancelAnimationFrame(pendingStateFrameRef.current)
        pendingStateFrameRef.current = null
      }
    }
  }, [strokes])

  if (typeof displayedStrokes !== 'number') {
    return <>Pending</>
  }

  return (
    <span
      className={`hole-score-value ${
        flashTone === 'increase'
          ? 'hole-score-value--flash-increase'
          : flashTone === 'decrease'
            ? 'hole-score-value--flash-decrease'
            : ''
      }`}
    >
      {displayedStrokes} strokes
    </span>
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
  const [challengeOverviewExpanded, setChallengeOverviewExpanded] = useState(false)
  const [publicSectionExpanded, setPublicSectionExpanded] = useState(false)
  const [manualStrokeInputByPlayerId, setManualStrokeInputByPlayerId] = useState<
    Record<string, boolean>
  >({})
  const playerSectionRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const publicCardSectionRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const publicResolutionSectionRef = useRef<HTMLElement | null>(null)
  const actionPanelRef = useRef<HTMLDivElement | null>(null)

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

  const getNextPlayerNeedingScore = (
    currentPlayerId: string,
    strokesByPlayerId: Record<string, number | null>,
  ): string | null => {
    const orderedPlayerIds = roundState.players.map((player) => player.id)
    if (orderedPlayerIds.length === 0) {
      return null
    }

    const currentPlayerIndex = orderedPlayerIds.indexOf(currentPlayerId)
    const searchOrder =
      currentPlayerIndex >= 0
        ? [
            ...orderedPlayerIds.slice(currentPlayerIndex + 1),
            ...orderedPlayerIds.slice(0, currentPlayerIndex),
          ]
        : orderedPlayerIds

    return (
      searchOrder.find((playerId) => typeof strokesByPlayerId[playerId] !== 'number') ?? null
    )
  }

  const getNextUnresolvedPublicCardId = (
    resolutionsByCardId: Record<string, PublicCardResolutionState>,
    currentCardId: string | null = null,
  ): string | null => {
    if (currentHoleCards.publicCards.length === 0) {
      return null
    }

    const currentCardIndex =
      currentCardId === null
        ? -1
        : currentHoleCards.publicCards.findIndex((card) => card.id === currentCardId)
    const splitIndex = currentCardIndex >= 0 ? currentCardIndex + 1 : 0
    const orderedCards = [
      ...currentHoleCards.publicCards.slice(splitIndex),
      ...currentHoleCards.publicCards.slice(0, splitIndex),
    ]

    const nextCard = orderedCards.find(
      (card) => !isPublicCardResolutionComplete(card, resolutionsByCardId[card.id], playerIds),
    )

    return nextCard?.id ?? null
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
    }, { sourceCardId: card.id })
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
    }, { sourceCardId: cardId })
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
    }, { sourceCardId: cardId })
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
    }, { sourceCardId: cardId })
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
    trackScoreEntered(roundState, currentHole.holeNumber, playerId, nextStrokes, inputMethod)
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
  const challengeOverviewRows = roundState.players.map((player) => {
    const selectedCardId = currentHoleCards.selectedCardIdByPlayerId[player.id]
    const selectedCard = (currentHoleCards.dealtPersonalCardsByPlayerId[player.id] ?? []).find(
      (card) => card.id === selectedCardId,
    )
    const missionStatus = currentResult.missionStatusByPlayerId[player.id]
    const statusLabel =
      missionStatus === 'success'
        ? 'Completed'
        : missionStatus === 'failed'
          ? 'Failed'
          : 'Pending'
    const statusClassName =
      missionStatus === 'success'
        ? 'status-success'
        : missionStatus === 'failed'
          ? 'status-failed'
          : 'status-pending'

    return {
      playerId: player.id,
      playerName: playerNameById[player.id],
      selectedCard,
      statusLabel,
      statusClassName,
    }
  })
  const challengeAssignedCount = challengeOverviewRows.filter((row) => Boolean(row.selectedCard)).length
  const hasChallengeOverview = !isPowerUpsMode && challengeAssignedCount > 0

  const continueToRecap = () => {
    if (!canContinueToRecap) {
      return
    }
    trackHoleCompleted(roundState, currentHole.holeNumber)

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

      {hasChallengeOverview && (
        <section className="panel stack-xs hole-results-step-panel hole-results-step-panel--mission">
          <div className="row-between hole-results-step-header">
            <strong>Current Challenges</strong>
            <MissionStatusPill
              label={`${challengeAssignedCount}/${roundState.players.length} assigned`}
              tone="ready"
            />
          </div>
          <div className="row-between hole-results-step-actions">
            <p className="muted">Review each golfer&apos;s selected card before entering outcomes.</p>
            <button
              type="button"
              className={`hole-results-toggle-button ${
                challengeOverviewExpanded ? 'hole-results-toggle-button--active' : ''
              }`}
              onClick={() => setChallengeOverviewExpanded((current) => !current)}
              aria-expanded={challengeOverviewExpanded}
              aria-controls="challenge-overview-section"
            >
              {challengeOverviewExpanded ? 'Hide' : 'Show'}
            </button>
          </div>

          {challengeOverviewExpanded && (
            <section
              id="challenge-overview-section"
              className="hole-results-challenge-overview"
              aria-label="Current challenge cards"
            >
              <ul className="list-reset hole-results-challenge-overview-list">
                {challengeOverviewRows.map((row) => (
                  <li key={row.playerId} className="hole-results-challenge-overview-item">
                    <div className="row-between setup-row-wrap">
                      <strong className="hole-results-challenge-overview-player">{row.playerName}</strong>
                      {row.selectedCard ? (
                        <span className={`chip hole-results-challenge-status ${row.statusClassName}`}>
                          {row.statusLabel}
                        </span>
                      ) : (
                        <span className="chip hole-results-challenge-status status-pending">No card</span>
                      )}
                    </div>

                    {row.selectedCard ? (
                      <>
                        <p className="hole-results-challenge-overview-title">
                          {row.selectedCard.code} - {row.selectedCard.name}
                        </p>
                        <p className="muted">{row.selectedCard.description}</p>
                        <div className="button-row row-wrap hole-results-challenge-overview-meta">
                          <BadgeChip tone="subtle">
                            {toTitleCase(row.selectedCard.difficulty)} difficulty
                          </BadgeChip>
                          <BadgeChip tone="subtle">{toTitleCase(row.selectedCard.cardType)} card</BadgeChip>
                          <BadgeChip tone="reward">
                            Reward {row.selectedCard.points >= 0 ? '+' : ''}
                            {row.selectedCard.points} pts
                          </BadgeChip>
                        </div>
                      </>
                    ) : (
                      <p className="muted">No mission selected for this golfer.</p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </section>
      )}

      <section className="stack-sm hole-results-player-list">
        {roundState.players.map((player) => {
          const selectedCardId = currentHoleCards.selectedCardIdByPlayerId[player.id]
          const selectedCard = (currentHoleCards.dealtPersonalCardsByPlayerId[player.id] ?? []).find(
            (card) => card.id === selectedCardId,
          )
          const assignedPowerUp = getAssignedPowerUp(currentHolePowerUps, player.id)
          const assignedCurse = getAssignedCurse(currentHolePowerUps, player.id)
          const powerUpUsed = currentHolePowerUps?.usedPowerUpByPlayerId[player.id] ?? false
          const strokes = currentResult.strokesByPlayerId[player.id]
          const requiresMissionResolution = !isPowerUpsMode && Boolean(selectedCard)
          const effectiveMissionStatus = requiresMissionResolution
            ? effectiveMissionStatusByPlayerId[player.id]
            : null

          const hasManualValue = typeof strokes === 'number' && strokes >= MANUAL_STROKE_MIN
          const showManualInput = manualStrokeInputByPlayerId[player.id] || hasManualValue
          const scoreStatusLabel = <AnimatedStrokeLabel strokes={typeof strokes === 'number' ? strokes : null} />
          const scoreStatusTone = typeof strokes === 'number' ? 'ready' : 'pending'

          return (
            <div
              key={player.id}
              ref={(element) => {
                playerSectionRefs.current[player.id] = element
              }}
            >
              <GolferScoreModule
                playerName={playerNameById[player.id]}
                statusSlot={<MissionStatusPill label={scoreStatusLabel} tone={scoreStatusTone} />}
                missionSlot={
                  selectedCard ? (
                    <div className="stack-xs hole-score-module__mission-inline">
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
                        <AppIcon className="hole-score-module__mission-chip-icon" icon="info" />
                      </button>
                      {requiresMissionResolution && (
                        <div
                          className="segmented-control hole-result-toggle-group hole-score-module__mission-toggle"
                          role="group"
                          aria-label={`${playerNameById[player.id]} challenge result`}
                        >
                          <button
                            type="button"
                            className={`segmented-control__button hole-score-module__mission-toggle-button hole-score-module__mission-toggle-button--failed ${
                              effectiveMissionStatus === 'failed'
                                ? 'segmented-control__button--active'
                                : ''
                            }`}
                            onClick={() => setMissionStatus(player.id, 'failed')}
                          >
                            Failed
                          </button>
                          <button
                            type="button"
                            className={`segmented-control__button hole-score-module__mission-toggle-button hole-score-module__mission-toggle-button--completed ${
                              effectiveMissionStatus === 'success'
                                ? 'segmented-control__button--active'
                                : ''
                            }`}
                            onClick={() => setMissionStatus(player.id, 'success')}
                          >
                            Completed
                          </button>
                        </div>
                      )}
                    </div>
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
                <div className="button-row hole-score-button-group hole-score-button-group--wheel">
                  {QUICK_STROKE_OPTIONS.map((strokeOption) => {
                    const isSelected = strokes === strokeOption
                    return (
                      <button
                        key={strokeOption}
                        type="button"
                        className={`hole-score-button ${isSelected ? 'hole-score-button--selected' : ''}`}
                        onClick={() => {
                          const nextStrokeValue = isSelected ? null : strokeOption
                          setStrokes(player.id, nextStrokeValue, 'quick_button')
                          if (!isSelected) {
                            setManualStrokeInputByPlayerId((current) => ({
                              ...current,
                              [player.id]: false,
                            }))
                          }
                        }}
                        aria-pressed={isSelected}
                      >
                        {strokeOption}
                      </button>
                    )
                  })}
                  <button
                    type="button"
                    className={`hole-score-button hole-score-button--manual ${
                      showManualInput ? 'hole-score-button--selected' : ''
                    }`}
                    onClick={() => {
                      const nextStrokeValue =
                        typeof strokes === 'number' && strokes >= MANUAL_STROKE_MIN
                          ? strokes
                          : MANUAL_STROKE_MIN
                      setStrokes(player.id, nextStrokeValue, 'quick_9_plus')
                      setManualStrokeInputByPlayerId((current) => ({
                        ...current,
                        [player.id]: true,
                      }))
                    }}
                  >
                    {MANUAL_STROKE_MIN}+
                  </button>
                </div>

                {showManualInput && (
                  <div className="stack-xs hole-score-manual-entry">
                    <label className="field field--inline hole-score-manual-field">
                      <span className="label">{MANUAL_STROKE_MIN}+ score</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        step={1}
                        value={typeof strokes === 'number' ? String(strokes) : ''}
                        placeholder="Score"
                        onChange={(event) => {
                          const parsedStrokes = parseStrokeInput(event.target.value)
                          setStrokes(player.id, parsedStrokes, 'manual_input', { autoAdvance: false })
                        }}
                        onBlur={(event) => {
                          const parsedStrokes = parseStrokeInput(event.target.value)
                          if (typeof parsedStrokes === 'number') {
                            setStrokes(player.id, parsedStrokes, 'manual_input', { autoAdvance: true })
                          }
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.currentTarget.blur()
                          }
                        }}
                      />
                    </label>
                  </div>
                )}
              </GolferScoreModule>
            </div>
          )
        })}
      </section>

      {hasPublicStep && (
        <section
          className="panel stack-xs hole-results-step-panel hole-results-step-panel--public"
          ref={publicResolutionSectionRef}
        >
          <div className="row-between hole-results-step-header">
            <strong>Public Card Resolution</strong>
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
                  <div
                    key={card.id}
                    ref={(element) => {
                      publicCardSectionRefs.current[card.id] = element
                    }}
                  >
                    <PublicCardResolutionPanel
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
                  </div>
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
            <p className="hole-card-preview__reward">
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
