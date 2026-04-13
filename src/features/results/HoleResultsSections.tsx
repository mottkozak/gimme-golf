import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MutableRefObject } from 'react'
import AppIcon from '../../components/AppIcon.tsx'
import BadgeChip from '../../components/BadgeChip.tsx'
import GolferScoreModule from '../../components/GolferScoreModule.tsx'
import HoleInfoCard from '../../components/HoleInfoCard.tsx'
import MissionStatusPill from '../../components/MissionStatusPill.tsx'
import PublicCardResolutionPanel from '../../components/PublicCardResolutionPanel.tsx'
import { getEffectOptions, parseStrokeInput } from '../../logic/holeResults/utils.ts'
import { getPersonalParByHoleByPlayerId, getScoreTargetStrokes } from '../../logic/personalPar.ts'
import { getAssignedCurse, getAssignedPowerUp } from '../../logic/powerUps.ts'
import {
  getPublicCardResolutionMode,
  getPublicResolutionGuidance,
  getPublicResolutionInputRequirements,
  isPublicCardResolutionComplete,
} from '../../logic/publicCardResolution.ts'
import { buildHolePointBreakdownsByPlayerId } from '../../logic/streaks.ts'
import type { PowerUp } from '../../data/powerUps.ts'
import type { PersonalCard, PublicCard } from '../../types/cards.ts'
import type {
  MissionStatus,
  PublicCardResolutionState,
  HoleCardsState,
  HoleResultState,
  RoundState,
} from '../../types/game.ts'

const QUICK_STROKE_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const
const MANUAL_STROKE_MIN = 13

type StrokeInputMethod = 'quick_button' | 'quick_9_plus' | 'manual_input'

interface HoleResultsStrokeWheelProps {
  playerId: string
  currentHoleIndex: number
  currentHolePar: number
  strokes: number | null
  showManualInput: boolean
  onSetStrokes: (
    playerId: string,
    nextStrokes: number | null,
    inputMethod: StrokeInputMethod,
    options?: { autoAdvance?: boolean },
  ) => void
  onHideManualInput: (playerId: string) => void
  onShowManualInput: (playerId: string) => void
}

function HoleResultsStrokeWheel({
  playerId,
  currentHoleIndex,
  currentHolePar,
  strokes,
  showManualInput,
  onSetStrokes,
  onHideManualInput,
  onShowManualInput,
}: HoleResultsStrokeWheelProps) {
  const wheelRef = useRef<HTMLDivElement>(null)
  const buttonRefs = useRef<Partial<Record<number, HTMLButtonElement | null>>>({})
  const hasCenteredParForKeyRef = useRef<Record<string, boolean>>({})
  const scrollRafRef = useRef<number | null>(null)
  const [scrollThumb, setScrollThumb] = useState({ thumbWidthPct: 100, thumbLeftPct: 0 })

  const playerHoleKey = `${currentHoleIndex}:${playerId}`

  const updateScrollThumb = useCallback(() => {
    const el = wheelRef.current
    if (!el) {
      return
    }
    const { scrollLeft, clientWidth, scrollWidth } = el
    const maxScroll = scrollWidth - clientWidth
    if (maxScroll <= 0) {
      setScrollThumb({ thumbWidthPct: 100, thumbLeftPct: 0 })
      return
    }
    const thumbWidthPct = (clientWidth / scrollWidth) * 100
    const thumbLeftPct = (scrollLeft / maxScroll) * (100 - thumbWidthPct)
    setScrollThumb({ thumbWidthPct, thumbLeftPct })
  }, [])

  const scheduleScrollThumbUpdate = useCallback(() => {
    if (scrollRafRef.current !== null) {
      return
    }
    scrollRafRef.current = window.requestAnimationFrame(() => {
      scrollRafRef.current = null
      updateScrollThumb()
    })
  }, [updateScrollThumb])

  useEffect(() => {
    hasCenteredParForKeyRef.current = {}
  }, [currentHoleIndex])

  useLayoutEffect(() => {
    if (typeof strokes === 'number') {
      return
    }
    if (hasCenteredParForKeyRef.current[playerHoleKey]) {
      return
    }
    const parButton = buttonRefs.current[currentHolePar]
    const wheel = wheelRef.current
    if (!parButton || !wheel) {
      return
    }
    const run = () => {
      parButton.scrollIntoView({ behavior: 'instant', inline: 'center', block: 'nearest' })
      updateScrollThumb()
    }
    run()
    window.requestAnimationFrame(run)
    hasCenteredParForKeyRef.current[playerHoleKey] = true
  }, [currentHolePar, currentHoleIndex, playerHoleKey, strokes, updateScrollThumb])

  return (
    <div className="hole-score-strokes-picker" data-swipe-back-exempt="true">
      <p className="hole-score-strokes-picker__label">Strokes</p>
      <div className="hole-score-strokes-picker__viewport">
        <div
          ref={wheelRef}
          className="hole-score-button-group hole-score-button-group--wheel"
          onScroll={scheduleScrollThumbUpdate}
          role="group"
          aria-label="Stroke count"
        >
          {QUICK_STROKE_OPTIONS.map((strokeOption) => {
            const isSelected = strokes === strokeOption
            return (
              <button
                key={strokeOption}
                ref={(element) => {
                  buttonRefs.current[strokeOption] = element
                }}
                type="button"
                className={`hole-score-button ${isSelected ? 'hole-score-button--selected' : ''}`}
                onClick={() => {
                  const nextStrokeValue = isSelected ? null : strokeOption
                  onSetStrokes(playerId, nextStrokeValue, 'quick_button')
                  if (!isSelected) {
                    onHideManualInput(playerId)
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
                typeof strokes === 'number' && strokes >= MANUAL_STROKE_MIN ? strokes : MANUAL_STROKE_MIN
              onSetStrokes(playerId, nextStrokeValue, 'quick_9_plus')
              onShowManualInput(playerId)
            }}
          >
            {MANUAL_STROKE_MIN}+
          </button>
        </div>
      </div>
      <div className="hole-score-strokes-picker__track" aria-hidden="true">
        <div
          className="hole-score-strokes-picker__thumb"
          style={{
            width: `${scrollThumb.thumbWidthPct}%`,
            left: `${scrollThumb.thumbLeftPct}%`,
          }}
        />
      </div>
    </div>
  )
}

interface HoleResultsPlayerEntriesProps {
  roundState: RoundState
  currentHoleCards: HoleCardsState
  currentResult: HoleResultState
  isPowerUpsMode: boolean
  playerNameById: Record<string, string>
  effectiveMissionStatusByPlayerId: Record<string, Extract<MissionStatus, 'success' | 'failed'>>
  manualStrokeInputByPlayerId: Record<string, boolean>
  playerSectionRefs: MutableRefObject<Record<string, HTMLDivElement | null>>
  onOpenCardPreview: (preview: {
    playerName: string
    expectedScore18: number
    personalPar: number
    targetStrokes: number | null
    card: PersonalCard
  }) => void
  onOpenPowerUpPreview: (preview: {
    playerName: string
    card: PowerUp
  }) => void
  onSetMissionStatus: (playerId: string, status: Extract<MissionStatus, 'success' | 'failed'>) => void
  onSetStrokes: (
    playerId: string,
    nextStrokes: number | null,
    inputMethod: StrokeInputMethod,
    options?: { autoAdvance?: boolean },
  ) => void
  onHideManualInput: (playerId: string) => void
  onShowManualInput: (playerId: string) => void
  keepFieldVisible: (element: HTMLElement) => void
}

export function HoleResultsPlayerEntries({
  roundState,
  currentHoleCards,
  currentResult,
  isPowerUpsMode,
  playerNameById,
  effectiveMissionStatusByPlayerId,
  manualStrokeInputByPlayerId,
  playerSectionRefs,
  onOpenCardPreview,
  onOpenPowerUpPreview,
  onSetMissionStatus,
  onSetStrokes,
  onHideManualInput,
  onShowManualInput,
  keepFieldVisible,
}: HoleResultsPlayerEntriesProps) {
  const currentHolePar = roundState.holes[roundState.currentHoleIndex]?.par ?? 4
  const currentHoleIndex = roundState.currentHoleIndex
  const personalParByHoleByPlayerId = getPersonalParByHoleByPlayerId(
    roundState.players,
    roundState.holes,
    roundState.config.holeCount,
  )
  const holePointBreakdownsByPlayerId = buildHolePointBreakdownsByPlayerId(
    roundState.players,
    roundState.holes,
    roundState.holeCards,
    roundState.holeResults,
    roundState.config.toggles.momentumBonuses,
  )

  return (
    <section className="stack-sm hole-results-player-list">
      {roundState.players.map((player) => {
        const selectedCardId = currentHoleCards.selectedCardIdByPlayerId[player.id]
        const selectedCard = (currentHoleCards.dealtPersonalCardsByPlayerId[player.id] ?? []).find(
          (card) => card.id === selectedCardId,
        )
        const assignedPowerUp = getAssignedPowerUp(
          roundState.holePowerUps[currentHoleIndex],
          player.id,
        )
        const assignedCurse = getAssignedCurse(
          roundState.holePowerUps[currentHoleIndex],
          player.id,
        )
        const strokes = currentResult.strokesByPlayerId[player.id]
        const personalParForCurrentHole =
          personalParByHoleByPlayerId[player.id]?.[currentHoleIndex] ?? currentHolePar
        const scoreTargetStrokes =
          selectedCard === undefined
            ? null
            : getScoreTargetStrokes(
                `${selectedCard.description}\n${selectedCard.rulesText}`,
                personalParForCurrentHole,
              )
        const requiresMissionResolution = !isPowerUpsMode && Boolean(selectedCard)
        const effectiveMissionStatus = requiresMissionResolution
          ? effectiveMissionStatusByPlayerId[player.id]
          : null

        const hasManualValue = typeof strokes === 'number' && strokes >= MANUAL_STROKE_MIN
        const showManualInput = manualStrokeInputByPlayerId[player.id] || hasManualValue
        const holePointsForCurrentHole =
          holePointBreakdownsByPlayerId[player.id]?.[currentHoleIndex]?.total ?? 0
        const adjustedHoleScore =
          typeof strokes === 'number' ? strokes - holePointsForCurrentHole : null

        return (
          <div
            key={player.id}
            ref={(element) => {
              playerSectionRefs.current[player.id] = element
            }}
          >
            <GolferScoreModule
              playerName={playerNameById[player.id]}
              missionLabel={isPowerUpsMode ? 'Power Up' : 'Challenge'}
              missionSlot={
                isPowerUpsMode ? (
                  <div className="stack-xs hole-score-module__mission-inline">
                    {assignedPowerUp ? (
                      <button
                        type="button"
                        className="chip chip-button badge-chip badge-chip--subtle hole-score-module__mission-chip"
                        onClick={() =>
                          onOpenPowerUpPreview({
                            playerName: playerNameById[player.id],
                            card: assignedPowerUp,
                          })
                        }
                      >
                        Power Up: {assignedPowerUp.code} - {assignedPowerUp.title}
                        <AppIcon className="hole-score-module__mission-chip-icon" icon="info" />
                      </button>
                    ) : (
                      <BadgeChip tone="subtle">No Power Up assigned</BadgeChip>
                    )}
                    {assignedCurse ? (
                      <button
                        type="button"
                        className="chip chip-button badge-chip badge-chip--subtle hole-score-module__mission-chip"
                        onClick={() =>
                          onOpenPowerUpPreview({
                            playerName: playerNameById[player.id],
                            card: assignedCurse,
                          })
                        }
                      >
                        Curse: {assignedCurse.code} - {assignedCurse.title}
                        <AppIcon className="hole-score-module__mission-chip-icon" icon="info" />
                      </button>
                    ) : (
                      <BadgeChip tone="subtle">No Curse assigned</BadgeChip>
                    )}
                  </div>
                ) : selectedCard ? (
                  <div className="stack-xs hole-score-module__mission-inline">
                    <button
                      type="button"
                      className="chip chip-button badge-chip badge-chip--subtle hole-score-module__mission-chip"
                      onClick={() =>
                        onOpenCardPreview({
                          playerName: playerNameById[player.id],
                          expectedScore18: player.expectedScore18,
                          personalPar: personalParForCurrentHole,
                          targetStrokes: scoreTargetStrokes,
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
                          onClick={() => onSetMissionStatus(player.id, 'failed')}
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
                          onClick={() => onSetMissionStatus(player.id, 'success')}
                        >
                          Completed
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <BadgeChip tone="subtle">No card</BadgeChip>
                )
              }
              footerSlot={
                <div className="row-between hole-score-module__summary-row">
                  <p className="hole-score-module__personal-par">
                    Personal Par: {personalParForCurrentHole} strokes
                  </p>
                  <p className="hole-score-module__hole-score">
                    <span className="hole-score-module__hole-score-label">Hole Score:</span>{' '}
                    {adjustedHoleScore ?? '--'}
                  </p>
                </div>
              }
            >
              <HoleResultsStrokeWheel
                playerId={player.id}
                currentHoleIndex={currentHoleIndex}
                currentHolePar={currentHolePar}
                strokes={strokes ?? null}
                showManualInput={showManualInput}
                onSetStrokes={onSetStrokes}
                onHideManualInput={onHideManualInput}
                onShowManualInput={onShowManualInput}
              />

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
                        onSetStrokes(player.id, parsedStrokes, 'manual_input', { autoAdvance: false })
                      }}
                      onFocus={(event) => keepFieldVisible(event.currentTarget)}
                      onBlur={(event) => {
                        const parsedStrokes = parseStrokeInput(event.target.value)
                        if (typeof parsedStrokes === 'number') {
                          onSetStrokes(player.id, parsedStrokes, 'manual_input', { autoAdvance: true })
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
  )
}

interface HoleResultsPublicResolutionSectionProps {
  hasPublicStep: boolean
  publicSectionExpanded: boolean
  publicCanExpand: boolean
  publicStepComplete: boolean
  resolvedPublicCardsCount: number
  currentHoleCards: HoleCardsState
  currentResolutions: Record<string, PublicCardResolutionState>
  playerIds: string[]
  roundState: RoundState
  playerNameById: Record<string, string>
  currentResult: HoleResultState
  publicCardSectionRefs: MutableRefObject<Record<string, HTMLDivElement | null>>
  publicResolutionSectionRef: MutableRefObject<HTMLElement | null>
  onTogglePublicSection: () => void
  onSetCardTriggered: (card: PublicCard, triggered: boolean) => void
  onSetCardWinner: (cardId: string, winningPlayerId: string) => void
  onSetUnifiedVoteTarget: (cardId: string, targetPlayerId: string) => void
  onToggleAffectedPlayer: (cardId: string, playerId: string) => void
  onSetSelectedEffectOption: (card: PublicCard, effectOptionId: string) => void
}

export function HoleResultsPublicResolutionSection({
  hasPublicStep,
  publicSectionExpanded,
  publicCanExpand,
  publicStepComplete,
  resolvedPublicCardsCount,
  currentHoleCards,
  currentResolutions,
  playerIds,
  roundState,
  playerNameById,
  currentResult,
  publicCardSectionRefs,
  publicResolutionSectionRef,
  onTogglePublicSection,
  onSetCardTriggered,
  onSetCardWinner,
  onSetUnifiedVoteTarget,
  onToggleAffectedPlayer,
  onSetSelectedEffectOption,
}: HoleResultsPublicResolutionSectionProps) {
  if (!hasPublicStep) {
    return null
  }

  return (
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
                        onClick={() => onSetCardTriggered(card, true)}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        className={`segmented-control__button ${
                          !guidedResolution.triggered ? 'segmented-control__button--active' : ''
                        }`}
                        onClick={() => onSetCardTriggered(card, false)}
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
                            onClick={() => onSetUnifiedVoteTarget(card.id, player.id)}
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
                              onClick={() => onSetSelectedEffectOption(card, effectOption.id)}
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
                            onClick={() => onSetCardWinner(card.id, player.id)}
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
                              onClick={() => onToggleAffectedPlayer(card.id, player.id)}
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
  )
}
