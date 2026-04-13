import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ScreenProps } from '../../app/screenContracts.ts'
import { hapticError, hapticSelection, hapticSuccess, hapticWarning } from '../../capacitor/haptics.ts'
import {
  clearActiveMultiplayerSession,
  clearPendingMultiplayerRoundUpdatesForRound,
  leaveMultiplayerRound,
  loadActiveMultiplayerSession,
  loadMultiplayerParticipants,
  loadMultiplayerRoundSnapshot,
  saveActiveMultiplayerSession,
  subscribeToMultiplayerLobby,
  type MultiplayerParticipant,
  type MultiplayerRoundSession,
  type MultiplayerSyncState,
} from '../../logic/multiplayer.ts'

type MultiplayerLobbyScreenProps = ScreenProps

function formatExpiryLabel(expiresAtIso: string): string {
  const expiresAt = new Date(expiresAtIso)
  if (!Number.isFinite(expiresAt.getTime())) {
    return 'Expires soon'
  }

  return `Expires ${expiresAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
}

function formatLastSyncedLabel(lastSyncedAtMs: number | null): string {
  if (lastSyncedAtMs === null) {
    return 'Never synced'
  }

  const elapsedMs = Date.now() - lastSyncedAtMs
  if (elapsedMs < 1_000) {
    return 'Synced just now'
  }

  const elapsedSeconds = Math.max(1, Math.round(elapsedMs / 1_000))
  return `Synced ${elapsedSeconds}s ago`
}

function MultiplayerLobbyScreen({
  onNavigate,
}: MultiplayerLobbyScreenProps) {
  const [session, setSession] = useState<MultiplayerRoundSession | null>(() =>
    loadActiveMultiplayerSession(),
  )
  const [participants, setParticipants] = useState<MultiplayerParticipant[]>([])
  const [syncState, setSyncState] = useState<MultiplayerSyncState>('syncing')
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  const [lastSyncedAtMs, setLastSyncedAtMs] = useState<number | null>(null)

  const syncStateLabel = useMemo(() => {
    if (syncState === 'syncing') {
      return 'Syncing...'
    }
    if (syncState === 'offline') {
      return 'Offline'
    }
    if (syncState === 'conflict') {
      return 'Conflict'
    }
    return 'Synced'
  }, [syncState])

  const currentParticipant = useMemo(
    () =>
      session
        ? participants.find((participant) => participant.id === session.participantId) ?? null
        : null,
    [participants, session],
  )

  const openSharedRoundDisabledReason = useMemo(() => {
    if (!session) {
      return 'Join a room first.'
    }
    if (syncState !== 'synced' || lastSyncedAtMs === null) {
      return 'Wait for lobby sync before opening the shared round.'
    }
    if (!currentParticipant) {
      return 'Your membership is no longer active. Rejoin the room.'
    }
    if (!currentParticipant.isHost && !currentParticipant.playerId) {
      return 'Waiting for host player assignment.'
    }
    return null
  }, [currentParticipant, lastSyncedAtMs, session, syncState])

  const isOpenSharedRoundReady = openSharedRoundDisabledReason === null

  const refreshLobby = useCallback(async () => {
    if (!session) {
      return
    }

    setIsRefreshing(true)
    setSyncState('syncing')
    const [snapshotResult, participantsResult] = await Promise.all([
      loadMultiplayerRoundSnapshot(session.roundId),
      loadMultiplayerParticipants(session.roundId),
    ])

    if (!snapshotResult.ok || !participantsResult.ok) {
      const failedError = !snapshotResult.ok
        ? snapshotResult.error
        : !participantsResult.ok
          ? participantsResult.error
          : null
      if (!failedError) {
        setSyncState('conflict')
        setStatusMessage('Unexpected multiplayer sync error.')
        setIsRefreshing(false)
        return
      }
      const nextSyncState: MultiplayerSyncState =
        failedError.code === 'network' ? 'offline' : 'conflict'
      setSyncState(nextSyncState)
      setStatusMessage(failedError.message)
      setIsRefreshing(false)
      return
    }

    const currentParticipant = participantsResult.value.find(
      (participant) => participant.id === session.participantId,
    )
    if (!currentParticipant) {
      clearPendingMultiplayerRoundUpdatesForRound(session.roundId)
      clearActiveMultiplayerSession()
      setSession(null)
      setParticipants([])
      setSyncState('conflict')
      setStatusMessage('You are no longer an active participant in this room. Rejoin with a room code.')
      setIsRefreshing(false)
      hapticWarning()
      onNavigate('multiplayerAccess')
      return
    }

    const updatedSession: MultiplayerRoundSession = {
      ...session,
      roomCode: snapshotResult.value.roomCode,
      revision: snapshotResult.value.revision,
      expiresAt: snapshotResult.value.expiresAt,
      stateJson: snapshotResult.value.stateJson,
      isHost: currentParticipant.isHost,
      playerId: currentParticipant.playerId,
      expectedScore18: currentParticipant.expectedScore18,
    }
    saveActiveMultiplayerSession(updatedSession)
    setSession(updatedSession)
    setParticipants(participantsResult.value)
    setSyncState('synced')
    setLastSyncedAtMs(Date.now())
    setStatusMessage(null)
    setIsRefreshing(false)
  }, [session])

  useEffect(() => {
    if (!session) {
      return
    }

    const initialRefreshTimer = window.setTimeout(() => {
      void refreshLobby()
    }, 0)
    const unsubscribe = subscribeToMultiplayerLobby(session.roundId, () => {
      void refreshLobby()
    })

    return () => {
      window.clearTimeout(initialRefreshTimer)
      unsubscribe?.()
    }
  }, [refreshLobby, session])

  const leaveRoom = async () => {
    if (!session || isLeaving) {
      return
    }

    hapticSelection()
    setIsLeaving(true)
    setStatusMessage('Leaving room...')
    const leaveResult = await leaveMultiplayerRound(session.roundId)
    if (!leaveResult.ok) {
      hapticError()
      setStatusMessage(leaveResult.error.message)
      setIsLeaving(false)
      return
    }

    clearActiveMultiplayerSession()
    hapticSuccess()
    onNavigate('home')
  }

  if (!session) {
    return (
      <section className="screen stack-sm multiplayer-screen">
        <header className="screen__header">
          <h2>No Active Room</h2>
          <p className="muted">
            Create or join a room first to open the multiplayer lobby.
          </p>
        </header>
        <div className="multiplayer-actions">
          <button type="button" onClick={() => onNavigate('multiplayerAccess')}>
            Go to Create/Join
          </button>
          <button type="button" onClick={() => onNavigate('home')}>
            Back to Home
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="screen stack-sm multiplayer-screen">
      <header className="screen__header multiplayer-screen__header">
        <h2>Room Lobby</h2>
        <p className="muted">
          Share code <strong>{session.roomCode}</strong> with your group.
        </p>
      </header>

      <section className="panel stack-xs multiplayer-card">
        <div className="multiplayer-lobby-meta">
          <span className="chip">{syncStateLabel}</span>
          <span className="muted">{formatLastSyncedLabel(lastSyncedAtMs)}</span>
        </div>
        <p className="muted">{formatExpiryLabel(session.expiresAt)}</p>
        <p className="muted">Revision: {session.revision}</p>
      </section>

      <section className="panel stack-xs multiplayer-card">
        <h3>Players ({participants.length}/4)</h3>
        {participants.length === 0 ? (
          <p className="muted">No active players found yet.</p>
        ) : (
          <ul className="multiplayer-player-list">
            {participants.map((participant) => (
              <li key={participant.id} className="multiplayer-player-list__item">
                <span>{participant.displayName}</span>
                <span className="multiplayer-player-list__badges">
                  {participant.id === session.participantId ? (
                    <span className="chip">You</span>
                  ) : null}
                  {participant.isHost ? <span className="chip">Host</span> : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel stack-xs multiplayer-card">
        <h3>Shared round</h3>
        <p className="muted">
          Open the shared round to start setup or continue play with realtime sync.
        </p>
        <button
          type="button"
          className="button-primary"
          disabled={!isOpenSharedRoundReady || isRefreshing || isLeaving}
          onClick={() => {
            if (!isOpenSharedRoundReady) {
              return
            }
            hapticSelection()
            onNavigate('roundSetup')
          }}
        >
          Open Shared Round
        </button>
        {!isOpenSharedRoundReady ? (
          <p className="muted" role="status" aria-live="polite">
            {openSharedRoundDisabledReason}
          </p>
        ) : null}
      </section>

      <div className="multiplayer-actions">
        <button
          type="button"
          data-requires-network="true"
          disabled={isRefreshing || isLeaving}
          onClick={() => {
            void refreshLobby()
          }}
        >
          {isRefreshing ? 'Refreshing…' : 'Refresh'}
        </button>
        <button
          type="button"
          className="button-primary"
          data-requires-network="true"
          disabled={isLeaving}
          onClick={() => {
            void leaveRoom()
          }}
        >
          {isLeaving ? 'Leaving…' : 'Leave Room'}
        </button>
      </div>

      {statusMessage && (
        <p className="muted" role="status" aria-live="polite">
          {statusMessage}
        </p>
      )}
    </section>
  )
}

export default MultiplayerLobbyScreen
