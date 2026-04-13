import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MutableRefObject } from 'react'
import { createNewRoundState } from '../../logic/roundLifecycle.ts'
import type { RoundState } from '../../types/game.ts'
import type { AppScreen } from '../router.tsx'
import type { AppAction } from '../stateMachine.ts'
import { useMultiplayerRoundSync } from './useMultiplayerRoundSync.ts'
import {
  applyMultiplayerRoundUpdate,
  clearActiveMultiplayerSession,
  clearPendingMultiplayerRoundUpdatesForRound,
  enqueuePendingMultiplayerRoundUpdate,
  loadMultiplayerParticipants,
  loadPendingMultiplayerRoundUpdates,
  removePendingMultiplayerRoundUpdatesById,
} from '../../logic/multiplayer.ts'

type MockPendingUpdate = {
  id: string
  roundId: string
  expectedRevision: number
  operation: string
  patch: Record<string, unknown>
  nextState: Record<string, unknown>
  createdAtMs: number
}

type MockSession = {
  roundId: string
  roomCode: string
  participantId: string
  playerId: string | null
  isHost: boolean
  revision: number
  expiresAt: string
  stateJson: Record<string, unknown>
  displayName: string
  expectedScore18: number
}

let mockPendingUpdates: MockPendingUpdate[] = []
let mockSession: MockSession | null = null

vi.mock('../../capacitor/haptics.ts', () => ({
  hapticWarning: vi.fn(),
}))

vi.mock('../../logic/multiplayer.ts', async () => {
  const actual = await vi.importActual<typeof import('../../logic/multiplayer.ts')>(
    '../../logic/multiplayer.ts',
  )

  return {
    ...actual,
    loadActiveMultiplayerSession: vi.fn(() => mockSession),
    saveActiveMultiplayerSession: vi.fn((nextSession: MockSession) => {
      mockSession = nextSession
    }),
    clearActiveMultiplayerSession: vi.fn(() => {
      mockSession = null
    }),
    getMultiplayerCurrentUserId: vi.fn(async () => ({
      ok: true as const,
      value: 'user-1',
    })),
    loadMultiplayerRoundSnapshot: vi.fn(async () => ({
      ok: true as const,
      value: {
        roundId: mockSession?.roundId ?? 'round-1',
        roomCode: mockSession?.roomCode ?? 'ROOM1234',
        revision: mockSession?.revision ?? 0,
        expiresAt: mockSession?.expiresAt ?? new Date(Date.now() + 3600_000).toISOString(),
        status: 'active',
        updatedAt: new Date().toISOString(),
        stateJson: (mockSession?.stateJson ?? {}) as Record<string, unknown>,
      },
    })),
    loadMultiplayerParticipants: vi.fn(async () => ({
      ok: true as const,
      value: mockSession
        ? [
            {
              id: mockSession.participantId,
              userId: 'user-1',
              displayName: mockSession.displayName,
              expectedScore18: mockSession.expectedScore18,
              playerId: mockSession.playerId,
              isHost: mockSession.isHost,
              joinedAt: new Date().toISOString(),
              lastSeenAt: new Date().toISOString(),
              leftAt: null,
            },
          ]
        : [],
    })),
    subscribeToMultiplayerRoundState: vi.fn(() => () => {}),
    applyMultiplayerRoundUpdate: vi.fn(),
    loadPendingMultiplayerRoundUpdates: vi.fn(() => [...mockPendingUpdates]),
    enqueuePendingMultiplayerRoundUpdate: vi.fn((payload: Omit<MockPendingUpdate, 'id' | 'createdAtMs'>) => {
      const queuedItem: MockPendingUpdate = {
        id: `queued-${mockPendingUpdates.length + 1}`,
        createdAtMs: Date.now(),
        ...payload,
      }
      mockPendingUpdates = [...mockPendingUpdates, queuedItem]
      return queuedItem
    }),
    removePendingMultiplayerRoundUpdatesById: vi.fn((ids: string[]) => {
      const removeSet = new Set(ids)
      mockPendingUpdates = mockPendingUpdates.filter((update) => !removeSet.has(update.id))
    }),
    clearPendingMultiplayerRoundUpdatesForRound: vi.fn((roundId: string) => {
      mockPendingUpdates = mockPendingUpdates.filter((update) => update.roundId !== roundId)
    }),
  }
})

function createTestState(): RoundState {
  const roundState = createNewRoundState()
  if (roundState.players[0]) {
    roundState.players[0].name = 'Alice'
  }
  if (roundState.players[1]) {
    roundState.players[1].name = 'Bob'
  }
  return roundState
}

function createDispatch(roundStateRef: MutableRefObject<RoundState>) {
  return vi.fn((action: AppAction) => {
    if (action.type === 'update_round_state') {
      roundStateRef.current = action.updater(roundStateRef.current)
    }
  })
}

describe('useMultiplayerRoundSync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPendingUpdates = []
    const initialState = createTestState()
    mockSession = {
      roundId: 'round-1',
      roomCode: 'ROOM1234',
      participantId: 'participant-1',
      playerId: initialState.players[0]?.id ?? null,
      isHost: true,
      revision: 0,
      expiresAt: new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString(),
      stateJson: initialState as unknown as Record<string, unknown>,
      displayName: 'Alice',
      expectedScore18: 90,
    }

    vi.mocked(applyMultiplayerRoundUpdate).mockImplementation(
      async (_roundId, expectedRevision, nextState) => ({
        ok: true,
        value: {
          applied: true,
          conflict: false,
          revision: expectedRevision + 1,
          stateJson: nextState as Record<string, unknown>,
          updatedAt: new Date().toISOString(),
        },
      }),
    )
  })

  it('queues updates while offline and replays them on reconnect', async () => {
    const roundStateRef = { current: createTestState() } as MutableRefObject<RoundState>
    const dispatch = createDispatch(roundStateRef)

    const { result, rerender } = renderHook(
      ({
        activeScreen,
        isOnline,
      }: {
        activeScreen: AppScreen
        isOnline: boolean
      }) =>
        useMultiplayerRoundSync({
          activeScreen,
          dispatch,
          isOnline,
          roundStateRef,
        }),
      {
        initialProps: {
          activeScreen: 'holeResults' as AppScreen,
          isOnline: false,
        },
      },
    )

    const actorPlayerId = roundStateRef.current.players[0]?.id
    if (!actorPlayerId) {
      throw new Error('Expected at least one actor player in test fixture.')
    }

    await waitFor(() => {
      expect(result.current.multiplayerSyncState).toBe('synced')
      expect(loadMultiplayerParticipants).toHaveBeenCalled()
    })

    act(() => {
      result.current.onUpdateRoundState((currentState) => {
        const holeResults = [...currentState.holeResults]
        const currentHoleResult = holeResults[currentState.currentHoleIndex]
        holeResults[currentState.currentHoleIndex] = {
          ...currentHoleResult,
          strokesByPlayerId: {
            ...currentHoleResult.strokesByPlayerId,
            [actorPlayerId]: 4,
          },
        }
        return {
          ...currentState,
          holeResults,
        }
      })
    })

    await waitFor(() => {
      expect(result.current.pendingUpdateCount).toBe(1)
      expect(result.current.multiplayerSyncState).toBe('offline')
    })
    expect(vi.mocked(enqueuePendingMultiplayerRoundUpdate)).toHaveBeenCalledTimes(1)

    rerender({
      activeScreen: 'holeResults' as AppScreen,
      isOnline: true,
    })

    await waitFor(() => {
      expect(result.current.pendingUpdateCount).toBe(0)
      expect(result.current.multiplayerSyncState).toBe('synced')
    })
    expect(vi.mocked(removePendingMultiplayerRoundUpdatesById)).toHaveBeenCalled()
  })

  it('invalidates stale membership and clears pending updates for the round', async () => {
    const roundStateRef = { current: createTestState() } as MutableRefObject<RoundState>
    const dispatch = createDispatch(roundStateRef)
    mockPendingUpdates = [
      {
        id: 'pending-1',
        roundId: 'round-1',
        expectedRevision: 1,
        operation: 'apply_local_change',
        patch: {},
        nextState: roundStateRef.current as unknown as Record<string, unknown>,
        createdAtMs: Date.now(),
      },
    ]
    vi.mocked(loadMultiplayerParticipants).mockResolvedValueOnce({
      ok: true,
      value: [],
    })

    const { result } = renderHook(() =>
      useMultiplayerRoundSync({
        activeScreen: 'roundSetup',
        dispatch,
        isOnline: false,
        roundStateRef,
      }),
    )

    await waitFor(() => {
      expect(result.current.multiplayerSyncState).toBe('conflict')
      expect(result.current.conflictReviewMessage).toContain('no longer an active participant')
    })
    expect(vi.mocked(clearActiveMultiplayerSession)).toHaveBeenCalledTimes(1)
    expect(vi.mocked(clearPendingMultiplayerRoundUpdatesForRound)).toHaveBeenCalledWith('round-1')
    expect(mockPendingUpdates).toHaveLength(0)

    const applyCallCount = vi.mocked(applyMultiplayerRoundUpdate).mock.calls.length
    const enqueueCallCount = vi.mocked(enqueuePendingMultiplayerRoundUpdate).mock.calls.length
    act(() => {
      result.current.onUpdateRoundState((currentState) => ({
        ...currentState,
        currentHoleIndex: Math.min(currentState.holeResults.length - 1, currentState.currentHoleIndex + 1),
      }))
    })
    expect(vi.mocked(applyMultiplayerRoundUpdate).mock.calls.length).toBe(applyCallCount)
    expect(vi.mocked(enqueuePendingMultiplayerRoundUpdate).mock.calls.length).toBe(enqueueCallCount)
  })

  it('surfaces conflict review when retry still conflicts', async () => {
    const roundStateRef = { current: createTestState() } as MutableRefObject<RoundState>
    const dispatch = createDispatch(roundStateRef)
    const conflictState = createTestState()

    let callCount = 0
    vi.mocked(applyMultiplayerRoundUpdate).mockImplementation(async () => {
      callCount += 1
      return {
        ok: true,
        value: {
          applied: false,
          conflict: true,
          revision: callCount,
          stateJson: conflictState as unknown as Record<string, unknown>,
          updatedAt: new Date().toISOString(),
        },
      }
    })

    const { result } = renderHook(() =>
      useMultiplayerRoundSync({
        activeScreen: 'holeResults',
        dispatch,
        isOnline: true,
        roundStateRef,
      }),
    )

    const actorPlayerId = roundStateRef.current.players[0]?.id
    if (!actorPlayerId) {
      throw new Error('Expected at least one actor player in test fixture.')
    }

    await waitFor(() => {
      expect(result.current.multiplayerSyncState).toBe('synced')
      expect(loadMultiplayerParticipants).toHaveBeenCalled()
    })

    act(() => {
      result.current.onUpdateRoundState((currentState) => {
        const holeResults = [...currentState.holeResults]
        const currentHoleResult = holeResults[currentState.currentHoleIndex]
        holeResults[currentState.currentHoleIndex] = {
          ...currentHoleResult,
          strokesByPlayerId: {
            ...currentHoleResult.strokesByPlayerId,
            [actorPlayerId]: 5,
          },
        }
        return {
          ...currentState,
          holeResults,
        }
      })
    })

    await waitFor(() => {
      expect(result.current.multiplayerSyncState).toBe('conflict')
      expect(result.current.conflictReviewMessage).toContain('State changed again')
    })
    expect(vi.mocked(applyMultiplayerRoundUpdate)).toHaveBeenCalledTimes(2)

    act(() => {
      result.current.clearConflictReview()
    })
    expect(result.current.conflictReviewMessage).toBeNull()
  })

  it('blocks non-host round-level changes and requires review', async () => {
    if (!mockSession) {
      throw new Error('Expected multiplayer session to be initialized in test.')
    }
    mockSession.isHost = false
    const roundStateRef = { current: createTestState() } as MutableRefObject<RoundState>
    const dispatch = createDispatch(roundStateRef)
    const { result } = renderHook(() =>
      useMultiplayerRoundSync({
        activeScreen: 'leaderboard',
        dispatch,
        isOnline: true,
        roundStateRef,
      }),
    )

    await waitFor(() => {
      expect(result.current.multiplayerSyncState).toBe('synced')
      expect(loadMultiplayerParticipants).toHaveBeenCalled()
    })

    act(() => {
      result.current.onUpdateRoundState((currentState) => ({
        ...currentState,
        currentHoleIndex: currentState.currentHoleIndex + 1,
      }))
    })

    await waitFor(() => {
      expect(result.current.multiplayerSyncState).toBe('conflict')
      expect(result.current.conflictReviewMessage).toContain('Only the host')
    })
    expect(vi.mocked(applyMultiplayerRoundUpdate)).not.toHaveBeenCalled()
    expect(vi.mocked(loadPendingMultiplayerRoundUpdates)).toHaveBeenCalled()
    expect(vi.mocked(loadMultiplayerParticipants)).toHaveBeenCalled()
    expect(vi.mocked(clearPendingMultiplayerRoundUpdatesForRound)).not.toHaveBeenCalled()
  })
})
