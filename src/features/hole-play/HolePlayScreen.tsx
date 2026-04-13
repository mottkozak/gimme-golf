/* eslint-disable max-lines -- hole-play flow is intentionally kept in one orchestrator screen */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { HOLE_TAG_ICON_BY_TAG, ICONS } from '../../app/icons.ts'
import { hapticLightImpact, hapticSelection } from '../../capacitor/haptics.ts'
import AppIcon from '../../components/AppIcon.tsx'
import ChallengeCardView from '../../components/ChallengeCardView.tsx'
import Modal from '../../components/Modal.tsx'
import FeaturedHoleBanner from '../../components/FeaturedHoleBanner.tsx'
import GolferMissionModule from '../../components/GolferMissionModule.tsx'
import HoleActionPanel from '../../components/HoleActionPanel.tsx'
import HolePublicCardSection from '../../components/HolePublicCardSection.tsx'
import HoleMissionsAssignedSummary, {
  type IllustrativeMissionPreviewPayload,
} from './HoleMissionsAssignedSummary.tsx'
import PowerUpCard from '../../components/PowerUpCard.tsx'
import PublicCardView from '../../components/PublicCardView.tsx'
import { createEmptyHoleCardsState } from '../../logic/dealCards.ts'
import { prepareCurrentHoleForPlay } from '../../logic/holeFlow.ts'
import { getNextPendingPlayerId } from '../../logic/holePlay.ts'
import { getDisplayPlayerName } from '../../logic/playerNames.ts'
import { getPersonalCardArtwork, getPublicCardArtwork, getPowerUpCardArtwork } from '../../logic/cardArtwork.ts'
import {
  DEFAULT_EDGE_SWIPE_BACK_THRESHOLDS,
  isEdgeSwipeBackGesture,
  shouldCaptureEdgeSwipeBackStart,
} from '../../logic/edgeSwipeBack.ts'
import {
  getAssignedCurse,
  getAssignedPowerUp,
  createEmptyHolePowerUpState,
} from '../../logic/powerUps.ts'
import { getEffectiveChallengeLayout } from '../../logic/preferences.ts'
import { HOLE_TAG_OPTIONS, normalizePar, toggleHoleTag } from '../../logic/roundSetup.ts'
import { incrementHoleTapCount } from '../../logic/uxMetrics.ts'
import type { FeaturedHoleType, RoundState } from '../../types/game.ts'
import type { HoleTag } from '../../types/cards.ts'
import type { ScreenProps } from '../../app/screenContracts.ts'

function trackHoleStartedDeferred(roundState: RoundState, holeNumber: number, isHolePrepared: boolean): void {
  void import('../../logic/analytics.ts')
    .then(({ trackHoleStarted }) => {
      trackHoleStarted(roundState, holeNumber, isHolePrepared)
    })
    .catch(() => {
      // Analytics should stay best-effort and never block hole flow.
    })
}

function trackCardSelectedDeferred(
  roundState: RoundState,
  holeNumber: number,
  playerId: string,
  cardId: string,
): void {
  void import('../../logic/analytics.ts')
    .then(({ trackCardSelected }) => {
      trackCardSelected(roundState, holeNumber, playerId, cardId)
    })
    .catch(() => {
      // Analytics should stay best-effort and never block card selection.
    })
}

function getCarouselCenteredCardIndex(viewport: HTMLElement): number {
  const rect = viewport.getBoundingClientRect()
  const centerX = rect.left + rect.width / 2
  const slides = viewport.querySelectorAll<HTMLElement>('[data-illustrative-carousel-slide]')
  let bestIndex = 0
  let bestDistance = Number.POSITIVE_INFINITY
  slides.forEach((slide, index) => {
    const slideRect = slide.getBoundingClientRect()
    const slideCenterX = slideRect.left + slideRect.width / 2
    const distance = Math.abs(slideCenterX - centerX)
    if (distance < bestDistance) {
      bestDistance = distance
      bestIndex = index
    }
  })
  return bestIndex
}

function HolePlayIllustrativeMissionHeroHeader({
  playerName,
  holeNumber,
  par,
  activePlayerOrdinal,
  playersRequiringCount,
}: {
  playerName: string
  holeNumber: number
  par: number
  activePlayerOrdinal: number
  playersRequiringCount: number
}) {
  return (
    <header className="screen__header hole-play-header hole-play-header--illustrative-mission stack-xs hole-illustrative-selection__header">
      <h2>Hole Setup: {playerName}</h2>
      <p className="muted">Select a mission to complete on this hole.</p>
      <p className="hole-illustrative-selection__hole-line">
        Hole {holeNumber} - Par {par}
      </p>
      <p className="muted">
        Player {activePlayerOrdinal} of {playersRequiringCount}
      </p>
    </header>
  )
}

function HolePlayDefaultTopSection({
  isPowerUpsMode,
  holeNumber,
  par,
  isHolePrepared,
  featuredHoleType,
}: {
  isPowerUpsMode: boolean
  holeNumber: number
  par: number
  isHolePrepared: boolean
  featuredHoleType: FeaturedHoleType | null
}) {
  return (
    <>
      <header className="screen__header hole-play-header">
        <h2>{isPowerUpsMode ? 'Hole Setup: Power Ups' : 'Hole Setup: Missions'}</h2>
        <p className="muted">
          Hole {holeNumber} • Par {par}
        </p>
      </header>

      <FeaturedHoleBanner featuredHoleType={featuredHoleType} compact />
      <p className="muted hole-play-intro">
        {!isHolePrepared
          ? `Confirm par, optionally add tags, then ${isPowerUpsMode ? 'deal power-ups' : 'deal cards'}.`
          : 'Review assignments, play the hole, then continue to Hole Results.'}
      </p>
    </>
  )
}

// eslint-disable-next-line complexity -- hole flow composes setup, missions, power-ups, and illustrative carousel
function HolePlayScreen({ roundState, onNavigate, onUpdateRoundState }: ScreenProps) {
  const trackedHoleIndexRef = useRef<number | null>(null)
  const playerModuleRefById = useRef<Record<string, HTMLDivElement | null>>({})
  const actionPanelRef = useRef<HTMLDivElement | null>(null)
  const currentHoleIndex = roundState.currentHoleIndex
  const currentHole = roundState.holes[currentHoleIndex]
  const currentHoleCards = roundState.holeCards[currentHoleIndex]
  const currentHolePowerUps = roundState.holePowerUps[currentHoleIndex]
  const isPowerUpsMode = roundState.config.gameMode === 'powerUps'
  const challengeLayout = getEffectiveChallengeLayout()
  const isIllustrativeChallengeLayout = challengeLayout === 'illustrative'
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

  const playersRequiringSelection = isDrawTwoPickOne
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
  const canSelectCards = isDrawTwoPickOne
  const readinessSummary =
    playersRequiringSelection.length > 0
      ? `Selections ready: ${readyPlayersCount} / ${playersRequiringSelection.length}`
      : 'All selections ready'
  const missionHelperCopy = canSelectCards
    ? 'Pick one mission card for each golfer before continuing.'
    : isNoMercyHole
      ? 'No Mercy is active, so safe missions are removed this hole.'
      : 'Missions are auto-assigned this hole.'
  const isIllustrativeSequentialSelection = isIllustrativeChallengeLayout && canSelectCards
  const [illustrativeDraftCardIdByPlayerId, setIllustrativeDraftCardIdByPlayerId] = useState<
    Record<string, string>
  >({})
  const [illustrativeMissionPreview, setIllustrativeMissionPreview] =
    useState<IllustrativeMissionPreviewPayload | null>(null)
  const illustrativeMissionPreviewArtwork = illustrativeMissionPreview
    ? getPersonalCardArtwork(illustrativeMissionPreview.card)
    : null
  const activeSelectionPlayer = isIllustrativeSequentialSelection
    ? playersRequiringSelection.find((player) => {
        const selectedCardId = currentHoleCards.selectedCardIdByPlayerId[player.id]
        return !(typeof selectedCardId === 'string' && selectedCardId.length > 0)
      }) ?? null
    : null
  const activeSelectionPlayerCards = activeSelectionPlayer
    ? currentHoleCards.dealtPersonalCardsByPlayerId[activeSelectionPlayer.id] ?? []
    : []
  const activeSelectionPlayerIndex = activeSelectionPlayer
    ? playersRequiringSelection.findIndex((player) => player.id === activeSelectionPlayer.id)
    : -1
  const activeIllustrativeCardId =
    activeSelectionPlayer &&
    activeSelectionPlayerCards.some(
      (card) => card.id === illustrativeDraftCardIdByPlayerId[activeSelectionPlayer.id],
    )
      ? illustrativeDraftCardIdByPlayerId[activeSelectionPlayer.id]
      : activeSelectionPlayerCards[0]?.id ?? null
  useEffect(() => {
    if (trackedHoleIndexRef.current === currentHoleIndex) {
      return
    }

    trackedHoleIndexRef.current = currentHoleIndex
    trackHoleStartedDeferred(roundState, currentHole.holeNumber, isHolePrepared)
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
    hapticSelection()
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
    hapticSelection()
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
    hapticLightImpact()
    updateCurrentHole((currentState) => prepareCurrentHoleForPlay(currentState))
  }

  const scrollToNextSelectionTarget = (nextPlayerId: string | null) => {
    window.requestAnimationFrame(() => {
      if (nextPlayerId) {
        const nextPlayerElement = playerModuleRefById.current[nextPlayerId]
        nextPlayerElement?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest',
        })
        return
      }

      actionPanelRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest',
      })
    })
  }

  const selectCard = (playerId: string, cardId: string) => {
    hapticSelection()
    trackCardSelectedDeferred(roundState, currentHole.holeNumber, playerId, cardId)
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

    if (!canSelectCards) {
      return
    }

    const nextSelectedCardIdByPlayerId = {
      ...currentHoleCards.selectedCardIdByPlayerId,
      [playerId]: cardId,
    }
    const nextPendingPlayerId = getNextPendingPlayerId(
      playersRequiringSelection,
      playerId,
      nextSelectedCardIdByPlayerId,
    )

    scrollToNextSelectionTarget(nextPendingPlayerId)
  }

  const previewIllustrativeCard = (playerId: string, cardId: string) => {
    setIllustrativeDraftCardIdByPlayerId((current) => ({
      ...current,
      [playerId]: cardId,
    }))
  }

  const confirmIllustrativeCardSelection = () => {
    if (!activeSelectionPlayer || !activeIllustrativeCardId) {
      return
    }

    selectCard(activeSelectionPlayer.id, activeIllustrativeCardId)
    setIllustrativeDraftCardIdByPlayerId((current) => {
      const next = { ...current }
      delete next[activeSelectionPlayer.id]
      return next
    })
  }

  const illustrativeCarouselViewportRef = useRef<HTMLDivElement>(null)
  const illustrativeCarouselSlideRefs = useRef<Record<string, HTMLElement | null>>({})
  const illustrativeCarouselCardsRef = useRef(activeSelectionPlayerCards)
  illustrativeCarouselCardsRef.current = activeSelectionPlayerCards
  const activeSelectionPlayerRef = useRef(activeSelectionPlayer)
  activeSelectionPlayerRef.current = activeSelectionPlayer
  const previewIllustrativeCardRef = useRef(previewIllustrativeCard)
  previewIllustrativeCardRef.current = previewIllustrativeCard
  const activeIllustrativeCardIdRef = useRef(activeIllustrativeCardId)
  activeIllustrativeCardIdRef.current = activeIllustrativeCardId

  const illustrativeCarouselCardIdsKey = activeSelectionPlayerCards.map((c) => c.id).join(',')

  const syncIllustrativeCarouselSelectionFromScroll = useCallback(() => {
    const viewport = illustrativeCarouselViewportRef.current
    const player = activeSelectionPlayerRef.current
    const cards = illustrativeCarouselCardsRef.current
    if (!viewport || !player || cards.length === 0) {
      return
    }
    const index = getCarouselCenteredCardIndex(viewport)
    const card = cards[index]
    if (!card || card.id === activeIllustrativeCardIdRef.current) {
      return
    }
    previewIllustrativeCardRef.current(player.id, card.id)
  }, [])

  useLayoutEffect(() => {
    if (!isIllustrativeSequentialSelection || !activeSelectionPlayer || activeSelectionPlayerCards.length === 0) {
      return
    }
    if (!activeIllustrativeCardId) {
      return
    }
    const slide = illustrativeCarouselSlideRefs.current[activeIllustrativeCardId]
    if (!slide || !illustrativeCarouselViewportRef.current) {
      return
    }
    slide.scrollIntoView({ behavior: 'auto', inline: 'center', block: 'nearest' })
    // activeIllustrativeCardId is read from the render that produced these deps only — do not add it here or swipe scroll fights this snap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isIllustrativeSequentialSelection,
    activeSelectionPlayer?.id,
    currentHole.holeNumber,
    illustrativeCarouselCardIdsKey,
  ])

  useEffect(() => {
    const viewport = illustrativeCarouselViewportRef.current
    if (!viewport || !isIllustrativeSequentialSelection) {
      return
    }

    let debounceId: number | undefined
    const onScroll = () => {
      window.clearTimeout(debounceId)
      debounceId = window.setTimeout(() => {
        syncIllustrativeCarouselSelectionFromScroll()
      }, 80)
    }

    const onScrollEnd = () => {
      window.clearTimeout(debounceId)
      syncIllustrativeCarouselSelectionFromScroll()
    }

    viewport.addEventListener('scroll', onScroll, { passive: true })
    viewport.addEventListener('scrollend', onScrollEnd)

    return () => {
      window.clearTimeout(debounceId)
      viewport.removeEventListener('scroll', onScroll)
      viewport.removeEventListener('scrollend', onScrollEnd)
    }
  }, [isIllustrativeSequentialSelection, activeSelectionPlayer?.id, syncIllustrativeCarouselSelectionFromScroll])

  const focusIllustrativeCarouselCard = (cardId: string) => {
    if (!activeSelectionPlayer) {
      return
    }
    hapticSelection()
    previewIllustrativeCard(activeSelectionPlayer.id, cardId)
    window.requestAnimationFrame(() => {
      illustrativeCarouselSlideRefs.current[cardId]?.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      })
    })
  }

  const nudgeIllustrativeCarousel = (direction: 'previous' | 'next') => {
    if (!activeSelectionPlayer || activeSelectionPlayerCards.length < 2) {
      return
    }
    const currentIndex = activeSelectionPlayerCards.findIndex((c) => c.id === activeIllustrativeCardId)
    const fromIndex = currentIndex >= 0 ? currentIndex : 0
    const delta = direction === 'next' ? 1 : -1
    const nextIndex = Math.min(
      activeSelectionPlayerCards.length - 1,
      Math.max(0, fromIndex + delta),
    )
    const nextCard = activeSelectionPlayerCards[nextIndex]
    if (nextCard) {
      focusIllustrativeCarouselCard(nextCard.id)
    }
  }

  const goToHoleResults = useCallback(
    (withHaptic: boolean) => {
      if (withHaptic) {
        hapticLightImpact()
      }

      onUpdateRoundState((currentState) => ({
        ...currentState,
        holeUxMetrics: incrementHoleTapCount(currentState.holeUxMetrics, currentState.currentHoleIndex),
      }))
      onNavigate('holeResults')
    },
    [onNavigate, onUpdateRoundState],
  )

  const continueFromHoleSetup = () => {
    goToHoleResults(true)
  }

  const touchStart = useRef<{ x: number; y: number; startedAtMs: number } | null>(null)
  const touchLast = useRef<{ x: number; y: number } | null>(null)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.targetTouches[0]
    if (!t) return
    if (!shouldCaptureEdgeSwipeBackStart(t.clientX, e.target, DEFAULT_EDGE_SWIPE_BACK_THRESHOLDS)) {
      touchStart.current = null
      touchLast.current = null
      return
    }
    touchStart.current = { x: t.clientX, y: t.clientY, startedAtMs: performance.now() }
    touchLast.current = { x: t.clientX, y: t.clientY }
  }, [])
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const t = e.targetTouches[0]
    if (!t || !touchStart.current || !touchLast.current) return
    touchLast.current = { x: t.clientX, y: t.clientY }
  }, [])
  const handleTouchEnd = useCallback(() => {
    const start = touchStart.current
    const last = touchLast.current
    touchStart.current = null
    touchLast.current = null
    if (!start || !last) return
    const durationMs = Math.max(0, performance.now() - start.startedAtMs)
    if (
      isEdgeSwipeBackGesture(
        {
          startX: start.x,
          startY: start.y,
          endX: last.x,
          endY: last.y,
          durationMs,
        },
        DEFAULT_EDGE_SWIPE_BACK_THRESHOLDS,
      )
    ) {
      hapticLightImpact()
      onNavigate(currentHoleIndex > 0 ? 'leaderboard' : 'roundSetup')
    }
  }, [onNavigate, currentHoleIndex])

  const illustrativeMissionHeroActive =
    isIllustrativeChallengeLayout &&
    !isPowerUpsMode &&
    isHolePrepared &&
    isIllustrativeSequentialSelection &&
    activeSelectionPlayer !== null
  const shouldShowMissionActionPanel = !isIllustrativeSequentialSelection || allPlayersHaveSelection

  const illustrativeMissionCardMinimal = isIllustrativeChallengeLayout && !isPowerUpsMode
  const illustrativeAutoContinueHoleIndexRef = useRef<number | null>(null)
  useEffect(() => {
    if (!isIllustrativeSequentialSelection || !allPlayersHaveSelection) {
      return
    }

    if (illustrativeAutoContinueHoleIndexRef.current === currentHoleIndex) {
      return
    }

    illustrativeAutoContinueHoleIndexRef.current = currentHoleIndex
    goToHoleResults(false)
  }, [
    allPlayersHaveSelection,
    currentHoleIndex,
    goToHoleResults,
    isIllustrativeSequentialSelection,
  ])

  return (
    <section
      className={`screen stack-sm hole-play-screen ${isPowerUpsMode ? 'hole-play-screen--power-ups' : 'hole-play-screen--missions'} ${
        isIllustrativeChallengeLayout ? 'hole-play-screen--challenge-layout-illustrative' : ''
      }`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {illustrativeMissionHeroActive && activeSelectionPlayer ? (
        <HolePlayIllustrativeMissionHeroHeader
          playerName={playerNameById[activeSelectionPlayer.id]}
          holeNumber={currentHole.holeNumber}
          par={currentHole.par}
          activePlayerOrdinal={activeSelectionPlayerIndex + 1}
          playersRequiringCount={playersRequiringSelection.length}
        />
      ) : (
        <HolePlayDefaultTopSection
          isPowerUpsMode={isPowerUpsMode}
          holeNumber={currentHole.holeNumber}
          par={currentHole.par}
          isHolePrepared={isHolePrepared}
          featuredHoleType={currentHole.featuredHoleType}
        />
      )}

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
              const powerUpArtwork =
                isIllustrativeChallengeLayout && powerUp ? getPowerUpCardArtwork(powerUp) : null
              const curseArtwork =
                isIllustrativeChallengeLayout && curse ? getPowerUpCardArtwork(curse) : null

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
                      layout={isIllustrativeChallengeLayout ? 'illustrative' : 'compact'}
                      illustrativeImageSrc={powerUpArtwork?.src}
                      illustrativeImageAlt={powerUpArtwork?.alt}
                      used={used}
                      showUseButton={false}
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
                    <div className="stack-xs">
                      <PowerUpCard
                        powerUp={curse}
                        layout={isIllustrativeChallengeLayout ? 'illustrative' : 'compact'}
                        illustrativeImageSrc={curseArtwork?.src}
                        illustrativeImageAlt={curseArtwork?.alt}
                        showPlayerName={false}
                        showUseButton={false}
                      />
                      <p className="muted">Restriction applies for this hole only.</p>
                    </div>
                  )}
                </section>
              )
            })}
          </section>

          <section className="panel stack-xs">
            <p className="muted">
              Assigned power-ups are applied automatically for this hole. Curses apply only when
              current round leaders are a minority (or exactly half in even groups), and replace
              those leaders&apos; positive power-ups for this hole.
            </p>
            <button type="button" className="button-primary" onClick={continueFromHoleSetup}>
              <AppIcon className="button-icon" icon={ICONS.holeResults} />
              Enter Hole Results
            </button>
          </section>
        </>
      )}

      {!isPowerUpsMode && isHolePrepared && (
        <>
          {!allPlayersHaveSelection ? (
            <>
              {!illustrativeMissionHeroActive && (
                <p className="muted hole-cards-helper">{missionHelperCopy}</p>
              )}

              {isIllustrativeSequentialSelection ? (
                <section className="panel stack-sm hole-illustrative-selection">
                  {activeSelectionPlayer ? (
                    <>
                      {activeSelectionPlayerCards.length > 0 && (
                        <div className="hole-illustrative-selection__carousel-wrap">
                          <p className="muted hole-illustrative-selection__carousel-hint">
                            Swipe to compare missions
                          </p>
                          <div
                            ref={illustrativeCarouselViewportRef}
                            className="hole-illustrative-selection__carousel-viewport"
                            tabIndex={0}
                            role="region"
                            aria-label="Mission cards, swipe horizontally"
                            onKeyDown={(event) => {
                              if (event.key === 'ArrowLeft') {
                                event.preventDefault()
                                nudgeIllustrativeCarousel('previous')
                              } else if (event.key === 'ArrowRight') {
                                event.preventDefault()
                                nudgeIllustrativeCarousel('next')
                              }
                            }}
                          >
                            {activeSelectionPlayerCards.map((card, cardIndex) => {
                              const offerKind =
                                activeSelectionPlayerCards[0]?.id === card.id ? 'safe' : 'hard'
                              const cardArtwork = getPersonalCardArtwork(card)
                              const isFocused = card.id === activeIllustrativeCardId

                              return (
                                <div
                                  key={`${currentHole.holeNumber}-${activeSelectionPlayer.id}-${card.id}-carousel`}
                                  ref={(element) => {
                                    illustrativeCarouselSlideRefs.current[card.id] = element
                                  }}
                                  className={`hole-illustrative-selection__carousel-slide ${
                                    isFocused ? 'hole-illustrative-selection__carousel-slide--focused' : ''
                                  }`}
                                  data-illustrative-carousel-slide
                                >
                                  <ChallengeCardView
                                    card={card}
                                    selected={false}
                                    offerKind={offerKind}
                                    expectedScore18={activeSelectionPlayer.expectedScore18}
                                    showSupplementaryBadges={false}
                                    showMetadataLine={true}
                                    illustrativeHoleSetupMinimal={illustrativeMissionCardMinimal}
                                    layout="illustrative"
                                    illustrativeImageSrc={cardArtwork?.src}
                                    illustrativeImageAlt={cardArtwork?.alt}
                                    onSelect={() => focusIllustrativeCarouselCard(card.id)}
                                    entryOrder={cardIndex}
                                  />
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      <button
                        type="button"
                        className="button-primary hole-illustrative-selection__confirm"
                        onClick={confirmIllustrativeCardSelection}
                        disabled={!activeIllustrativeCardId}
                      >
                        Select Mission
                      </button>
                    </>
                  ) : null}
                </section>
              ) : (
                <section className="stack-sm hole-draft-list">
                  {roundState.players.map((player, playerIndex) => {
                    const dealtCards = currentHoleCards.dealtPersonalCardsByPlayerId[player.id] ?? []
                    const selectedCardId = currentHoleCards.selectedCardIdByPlayerId[player.id]
                    const isPlayerReady =
                      typeof selectedCardId === 'string' && selectedCardId.length > 0

                    return (
                      <div
                        key={player.id}
                        ref={(element) => {
                          playerModuleRefById.current[player.id] = element
                        }}
                      >
                        <GolferMissionModule
                          golferName={playerNameById[player.id]}
                          statusTone={canSelectCards ? (isPlayerReady ? 'ready' : 'pending') : undefined}
                          statusLabel={canSelectCards ? (isPlayerReady ? 'Ready' : 'Pending') : undefined}
                        >
                          <div className="stack-xs hole-draft-options">
                            {dealtCards.map((card, cardIndex) => {
                              const offerKind = canSelectCards
                                ? cardIndex === 0
                                  ? 'safe'
                                  : 'hard'
                                : dealtCards.length === 1
                                  ? 'single'
                                  : undefined
                              const cardArtwork = isIllustrativeChallengeLayout
                                ? getPersonalCardArtwork(card)
                                : null

                              return (
                                <ChallengeCardView
                                  key={`${currentHole.holeNumber}-${player.id}-${card.id}-${cardIndex}`}
                                  card={card}
                                  selected={selectedCardId === card.id}
                                  offerKind={offerKind}
                                  expectedScore18={player.expectedScore18}
                                  showSupplementaryBadges={false}
                                  showMetadataLine={true}
                                  illustrativeHoleSetupMinimal={illustrativeMissionCardMinimal}
                                  layout={isIllustrativeChallengeLayout ? 'illustrative' : 'compact'}
                                  illustrativeImageSrc={cardArtwork?.src}
                                  illustrativeImageAlt={cardArtwork?.alt}
                                  onSelect={
                                    canSelectCards ? () => selectCard(player.id, card.id) : undefined
                                  }
                                  entryOrder={playerIndex * 2 + cardIndex}
                                />
                              )
                            })}

                            {dealtCards.length === 0 && (
                              <p className="muted">
                                No missions available from enabled packs for this golfer.
                              </p>
                            )}
                          </div>
                        </GolferMissionModule>
                      </div>
                    )
                  })}
                </section>
              )}
            </>
          ) : (
            <HoleMissionsAssignedSummary
              players={roundState.players}
              holeCards={currentHoleCards}
              playerNameById={playerNameById}
              holes={roundState.holes}
              holeCount={roundState.config.holeCount}
              currentHoleIndex={currentHoleIndex}
              onOpenIllustrativePreview={setIllustrativeMissionPreview}
            />
          )}

          {allPlayersHaveSelection && currentHoleCards.publicCards.length > 0 && (
            <HolePublicCardSection
              title="Public Cards"
              count={currentHoleCards.publicCards.length}
              emptyMessage="No public cards for this hole."
              helperText="Preview only. Public cards are resolved on Hole Results."
            >
              {currentHoleCards.publicCards.map((card, cardIndex) => {
                const cardArtwork = isIllustrativeChallengeLayout ? getPublicCardArtwork(card) : null

                return (
                  <PublicCardView
                    key={`${currentHole.holeNumber}-${card.id}-${cardIndex}`}
                    card={card}
                    showTypeChip={false}
                    showMetadataLine={true}
                    layout={isIllustrativeChallengeLayout ? 'illustrative' : 'compact'}
                    illustrativeImageSrc={cardArtwork?.src}
                    illustrativeImageAlt={cardArtwork?.alt}
                    entryOrder={roundState.players.length * 2 + cardIndex}
                  />
                )
              })}
            </HolePublicCardSection>
          )}

          {shouldShowMissionActionPanel && (
            <div ref={actionPanelRef}>
              <HoleActionPanel
                summary={readinessSummary}
                buttonLabel="Enter Hole Results"
                buttonIcon={<AppIcon className="button-icon" icon={ICONS.holeResults} />}
                disabled={!allPlayersHaveSelection}
                helperText={
                  illustrativeMissionHeroActive || allPlayersHaveSelection
                    ? undefined
                    : 'Pick one mission for each golfer before continuing.'
                }
                onContinue={continueFromHoleSetup}
              />
            </div>
          )}

          {illustrativeMissionPreview ? (
            <Modal
              onClose={() => setIllustrativeMissionPreview(null)}
              className={`hole-mission-preview-modal hole-mission-preview-modal--difficulty-${illustrativeMissionPreview.card.difficulty}`}
            >
              <button
                type="button"
                className="hole-mission-preview-modal__floating-close"
                aria-label="Close mission preview"
                onClick={() => {
                  hapticSelection()
                  setIllustrativeMissionPreview(null)
                }}
              >
                ×
              </button>

              {illustrativeMissionPreviewArtwork?.src ? (
                <figure className="hole-mission-preview-modal__image-only-frame">
                  <img
                    className="hole-mission-preview-modal__image-only"
                    src={illustrativeMissionPreviewArtwork.src}
                    alt={`${illustrativeMissionPreview.card.name} illustrative card`}
                  />
                </figure>
              ) : (
                <p className="muted">No illustrative card image available.</p>
              )}
            </Modal>
          ) : null}
        </>
      )}
    </section>
  )
}

export default HolePlayScreen
