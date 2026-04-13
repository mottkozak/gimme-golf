import { useCallback, useEffect, useRef, useState } from 'react'
import { ICONS } from '../../app/icons.ts'
import AppIcon from '../../components/AppIcon.tsx'
import PlayerSetupRow from '../../components/PlayerSetupRow.tsx'
import {
  hapticError,
  hapticLightImpact,
  hapticSelection,
  hapticSuccess,
  hapticWarning,
} from '../../capacitor/haptics.ts'
import { loadLocalIdentityState } from '../../logic/localIdentity.ts'
import { resolveLandingModeFromConfig } from '../../logic/landingModes.ts'
import {
  DEFAULT_EDGE_SWIPE_BACK_THRESHOLDS,
  isEdgeSwipeBackGesture,
  shouldCaptureEdgeSwipeBackStart,
} from '../../logic/edgeSwipeBack.ts'
import { loadAccountProfile } from '../../logic/account.ts'
import {
  clearActiveMultiplayerSession,
  createMultiplayerRound,
  isMultiplayerConfigured,
  isMultiplayerEnabled,
  joinMultiplayerRound,
  leaveMultiplayerRound,
  loadActiveMultiplayerSession,
  saveActiveMultiplayerSession,
  type MultiplayerRoundSession,
} from '../../logic/multiplayer.ts'
import {
  createDraftId,
  dedupeNames,
  isDefaultSetupPlayerName,
  normalizeSetupPlayerName,
} from '../../logic/roundSetupScreen.ts'
import {
  applyCourseStyle,
  applyRoundSetupDraft,
  DEFAULT_EXPECTED_SCORE,
  MAX_EXPECTED_SCORE,
  MAX_GOLFERS,
  MIN_EXPECTED_SCORE,
  MIN_GOLFERS,
  normalizeExpectedScore,
  resizeHoles,
  type RoundSetupDraft,
} from '../../logic/roundSetup.ts'
import type { CourseStyle, HoleCount, Player, RoundState } from '../../types/game.ts'
import type { ScreenProps } from '../../app/screenContracts.ts'

type SetupPlayMode = 'local' | 'multiplayer'

function normalizeRoomCodeInput(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
}

function trackSetupStartedDeferred(roundState: RoundState): void {
  void import('../../logic/analytics.ts')
    .then(({ trackRoundSetupCompleted, trackRoundStarted }) => {
      trackRoundSetupCompleted(roundState, 'start_round')
      trackRoundStarted(roundState, 'setup_start_round')
    })
    .catch(() => {
      // Analytics should stay best-effort and never block primary setup flow.
    })
}

function RoundSetupScreen({ roundState, onNavigate, onUpdateRoundState }: ScreenProps) {
  const [localIdentityState] = useState(() => loadLocalIdentityState())
  const [setupPlayMode, setSetupPlayMode] = useState<SetupPlayMode>(() =>
    loadActiveMultiplayerSession() ? 'multiplayer' : 'local',
  )
  const [activeMultiplayerSession, setActiveMultiplayerSession] = useState<MultiplayerRoundSession | null>(
    () => loadActiveMultiplayerSession(),
  )
  const [multiplayerDisplayName, setMultiplayerDisplayName] = useState(() => {
    const profileDisplayName = loadAccountProfile()?.displayName?.trim()
    if (profileDisplayName) {
      return profileDisplayName
    }

    return roundState.players[0]?.name ?? ''
  })
  const [multiplayerExpectedScore, setMultiplayerExpectedScore] = useState(() => {
    const profileExpectedScore = loadAccountProfile()?.expectedScore18
    if (typeof profileExpectedScore === 'number') {
      return normalizeExpectedScore(profileExpectedScore)
    }

    return normalizeExpectedScore(roundState.players[0]?.expectedScore18 ?? DEFAULT_EXPECTED_SCORE)
  })
  const [multiplayerRoomCode, setMultiplayerRoomCode] = useState('')
  const [multiplayerStatusMessage, setMultiplayerStatusMessage] = useState<string | null>(null)
  const [isMultiplayerSubmitting, setIsMultiplayerSubmitting] = useState(false)
  const profileDefaultsAppliedRef = useRef(false)
  const playerListRef = useRef<HTMLDivElement | null>(null)
  const previousPlayerCountRef = useRef(roundState.players.length)
  const { config, players } = roundState
  const activeMode = resolveLandingModeFromConfig(config)
  const multiplayerEnabled = isMultiplayerEnabled()
  const multiplayerConfigured = isMultiplayerConfigured()
  const canJoinMultiplayerRound =
    multiplayerRoomCode.trim().length === 8 &&
    multiplayerDisplayName.trim().length > 0 &&
    !isMultiplayerSubmitting

  useEffect(() => {
    if (profileDefaultsAppliedRef.current) {
      return
    }

    profileDefaultsAppliedRef.current = true
    const profile = loadAccountProfile()
    const profileDisplayName = profile?.displayName?.trim() ?? ''
    if (!profile || roundState.players.length === 0) {
      return
    }

    const normalizedExpectedScore = normalizeExpectedScore(profile.expectedScore18)

    onUpdateRoundState((currentState) => {
      const firstPlayer = currentState.players[0]
      if (!firstPlayer) {
        return currentState
      }

      const shouldApplyName =
        profileDisplayName.length > 0 &&
        (isDefaultSetupPlayerName(firstPlayer.name, 1) || firstPlayer.name.trim().length === 0)
      const firstPlayerLooksUntouched =
        isDefaultSetupPlayerName(firstPlayer.name, 1) || firstPlayer.name.trim().length === 0
      const shouldApplyExpectedScore =
        firstPlayer.expectedScore18 === DEFAULT_EXPECTED_SCORE || firstPlayerLooksUntouched

      if (!shouldApplyName && !shouldApplyExpectedScore) {
        return currentState
      }

      const nextFirstPlayer = {
        ...firstPlayer,
        name: shouldApplyName ? profileDisplayName : firstPlayer.name,
        expectedScore18: shouldApplyExpectedScore
          ? normalizedExpectedScore
          : firstPlayer.expectedScore18,
      }

      if (
        nextFirstPlayer.name === firstPlayer.name &&
        nextFirstPlayer.expectedScore18 === firstPlayer.expectedScore18
      ) {
        return currentState
      }

      return {
        ...currentState,
        players: [nextFirstPlayer, ...currentState.players.slice(1)],
      }
    })
  }, [onUpdateRoundState, roundState.players.length])

  useEffect(() => {
    if (players.length <= previousPlayerCountRef.current) {
      previousPlayerCountRef.current = players.length
      return
    }

    const listElement = playerListRef.current
    if (listElement) {
      listElement.scrollTo({
        left: listElement.scrollWidth,
        behavior: 'smooth',
      })
    }

    previousPlayerCountRef.current = players.length
  }, [players.length])

  const updateSetup = (updater: (draft: RoundSetupDraft) => RoundSetupDraft) => {
    onUpdateRoundState((currentState) => {
      const draft: RoundSetupDraft = {
        config: currentState.config,
        players: currentState.players,
        holes: currentState.holes,
      }

      const nextDraft = updater(draft)
      return applyRoundSetupDraft(currentState, nextDraft)
    })
  }

  const setHoleCount = (holeCount: HoleCount) => {
    hapticSelection()
    updateSetup((draft) => {
      const nextConfig = {
        ...draft.config,
        holeCount,
      }

      return {
        ...draft,
        config: nextConfig,
        holes: resizeHoles(draft.holes, holeCount, draft.config.courseStyle),
      }
    })
  }

  const setCourseStyle = (courseStyle: CourseStyle) => {
    hapticSelection()
    updateSetup((draft) => {
      const nextConfig = {
        ...draft.config,
        courseStyle,
      }

      return {
        ...draft,
        config: nextConfig,
        holes: applyCourseStyle(draft.holes, draft.config.holeCount, courseStyle),
      }
    })
  }

  const addPlayer = () => {
    hapticSelection()
    updateSetup((draft) => {
      if (draft.players.length >= MAX_GOLFERS) {
        return draft
      }

      const nextPosition = draft.players.length + 1
      const nextPlayer: Player = {
        id: createDraftId(nextPosition),
        name: '',
        expectedScore18: DEFAULT_EXPECTED_SCORE,
      }

      return {
        ...draft,
        players: [...draft.players, nextPlayer],
      }
    })
  }

  const removePlayer = (playerId: string) => {
    hapticSelection()
    updateSetup((draft) => {
      if (draft.players.length <= MIN_GOLFERS) {
        return draft
      }

      return {
        ...draft,
        players: draft.players.filter((player) => player.id !== playerId),
      }
    })
  }

  const updatePlayerName = (playerId: string, name: string) => {
    updateSetup((draft) => ({
      ...draft,
      players: draft.players.map((player) =>
        player.id === playerId
          ? {
              ...player,
              name,
            }
          : player,
      ),
    }))
  }

  const updatePlayerExpectedScore = (playerId: string, expectedScore: number) => {
    updateSetup((draft) => ({
      ...draft,
      players: draft.players.map((player) =>
        player.id === playerId
          ? {
              ...player,
              expectedScore18: normalizeExpectedScore(expectedScore),
            }
          : player,
      ),
    }))
  }

  const applyLastGroupShortcut = (lastGroupNames: string[]) => {
    hapticLightImpact()
    updateSetup((draft) => {
      const normalizedNames = dedupeNames(lastGroupNames).slice(0, MAX_GOLFERS)
      if (normalizedNames.length === 0) {
        return draft
      }

      const nextPlayers: Player[] = normalizedNames.map((name, index) => {
        const existingPlayer = draft.players[index]
        return {
          id: existingPlayer?.id ?? createDraftId(index + 1),
          name,
          expectedScore18: existingPlayer?.expectedScore18 ?? DEFAULT_EXPECTED_SCORE,
        }
      })

      return {
        ...draft,
        players: nextPlayers,
      }
    })
  }

  const applySuggestedPlayerNameShortcut = (suggestedName: string) => {
    const normalizedSuggestedName = normalizeSetupPlayerName(suggestedName)
    if (!normalizedSuggestedName) {
      return
    }

    hapticSelection()
    updateSetup((draft) => {
      const duplicateExists = draft.players.some(
        (player) =>
          normalizeSetupPlayerName(player.name).toLocaleLowerCase() ===
          normalizedSuggestedName.toLocaleLowerCase(),
      )

      if (duplicateExists) {
        return draft
      }

      const emptySlotIndex = draft.players.findIndex((player, playerIndex) =>
        isDefaultSetupPlayerName(player.name, playerIndex + 1),
      )

      if (emptySlotIndex >= 0) {
        return {
          ...draft,
          players: draft.players.map((player, playerIndex) =>
            playerIndex === emptySlotIndex
              ? {
                  ...player,
                  name: normalizedSuggestedName,
                }
              : player,
          ),
        }
      }

      if (draft.players.length >= MAX_GOLFERS) {
        return draft
      }

      return {
        ...draft,
        players: [
          ...draft.players,
          {
            id: createDraftId(draft.players.length + 1),
            name: normalizedSuggestedName,
            expectedScore18: DEFAULT_EXPECTED_SCORE,
          },
        ],
      }
    })
  }

  const beginRound = () => {
    if (setupPlayMode === 'multiplayer' && !activeMultiplayerSession) {
      hapticWarning()
      setMultiplayerStatusMessage('Create or join a room first so everyone can play from their own phone.')
      return
    }

    hapticLightImpact()
    const nextRoundState = {
      ...roundState,
      config: {
        ...roundState.config,
        featuredHoles: {
          ...roundState.config.featuredHoles,
          assignmentMode: 'auto' as const,
        },
      },
      currentHoleIndex: 0,
    }

    trackSetupStartedDeferred(nextRoundState)

    onUpdateRoundState((currentState) => ({
      ...currentState,
      config: {
        ...currentState.config,
        featuredHoles: {
          ...currentState.config.featuredHoles,
          assignmentMode: 'auto',
        },
      },
      currentHoleIndex: 0,
    }))
    onNavigate('holePlay')
  }

  const leaveCurrentMultiplayerRoom = useCallback(
    async (messageOnSuccess: string | null) => {
      const sessionToLeave = activeMultiplayerSession
      clearActiveMultiplayerSession()
      setActiveMultiplayerSession(null)

      if (!sessionToLeave) {
        if (messageOnSuccess) {
          setMultiplayerStatusMessage(messageOnSuccess)
        }
        return
      }

      setIsMultiplayerSubmitting(true)
      const leaveResult = await leaveMultiplayerRound(sessionToLeave.roundId)
      if (!leaveResult.ok) {
        hapticWarning()
        setMultiplayerStatusMessage(
          `${messageOnSuccess ?? 'Left room locally.'} Server leave request failed: ${leaveResult.error.message}`,
        )
        setIsMultiplayerSubmitting(false)
        return
      }

      hapticSuccess()
      setMultiplayerStatusMessage(messageOnSuccess)
      setIsMultiplayerSubmitting(false)
    },
    [activeMultiplayerSession],
  )

  const setPlayMode = (nextMode: SetupPlayMode) => {
    hapticSelection()
    setSetupPlayMode(nextMode)
    if (nextMode === 'local' && activeMultiplayerSession) {
      void leaveCurrentMultiplayerRoom('Multiplayer room closed for this device. Local mode is active.')
      return
    }
    setMultiplayerStatusMessage(null)
  }

  const createRoundMultiplayerSession = async () => {
    hapticSelection()
    if (!multiplayerEnabled) {
      hapticWarning()
      setMultiplayerStatusMessage('Multiplayer is disabled in this build.')
      return
    }
    if (!multiplayerConfigured) {
      hapticWarning()
      setMultiplayerStatusMessage('Supabase URL/key are missing for multiplayer.')
      return
    }
    if (multiplayerDisplayName.trim().length < 1) {
      hapticWarning()
      setMultiplayerStatusMessage('Enter a display name before creating a room.')
      return
    }

    setIsMultiplayerSubmitting(true)
    setMultiplayerStatusMessage('Creating room...')
    const createResult = await createMultiplayerRound(
      multiplayerDisplayName.trim(),
      multiplayerExpectedScore,
      roundState as unknown as Record<string, unknown>,
    )
    if (!createResult.ok) {
      hapticError()
      setMultiplayerStatusMessage(createResult.error.message)
      setIsMultiplayerSubmitting(false)
      return
    }

    hapticSuccess()
    saveActiveMultiplayerSession(createResult.value)
    setActiveMultiplayerSession(createResult.value)
    setMultiplayerRoomCode(createResult.value.roomCode)
    setMultiplayerExpectedScore(normalizeExpectedScore(createResult.value.expectedScore18))
    setMultiplayerStatusMessage(`Room ${createResult.value.roomCode} created. Share this code with your group.`)
    setIsMultiplayerSubmitting(false)
  }

  const joinExistingMultiplayerSession = async () => {
    hapticSelection()
    if (!multiplayerEnabled) {
      hapticWarning()
      setMultiplayerStatusMessage('Multiplayer is disabled in this build.')
      return
    }
    if (!multiplayerConfigured) {
      hapticWarning()
      setMultiplayerStatusMessage('Supabase URL/key are missing for multiplayer.')
      return
    }
    if (multiplayerDisplayName.trim().length < 1) {
      hapticWarning()
      setMultiplayerStatusMessage('Enter a display name before joining a room.')
      return
    }
    if (multiplayerRoomCode.trim().length !== 8) {
      hapticWarning()
      setMultiplayerStatusMessage('Enter a valid 8-character room code.')
      return
    }

    setIsMultiplayerSubmitting(true)
    setMultiplayerStatusMessage('Joining room...')
    const joinResult = await joinMultiplayerRound(
      multiplayerRoomCode,
      multiplayerDisplayName.trim(),
      multiplayerExpectedScore,
    )
    if (!joinResult.ok) {
      hapticError()
      setMultiplayerStatusMessage(joinResult.error.message)
      setIsMultiplayerSubmitting(false)
      return
    }

    hapticSuccess()
    saveActiveMultiplayerSession(joinResult.value)
    setActiveMultiplayerSession(joinResult.value)
    setMultiplayerRoomCode(joinResult.value.roomCode)
    setMultiplayerExpectedScore(normalizeExpectedScore(joinResult.value.expectedScore18))
    setMultiplayerStatusMessage(`Joined room ${joinResult.value.roomCode}.`)
    setIsMultiplayerSubmitting(false)
  }

  const recentPlayerNameSuggestions = localIdentityState.recentPlayerNames.slice(0, 8)
  const recentGroupNames = localIdentityState.roundHistory[0]?.playerNames ?? []
  const hasSavedPlayerShortcuts =
    recentGroupNames.length > 0 || recentPlayerNameSuggestions.length > 0

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
      onNavigate('home')
    }
  }, [onNavigate])

  return (
    <section
      className="screen stack-sm round-setup-screen mode-config-screen"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <header className="screen__header round-setup-header">
        <div className="screen-title">
          <AppIcon className="screen-title__icon" icon={ICONS.roundSetup} />
          <h2>Round Config</h2>
        </div>
        <p className="muted round-setup-header__support">
          Set your course and golfers, then press Play.
        </p>
      </header>

      <section className={`panel stack-xs mode-config-mode-card mode-tone--${activeMode.toneClassName}`}>
        <div className="row-between setup-row-wrap">
          <p className="label">Selected Mode</p>
          <button
            type="button"
            className="setup-player-shortcuts__button"
            onClick={() => {
              hapticSelection()
              onNavigate('home')
            }}
          >
            Change
          </button>
        </div>
        <div className="mode-config-mode-card__title">
          <AppIcon className="mode-config-mode-card__icon" icon={activeMode.icon} />
          <strong>{activeMode.name}</strong>
          {activeMode.isPremium && <span className="chip mode-config-mode-card__premium-chip">Premium</span>}
        </div>
        <p className="muted">{activeMode.description}</p>
      </section>

      <section className="panel stack-sm setup-step setup-step--basics">
        <header className="setup-step__header">
          <h3 className="step-title">
            <AppIcon className="step-title__icon" icon={ICONS.roundSetup} />
            Course
          </h3>
        </header>

        <div className="setup-control-group">
          <span className="label setup-control-label">Holes</span>
          <div className="segmented-control" role="group" aria-label="Hole count">
            <button
              type="button"
              className={`segmented-control__button ${
                config.holeCount === 9 ? 'segmented-control__button--active' : ''
              }`}
              onClick={() => setHoleCount(9)}
            >
              9
            </button>
            <button
              type="button"
              className={`segmented-control__button ${
                config.holeCount === 18 ? 'segmented-control__button--active' : ''
              }`}
              onClick={() => setHoleCount(18)}
            >
              18
            </button>
          </div>
        </div>

        <div className="setup-control-group">
          <span className="label setup-control-label">Course Type</span>
          <div className="segmented-control" role="group" aria-label="Course type">
            <button
              type="button"
              className={`segmented-control__button ${
                config.courseStyle === 'par3' ? 'segmented-control__button--active' : ''
              }`}
              onClick={() => setCourseStyle('par3')}
            >
              Par 3
            </button>
            <button
              type="button"
              className={`segmented-control__button ${
                config.courseStyle === 'standard' ? 'segmented-control__button--active' : ''
              }`}
              onClick={() => setCourseStyle('standard')}
            >
              Standard
            </button>
          </div>
        </div>
      </section>

      <section className="panel stack-sm setup-step setup-step--players">
        <header className="setup-step__header">
          <div className="row-between setup-row-wrap">
            <h3 className="step-title">
              <AppIcon className="step-title__icon" icon={ICONS.golfers} />
              Golfers
            </h3>
            <span className="chip setup-step__count-chip">
              {players.length} / {MAX_GOLFERS}
            </span>
          </div>
          <p className="muted setup-step__support">
            Add your golfers and optional expected scores.
          </p>
        </header>
        <div className="setup-control-group">
          <span className="label setup-control-label">Play Mode</span>
          <div className="segmented-control" role="group" aria-label="Play mode">
            <button
              type="button"
              className={`segmented-control__button ${
                setupPlayMode === 'local' ? 'segmented-control__button--active' : ''
              }`}
              onClick={() => setPlayMode('local')}
            >
              Local
            </button>
            <button
              type="button"
              className={`segmented-control__button ${
                setupPlayMode === 'multiplayer' ? 'segmented-control__button--active' : ''
              }`}
              onClick={() => setPlayMode('multiplayer')}
            >
              Multiplayer
            </button>
          </div>
          <p className="muted setup-step__support">
            Local allows multiple golfers controlled by one device. Multiplayer lets each golfer
            join from their own phone.
          </p>
        </div>

        {setupPlayMode === 'local' ? (
          <>
            {hasSavedPlayerShortcuts && (
              <section className="panel inset stack-xs setup-player-shortcuts" aria-label="Player quick fill">
                <div className="row-between setup-row-wrap">
                  <p className="label">Quick Fill</p>
                  {recentGroupNames.length > 0 && (
                    <button
                      type="button"
                      className="setup-player-shortcuts__button"
                      onClick={() => applyLastGroupShortcut(recentGroupNames)}
                    >
                      Use Last Group
                    </button>
                  )}
                </div>
                {recentPlayerNameSuggestions.length > 0 && (
                  <div className="setup-player-shortcuts__chips" role="list" aria-label="Recent golfer names">
                    {recentPlayerNameSuggestions.map((name) => (
                      <button
                        key={name}
                        type="button"
                        className="chip setup-player-shortcuts__chip"
                        onClick={() => applySuggestedPlayerNameShortcut(name)}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}
              </section>
            )}

            <div ref={playerListRef} className="setup-player-list" role="list" aria-label="Golfer list">
              {players.map((player, index) => (
                <PlayerSetupRow
                  key={player.id}
                  player={player}
                  position={index + 1}
                  canRemove={players.length > MIN_GOLFERS}
                  nameSuggestions={recentPlayerNameSuggestions}
                  onUpdateName={(name) => updatePlayerName(player.id, name)}
                  onUpdateExpectedScore={(expectedScore) => updatePlayerExpectedScore(player.id, expectedScore)}
                  onRemove={() => removePlayer(player.id)}
                />
              ))}
            </div>

            <button
              type="button"
              className="round-setup-add-player"
              onClick={addPlayer}
              disabled={players.length >= MAX_GOLFERS}
            >
              Add Golfer
            </button>
          </>
        ) : (
          <section className="panel inset stack-xs setup-multiplayer-panel" aria-label="Multiplayer room">
            <p className="label">Everyone on their own phone</p>
            {!multiplayerEnabled ? (
              <p className="muted">Multiplayer is disabled. Enable `VITE_ENABLE_MULTIPLAYER=true`.</p>
            ) : !multiplayerConfigured ? (
              <p className="muted">Supabase multiplayer settings are missing on this build.</p>
            ) : activeMultiplayerSession ? (
              <>
                <p className="setup-multiplayer-code">
                  Room code: <strong>{activeMultiplayerSession.roomCode}</strong>
                </p>
                <p className="muted">
                  Your expected 18-hole score: {activeMultiplayerSession.expectedScore18}
                </p>
                <p className="muted">
                  Share this code with your buddies, then open lobby to watch everyone join.
                </p>
                <div className="multiplayer-actions">
                  <button
                    type="button"
                    onClick={() => {
                      hapticSelection()
                      onNavigate('multiplayerLobby')
                    }}
                  >
                    Open Lobby
                  </button>
                  <button
                    type="button"
                    disabled={isMultiplayerSubmitting}
                    onClick={() => {
                      hapticSelection()
                      void leaveCurrentMultiplayerRoom('Left multiplayer room on this device.')
                    }}
                  >
                    {isMultiplayerSubmitting ? 'Leaving…' : 'Leave Room'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <label htmlFor="setup-multiplayer-display-name">Display name</label>
                <input
                  id="setup-multiplayer-display-name"
                  type="text"
                  value={multiplayerDisplayName}
                  maxLength={40}
                  autoComplete="nickname"
                  placeholder="Your name"
                  onChange={(event) => setMultiplayerDisplayName(event.target.value)}
                />
                <label htmlFor="setup-multiplayer-expected-score">Expected 18-hole score</label>
                <input
                  id="setup-multiplayer-expected-score"
                  type="number"
                  inputMode="numeric"
                  min={MIN_EXPECTED_SCORE}
                  max={MAX_EXPECTED_SCORE}
                  step={1}
                  value={multiplayerExpectedScore}
                  onChange={(event) => {
                    const parsedValue = Number(event.target.value)
                    setMultiplayerExpectedScore(normalizeExpectedScore(parsedValue))
                  }}
                />

                <div className="multiplayer-actions">
                  <button
                    type="button"
                    className="button-primary"
                    disabled={isMultiplayerSubmitting || multiplayerDisplayName.trim().length < 1}
                    onClick={() => {
                      void createRoundMultiplayerSession()
                    }}
                  >
                    {isMultiplayerSubmitting ? 'Working…' : 'Create Room Code'}
                  </button>
                </div>

                <label htmlFor="setup-multiplayer-room-code">Join by code</label>
                <input
                  id="setup-multiplayer-room-code"
                  type="text"
                  value={multiplayerRoomCode}
                  maxLength={8}
                  autoComplete="one-time-code"
                  placeholder="ABC12345"
                  onChange={(event) => setMultiplayerRoomCode(normalizeRoomCodeInput(event.target.value))}
                />
                <button
                  type="button"
                  disabled={!canJoinMultiplayerRound}
                  onClick={() => {
                    void joinExistingMultiplayerSession()
                  }}
                >
                  {isMultiplayerSubmitting ? 'Working…' : 'Join Room'}
                </button>
              </>
            )}
            {multiplayerStatusMessage && (
              <p className="muted" role="status" aria-live="polite">
                {multiplayerStatusMessage}
              </p>
            )}
          </section>
        )}
      </section>

      <section className="panel stack-xs setup-cta">
        <p className="muted setup-cta__support">
          {setupPlayMode === 'multiplayer' && !activeMultiplayerSession
            ? 'Create or join a room code first.'
            : 'Everything is set. Start Hole 1.'}
        </p>
        <button
          type="button"
          className="button-primary setup-cta__button"
          onClick={beginRound}
          disabled={setupPlayMode === 'multiplayer' && !activeMultiplayerSession}
        >
          <AppIcon className="button-icon" icon="play_arrow" />
          {setupPlayMode === 'multiplayer' ? 'Play Shared Round' : 'Play'}
        </button>
      </section>
    </section>
  )
}

export default RoundSetupScreen
