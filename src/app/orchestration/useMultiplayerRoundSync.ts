import { hapticWarning } from '../../capacitor/haptics.ts'
import {
  applyMultiplayerRoundUpdate,
  clearActiveMultiplayerSession,
  clearPendingMultiplayerRoundUpdatesForRound,
  enqueuePendingMultiplayerRoundUpdate,
  getMultiplayerCurrentUserId,
  loadActiveMultiplayerSession,
  loadMultiplayerParticipants,
  loadMultiplayerRoundSnapshot,
  loadPendingMultiplayerRoundUpdates,
  removePendingMultiplayerRoundUpdatesById,
  saveActiveMultiplayerSession,
  subscribeToMultiplayerRoundState,
  type MultiplayerRoundSession,
  type MultiplayerSyncState,
  type PendingMultiplayerRoundUpdate,
} from '../../logic/multiplayer.ts'
import { reportTelemetryEvent } from '../../platform/telemetry.ts'
import type { RoundState } from '../../types/game.ts'
import type { AppScreen } from '../router.tsx'
import type { AppAction } from '../stateMachine.ts'
import { normalizeRoundState } from '../roundStateNormalization.ts'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
} from 'react'

type RoundStateUpdater = (currentState: RoundState) => RoundState

interface UseMultiplayerRoundSyncArgs {
  activeScreen: AppScreen
  dispatch: Dispatch<AppAction>
  isOnline: boolean
  roundStateRef: MutableRefObject<RoundState>
}

interface UseMultiplayerRoundSyncResult {
  activeMultiplayerSession: MultiplayerRoundSession | null
  multiplayerSyncState: MultiplayerSyncState
  multiplayerStatusMessage: string | null
  pendingUpdateCount: number
  conflictReviewMessage: string | null
  clearConflictReview: () => void
  onUpdateRoundState: (updater: RoundStateUpdater) => void
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function toJsonSignature(value: unknown): string {
  try {
    return JSON.stringify(value)
  } catch {
    return '__json_error__'
  }
}

function isJsonEqual(left: unknown, right: unknown): boolean {
  return toJsonSignature(left) === toJsonSignature(right)
}

function tryParseRemoteRoundState(value: Record<string, unknown>): RoundState | null {
  if (
    !isRecord(value.config) ||
    !Array.isArray(value.players) ||
    !Array.isArray(value.holes) ||
    !Array.isArray(value.holeCards) ||
    !Array.isArray(value.holePowerUps) ||
    !Array.isArray(value.holeResults) ||
    !Array.isArray(value.holeUxMetrics) ||
    !isRecord(value.deckMemory) ||
    !isRecord(value.totalsByPlayerId) ||
    typeof value.currentHoleIndex !== 'number'
  ) {
    return null
  }

  try {
    return normalizeRoundState(value as unknown as RoundState)
  } catch {
    return null
  }
}

function hasRoundLevelMutations(previous: RoundState, next: RoundState): boolean {
  if (previous.currentHoleIndex !== next.currentHoleIndex) {
    return true
  }

  return (
    !isJsonEqual(previous.config, next.config) ||
    !isJsonEqual(previous.players, next.players) ||
    !isJsonEqual(previous.holes, next.holes) ||
    !isJsonEqual(previous.holeCards, next.holeCards) ||
    !isJsonEqual(previous.holePowerUps, next.holePowerUps) ||
    !isJsonEqual(previous.deckMemory, next.deckMemory)
  )
}

function hasOnlyActorScoreAndMissionMutations(
  previous: RoundState,
  next: RoundState,
  actorPlayerId: string,
): boolean {
  if (previous.holeResults.length !== next.holeResults.length) {
    return false
  }

  for (let holeIndex = 0; holeIndex < previous.holeResults.length; holeIndex += 1) {
    const previousHoleResult = previous.holeResults[holeIndex]
    const nextHoleResult = next.holeResults[holeIndex]
    if (!previousHoleResult || !nextHoleResult) {
      return false
    }

    if (
      !isJsonEqual(previousHoleResult.publicPointDeltaByPlayerId, nextHoleResult.publicPointDeltaByPlayerId) ||
      !isJsonEqual(
        previousHoleResult.publicCardResolutionsByCardId,
        nextHoleResult.publicCardResolutionsByCardId,
      ) ||
      previousHoleResult.publicCardResolutionNotes !== nextHoleResult.publicCardResolutionNotes
    ) {
      return false
    }

    const strokePlayerIds = new Set([
      ...Object.keys(previousHoleResult.strokesByPlayerId),
      ...Object.keys(nextHoleResult.strokesByPlayerId),
    ])
    for (const playerId of strokePlayerIds) {
      if (playerId === actorPlayerId) {
        continue
      }
      if (previousHoleResult.strokesByPlayerId[playerId] !== nextHoleResult.strokesByPlayerId[playerId]) {
        return false
      }
    }

    const missionPlayerIds = new Set([
      ...Object.keys(previousHoleResult.missionStatusByPlayerId),
      ...Object.keys(nextHoleResult.missionStatusByPlayerId),
    ])
    for (const playerId of missionPlayerIds) {
      if (playerId === actorPlayerId) {
        continue
      }
      if (
        previousHoleResult.missionStatusByPlayerId[playerId] !==
        nextHoleResult.missionStatusByPlayerId[playerId]
      ) {
        return false
      }
    }
  }

  return true
}

function getMultiplayerOperation(previous: RoundState, next: RoundState): string {
  if (previous.currentHoleIndex !== next.currentHoleIndex) {
    return 'advance_hole'
  }

  if (hasRoundLevelMutations(previous, next)) {
    return 'reset_round'
  }

  return 'state_replace'
}

function getPendingUpdatesForRound(roundId: string | null): PendingMultiplayerRoundUpdate[] {
  if (!roundId) {
    return []
  }

  return loadPendingMultiplayerRoundUpdates().filter((update) => update.roundId === roundId)
}

function resolveParticipantMembership(
  session: MultiplayerRoundSession,
  participants: Array<{
    id: string
    isHost: boolean
    playerId: string | null
    expectedScore18: number
  }>,
): { isHost: boolean; playerId: string | null; expectedScore18: number } | null {
  const participantMembership = participants.find(
    (participant) => participant.id === session.participantId,
  )
  if (!participantMembership) {
    return null
  }

  return {
    isHost: participantMembership.isHost,
    playerId: participantMembership.playerId,
    expectedScore18: participantMembership.expectedScore18,
  }
}

function trackMultiplayerSyncTelemetry(params: {
  level: 'info' | 'warn' | 'error'
  message: string
  roundId?: string | null
  revision?: number
  pendingCount?: number
  data?: Record<string, unknown>
}): void {
  const { level, message, roundId = null, revision, pendingCount, data } = params
  reportTelemetryEvent({
    scope: 'multiplayer-sync',
    level,
    message,
    data: {
      ...(roundId ? { roundId } : {}),
      ...(typeof revision === 'number' ? { revision } : {}),
      ...(typeof pendingCount === 'number' ? { pendingCount } : {}),
      ...(data ?? {}),
    },
  })
}

export function useMultiplayerRoundSync({
  activeScreen,
  dispatch,
  isOnline,
  roundStateRef,
}: UseMultiplayerRoundSyncArgs): UseMultiplayerRoundSyncResult {
  const [activeMultiplayerSession, setActiveMultiplayerSession] =
    useState<MultiplayerRoundSession | null>(() => loadActiveMultiplayerSession())
  const [multiplayerSyncState, setMultiplayerSyncState] = useState<MultiplayerSyncState>('synced')
  const [multiplayerStatusMessage, setMultiplayerStatusMessage] = useState<string | null>(null)
  const [multiplayerUserId, setMultiplayerUserId] = useState<string | null>(null)
  const [pendingUpdateCount, setPendingUpdateCount] = useState<number>(() =>
    getPendingUpdatesForRound(loadActiveMultiplayerSession()?.roundId ?? null).length,
  )
  const [conflictReviewMessage, setConflictReviewMessage] = useState<string | null>(null)
  const activeMultiplayerSessionRef = useRef<MultiplayerRoundSession | null>(activeMultiplayerSession)
  const multiplayerUserIdRef = useRef<string | null>(multiplayerUserId)
  const multiplayerWriteQueueRef = useRef<Promise<void>>(Promise.resolve())
  const isFlushingQueueRef = useRef(false)

  const refreshPendingCount = useCallback((roundId: string | null) => {
    setPendingUpdateCount(getPendingUpdatesForRound(roundId).length)
  }, [])

  const clearConflictReview = useCallback(() => {
    setConflictReviewMessage(null)
    setMultiplayerStatusMessage(null)
  }, [])

  const markConflictForReview = useCallback((message: string) => {
    setMultiplayerSyncState('conflict')
    setMultiplayerStatusMessage(message)
    setConflictReviewMessage(message)
  }, [])

  const persistSession = useCallback((session: MultiplayerRoundSession) => {
    saveActiveMultiplayerSession(session)
    setActiveMultiplayerSession(session)
  }, [])

  const invalidateSessionForMissingMembership = useCallback(
    (session: MultiplayerRoundSession, message: string) => {
      clearActiveMultiplayerSession()
      clearPendingMultiplayerRoundUpdatesForRound(session.roundId)
      activeMultiplayerSessionRef.current = null
      setActiveMultiplayerSession(null)
      setMultiplayerUserId(null)
      setMultiplayerSyncState('conflict')
      setMultiplayerStatusMessage(message)
      setConflictReviewMessage(message)
      refreshPendingCount(null)
      trackMultiplayerSyncTelemetry({
        level: 'warn',
        message: 'Cleared stale multiplayer session due to missing participant membership',
        roundId: session.roundId,
        revision: session.revision,
      })
    },
    [refreshPendingCount],
  )

  const queueOfflineUpdate = useCallback(
    (params: {
      session: MultiplayerRoundSession
      expectedRevision: number
      nextState: RoundState
      operation: string
      patch: Record<string, unknown>
      message: string
    }) => {
      const { session, expectedRevision, nextState, operation, patch, message } = params
      enqueuePendingMultiplayerRoundUpdate({
        roundId: session.roundId,
        expectedRevision,
        operation,
        patch,
        nextState: nextState as unknown as Record<string, unknown>,
      })

      const predictedSession: MultiplayerRoundSession = {
        ...session,
        revision: expectedRevision + 1,
        stateJson: nextState as unknown as Record<string, unknown>,
      }
      persistSession(predictedSession)
      setMultiplayerSyncState('offline')
      setMultiplayerStatusMessage(message)
      refreshPendingCount(session.roundId)
      trackMultiplayerSyncTelemetry({
        level: 'warn',
        message: 'Queued multiplayer update for later replay',
        roundId: session.roundId,
        revision: expectedRevision,
        data: {
          operation,
          reason: message,
        },
      })
    },
    [persistSession, refreshPendingCount],
  )

  useEffect(() => {
    activeMultiplayerSessionRef.current = activeMultiplayerSession
  }, [activeMultiplayerSession])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      refreshPendingCount(activeMultiplayerSession?.roundId ?? null)
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [activeMultiplayerSession, refreshPendingCount])

  useEffect(() => {
    multiplayerUserIdRef.current = multiplayerUserId
  }, [multiplayerUserId])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setActiveMultiplayerSession(loadActiveMultiplayerSession())
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [activeScreen])

  useEffect(() => {
    if (!multiplayerStatusMessage) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setMultiplayerStatusMessage(null)
    }, 4200)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [multiplayerStatusMessage])

  useEffect(() => {
    if (!activeMultiplayerSession) {
      const timeoutId = window.setTimeout(() => {
        setMultiplayerUserId(null)
        setMultiplayerSyncState((currentSyncState) =>
          currentSyncState === 'conflict' ? currentSyncState : 'synced',
        )
      }, 0)
      return () => {
        window.clearTimeout(timeoutId)
      }
    }

    let isCancelled = false
    void (async () => {
      const userIdResult = await getMultiplayerCurrentUserId()
      if (isCancelled) {
        return
      }
      if (!userIdResult.ok) {
        setMultiplayerUserId(null)
        setMultiplayerSyncState(userIdResult.error.code === 'network' ? 'offline' : 'conflict')
        setMultiplayerStatusMessage(userIdResult.error.message)
        return
      }

      setMultiplayerUserId(userIdResult.value)
    })()

    return () => {
      isCancelled = true
    }
  }, [activeMultiplayerSession])

  const activeMultiplayerRoundId = activeMultiplayerSession?.roundId ?? null

  useEffect(() => {
    if (!activeMultiplayerRoundId) {
      return
    }

    void (async () => {
      const sessionAtStart = activeMultiplayerSessionRef.current
      if (!sessionAtStart) {
        return
      }

      const snapshotResult = await loadMultiplayerRoundSnapshot(activeMultiplayerRoundId)
      if (!snapshotResult.ok) {
        setMultiplayerSyncState(snapshotResult.error.code === 'network' ? 'offline' : 'conflict')
        setMultiplayerStatusMessage(snapshotResult.error.message)
        return
      }

      const participantResult = await loadMultiplayerParticipants(activeMultiplayerRoundId)
      const membership = participantResult.ok
        ? resolveParticipantMembership(sessionAtStart, participantResult.value)
        : null
      if (participantResult.ok && !membership) {
        invalidateSessionForMissingMembership(
          sessionAtStart,
          'You are no longer an active participant in this room. Rejoin with a room code.',
        )
        return
      }

      const parsedRemoteRoundState = tryParseRemoteRoundState(snapshotResult.value.stateJson)
      const nextSession: MultiplayerRoundSession = {
        ...sessionAtStart,
        roomCode: snapshotResult.value.roomCode,
        isHost: membership?.isHost ?? sessionAtStart.isHost,
        playerId: membership?.playerId ?? sessionAtStart.playerId ?? null,
        expectedScore18: membership?.expectedScore18 ?? sessionAtStart.expectedScore18,
        revision: snapshotResult.value.revision,
        expiresAt: snapshotResult.value.expiresAt,
        stateJson: snapshotResult.value.stateJson,
      }
      if (
        nextSession.roomCode !== sessionAtStart.roomCode ||
        nextSession.revision !== sessionAtStart.revision ||
        nextSession.expiresAt !== sessionAtStart.expiresAt ||
        !isJsonEqual(nextSession.stateJson, sessionAtStart.stateJson)
      ) {
        persistSession(nextSession)
      }
      setMultiplayerSyncState('synced')
      setConflictReviewMessage(null)

      if (!parsedRemoteRoundState) {
        return
      }

      dispatch({
        type: 'update_round_state',
        updater: () => parsedRemoteRoundState,
      })
    })()
  }, [activeMultiplayerRoundId, dispatch, invalidateSessionForMissingMembership, persistSession])

  useEffect(() => {
    if (!activeMultiplayerRoundId) {
      return
    }

    const unsubscribe = subscribeToMultiplayerRoundState(
      activeMultiplayerRoundId,
      (event) => {
        const currentSession = activeMultiplayerSessionRef.current
        if (!currentSession || event.revision <= currentSession.revision) {
          return
        }

        const nextSession: MultiplayerRoundSession = {
          ...currentSession,
          revision: event.revision,
          stateJson: event.stateJson,
        }
        persistSession(nextSession)
        setMultiplayerSyncState('synced')
        setMultiplayerStatusMessage(null)
        setConflictReviewMessage(null)

        const parsedRoundState = tryParseRemoteRoundState(event.stateJson)
        if (!parsedRoundState) {
          return
        }

        dispatch({
          type: 'update_round_state',
          updater: () => parsedRoundState,
        })

        void (async () => {
          const latestSession = activeMultiplayerSessionRef.current
          if (!latestSession) {
            return
          }

          const participantResult = await loadMultiplayerParticipants(latestSession.roundId)
          if (!participantResult.ok) {
            return
          }

          const membership = resolveParticipantMembership(latestSession, participantResult.value)
          if (!membership) {
            invalidateSessionForMissingMembership(
              latestSession,
              'You are no longer an active participant in this room. Rejoin with a room code.',
            )
            return
          }

          if (
            membership.isHost === latestSession.isHost &&
            membership.playerId === latestSession.playerId &&
            membership.expectedScore18 === latestSession.expectedScore18
          ) {
            return
          }

          persistSession({
            ...latestSession,
            isHost: membership.isHost,
            playerId: membership.playerId,
            expectedScore18: membership.expectedScore18,
          })
        })()
      },
    )

    return () => {
      unsubscribe?.()
    }
  }, [activeMultiplayerRoundId, dispatch, invalidateSessionForMissingMembership, persistSession])

  useEffect(() => {
    if (!isOnline || !activeMultiplayerRoundId || isFlushingQueueRef.current) {
      return
    }

    if (pendingUpdateCount === 0) {
      return
    }

    const pendingUpdates = getPendingUpdatesForRound(activeMultiplayerRoundId)
    if (pendingUpdates.length === 0) {
      return
    }

    isFlushingQueueRef.current = true
    void (async () => {
      setMultiplayerSyncState('syncing')
      const successfullyProcessedIds: string[] = []
      for (const pendingUpdate of pendingUpdates) {
        const session = activeMultiplayerSessionRef.current
        if (!session || session.roundId !== activeMultiplayerRoundId) {
          break
        }

        const replayResult = await applyMultiplayerRoundUpdate(
          session.roundId,
          pendingUpdate.expectedRevision,
          pendingUpdate.nextState,
          pendingUpdate.operation,
          {
            ...pendingUpdate.patch,
            replay: true,
          },
        )
        const latestSession = activeMultiplayerSessionRef.current
        if (!latestSession || latestSession.roundId !== activeMultiplayerRoundId) {
          break
        }

        if (!replayResult.ok) {
          if (replayResult.error.code === 'network') {
            setMultiplayerSyncState('offline')
            setMultiplayerStatusMessage('Connection dropped. Pending updates will retry.')
            trackMultiplayerSyncTelemetry({
              level: 'warn',
              message: 'Multiplayer replay paused due to network error',
              roundId: session.roundId,
              revision: session.revision,
              pendingCount: pendingUpdates.length - successfullyProcessedIds.length,
            })
          } else {
            trackMultiplayerSyncTelemetry({
              level: 'warn',
              message: 'Multiplayer replay failed due to non-network error',
              roundId: session.roundId,
              revision: session.revision,
              pendingCount: pendingUpdates.length - successfullyProcessedIds.length,
              data: {
                errorMessage: replayResult.error.message,
                errorCode: replayResult.error.code,
              },
            })
            markConflictForReview(replayResult.error.message)
          }
          break
        }

        if (!replayResult.value.applied) {
          const conflictRoundState = tryParseRemoteRoundState(replayResult.value.stateJson)
          const conflictSession: MultiplayerRoundSession = {
            ...session,
            revision: replayResult.value.revision,
            stateJson: replayResult.value.stateJson,
          }
          persistSession(conflictSession)
          if (conflictRoundState) {
            dispatch({
              type: 'update_round_state',
              updater: () => conflictRoundState,
            })
          }

          clearPendingMultiplayerRoundUpdatesForRound(session.roundId)
          refreshPendingCount(session.roundId)
          trackMultiplayerSyncTelemetry({
            level: 'warn',
            message: 'Multiplayer replay conflicted and queue was cleared',
            roundId: session.roundId,
            revision: replayResult.value.revision,
            pendingCount: pendingUpdates.length - successfullyProcessedIds.length,
          })
          markConflictForReview(
            'Offline edits conflicted with newer remote changes. Review latest state and re-apply manually.',
          )
          break
        }

        successfullyProcessedIds.push(pendingUpdate.id)
        const nextSession: MultiplayerRoundSession = {
          ...session,
          revision: replayResult.value.revision,
          stateJson: replayResult.value.stateJson,
        }
        persistSession(nextSession)

        const appliedRoundState = tryParseRemoteRoundState(replayResult.value.stateJson)
        if (appliedRoundState) {
          dispatch({
            type: 'update_round_state',
            updater: () => appliedRoundState,
          })
        }
      }

      if (successfullyProcessedIds.length > 0) {
        removePendingMultiplayerRoundUpdatesById(successfullyProcessedIds)
        refreshPendingCount(activeMultiplayerRoundId)
        trackMultiplayerSyncTelemetry({
          level: 'info',
          message: 'Multiplayer replay flush applied queued updates',
          roundId: activeMultiplayerRoundId,
          pendingCount: successfullyProcessedIds.length,
        })
      }

      if (
        activeMultiplayerSessionRef.current?.roundId === activeMultiplayerRoundId &&
        getPendingUpdatesForRound(activeMultiplayerRoundId).length === 0
      ) {
        setMultiplayerSyncState('synced')
        setMultiplayerStatusMessage(null)
        setConflictReviewMessage(null)
      }
      isFlushingQueueRef.current = false
    })().catch(() => {
      isFlushingQueueRef.current = false
      trackMultiplayerSyncTelemetry({
        level: 'error',
        message: 'Unexpected multiplayer replay failure',
        roundId: activeMultiplayerRoundId,
      })
      markConflictForReview('Unexpected error while replaying pending multiplayer updates.')
    })
  }, [
    activeMultiplayerRoundId,
    dispatch,
    isOnline,
    markConflictForReview,
    pendingUpdateCount,
    persistSession,
    refreshPendingCount,
  ])

  const onUpdateRoundState = useCallback(
    (updater: RoundStateUpdater) => {
      const multiplayerSession = activeMultiplayerSessionRef.current
      if (!multiplayerSession) {
        dispatch({ type: 'update_round_state', updater })
        return
      }

      multiplayerWriteQueueRef.current = multiplayerWriteQueueRef.current
        .then(async () => {
          const liveSession = activeMultiplayerSessionRef.current
          if (!liveSession) {
            dispatch({ type: 'update_round_state', updater })
            return
          }

          const baseRoundState = roundStateRef.current
          const proposedRoundState = normalizeRoundState(updater(baseRoundState))
          const actorPlayerId = liveSession.playerId
          const isHost = liveSession.isHost

          if (
            !isHost &&
            (hasRoundLevelMutations(baseRoundState, proposedRoundState) ||
              !actorPlayerId ||
              !hasOnlyActorScoreAndMissionMutations(
                baseRoundState,
                proposedRoundState,
                actorPlayerId,
              ))
          ) {
            hapticWarning()
            markConflictForReview(
              actorPlayerId
                ? 'Only the host can change round flow. Non-host players may update only their own score/mission status.'
                : 'Your player slot is not assigned yet. Refresh the lobby and retry.',
            )
            trackMultiplayerSyncTelemetry({
              level: 'warn',
              message: 'Rejected non-host round-level update',
              roundId: liveSession.roundId,
              revision: liveSession.revision,
              data: {
                actorPlayerId,
                hasMappedActor: Boolean(actorPlayerId),
              },
            })
            return
          }

          dispatch({
            type: 'update_round_state',
            updater: () => proposedRoundState,
          })

          const operation = getMultiplayerOperation(baseRoundState, proposedRoundState)
          const patch: Record<string, unknown> = {
            source: 'app_update',
            screen: activeScreen,
            actorPlayerId,
            actorUserId: multiplayerUserIdRef.current,
          }

          if (!isOnline) {
            queueOfflineUpdate({
              session: liveSession,
              expectedRevision: liveSession.revision,
              nextState: proposedRoundState,
              operation,
              patch,
              message: 'Offline: saved locally and queued for sync.',
            })
            return
          }

          setMultiplayerSyncState('syncing')
          const applyResult = await applyMultiplayerRoundUpdate(
            liveSession.roundId,
            liveSession.revision,
            proposedRoundState as unknown as Record<string, unknown>,
            operation,
            patch,
          )

          if (!applyResult.ok) {
            if (applyResult.error.code === 'network') {
              queueOfflineUpdate({
                session: liveSession,
                expectedRevision: liveSession.revision,
                nextState: proposedRoundState,
                operation,
                patch,
                message: 'Connection dropped. Update queued and will replay on reconnect.',
              })
              return
            }

            trackMultiplayerSyncTelemetry({
              level: 'warn',
              message: 'Multiplayer update failed before retry',
              roundId: liveSession.roundId,
              revision: liveSession.revision,
              data: {
                errorCode: applyResult.error.code,
                errorMessage: applyResult.error.message,
              },
            })
            markConflictForReview(applyResult.error.message)
            return
          }

          if (applyResult.value.applied) {
            persistSession({
              ...liveSession,
              revision: applyResult.value.revision,
              stateJson: applyResult.value.stateJson,
            })
            setMultiplayerSyncState('synced')
            setMultiplayerStatusMessage(null)
            setConflictReviewMessage(null)
            return
          }

          const conflictRoundState = tryParseRemoteRoundState(applyResult.value.stateJson)
          const conflictSession: MultiplayerRoundSession = {
            ...liveSession,
            revision: applyResult.value.revision,
            stateJson: applyResult.value.stateJson,
          }
          persistSession(conflictSession)

          if (!conflictRoundState) {
            trackMultiplayerSyncTelemetry({
              level: 'warn',
              message: 'Multiplayer update conflict returned invalid round state',
              roundId: liveSession.roundId,
              revision: applyResult.value.revision,
            })
            markConflictForReview('State changed remotely. Review and retry.')
            return
          }

          dispatch({
            type: 'update_round_state',
            updater: () => conflictRoundState,
          })

          const retryRoundState = normalizeRoundState(updater(conflictRoundState))
          if (
            !isHost &&
            (hasRoundLevelMutations(conflictRoundState, retryRoundState) ||
              !actorPlayerId ||
              !hasOnlyActorScoreAndMissionMutations(
                conflictRoundState,
                retryRoundState,
                actorPlayerId,
              ))
          ) {
            trackMultiplayerSyncTelemetry({
              level: 'warn',
              message: 'Retry aborted because non-host update is no longer valid',
              roundId: conflictSession.roundId,
              revision: conflictSession.revision,
              data: {
                actorPlayerId,
              },
            })
            markConflictForReview('State changed remotely. Review and retry.')
            return
          }

          dispatch({
            type: 'update_round_state',
            updater: () => retryRoundState,
          })

          if (!isOnline) {
            queueOfflineUpdate({
              session: conflictSession,
              expectedRevision: conflictSession.revision,
              nextState: retryRoundState,
              operation,
              patch: {
                ...patch,
                retry: true,
              },
              message: 'Offline during retry. Update queued for reconnect replay.',
            })
            return
          }

          const retryResult = await applyMultiplayerRoundUpdate(
            conflictSession.roundId,
            conflictSession.revision,
            retryRoundState as unknown as Record<string, unknown>,
            operation,
            {
              ...patch,
              retry: true,
            },
          )

          if (!retryResult.ok) {
            if (retryResult.error.code === 'network') {
              queueOfflineUpdate({
                session: conflictSession,
                expectedRevision: conflictSession.revision,
                nextState: retryRoundState,
                operation,
                patch: {
                  ...patch,
                  retry: true,
                },
                message: 'Connection dropped during retry. Update queued for reconnect replay.',
              })
              return
            }

            trackMultiplayerSyncTelemetry({
              level: 'warn',
              message: 'Multiplayer retry failed due to non-network error',
              roundId: conflictSession.roundId,
              revision: conflictSession.revision,
              data: {
                errorCode: retryResult.error.code,
                errorMessage: retryResult.error.message,
              },
            })
            markConflictForReview(retryResult.error.message)
            return
          }

          if (!retryResult.value.applied) {
            trackMultiplayerSyncTelemetry({
              level: 'warn',
              message: 'Multiplayer retry conflicted after one retry',
              roundId: conflictSession.roundId,
              revision: retryResult.value.revision,
            })
            markConflictForReview('State changed again. Please review latest values before retrying.')
            return
          }

          persistSession({
            ...conflictSession,
            revision: retryResult.value.revision,
            stateJson: retryResult.value.stateJson,
          })
          setMultiplayerSyncState('synced')
          setMultiplayerStatusMessage(null)
          setConflictReviewMessage(null)
        })
        .catch(() => {
          trackMultiplayerSyncTelemetry({
            level: 'error',
            message: 'Unexpected multiplayer update pipeline failure',
            roundId: activeMultiplayerSessionRef.current?.roundId ?? null,
            revision: activeMultiplayerSessionRef.current?.revision,
          })
          markConflictForReview('Unexpected multiplayer update error.')
        })
    },
    [
      activeScreen,
      dispatch,
      isOnline,
      markConflictForReview,
      persistSession,
      queueOfflineUpdate,
      roundStateRef,
    ],
  )

  return {
    activeMultiplayerSession,
    multiplayerSyncState,
    multiplayerStatusMessage,
    pendingUpdateCount,
    conflictReviewMessage,
    clearConflictReview,
    onUpdateRoundState,
  }
}
