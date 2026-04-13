import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createScreenProps } from '../../test/screenProps.ts'
import MultiplayerLobbyScreen from './MultiplayerLobbyScreen.tsx'
import {
  clearActiveMultiplayerSession,
  clearPendingMultiplayerRoundUpdatesForRound,
  leaveMultiplayerRound,
  loadMultiplayerParticipants,
  loadMultiplayerRoundSnapshot,
  saveActiveMultiplayerSession,
  subscribeToMultiplayerLobby,
  type MultiplayerParticipant,
  type MultiplayerRoundSession,
} from '../../logic/multiplayer.ts'

vi.mock('../../capacitor/haptics.ts', () => ({
  hapticError: vi.fn(),
  hapticSelection: vi.fn(),
  hapticSuccess: vi.fn(),
  hapticWarning: vi.fn(),
}))

let mockSession: MultiplayerRoundSession | null = null
let mockParticipants: MultiplayerParticipant[] = []

vi.mock('../../logic/multiplayer.ts', async () => {
  const actual = await vi.importActual<typeof import('../../logic/multiplayer.ts')>(
    '../../logic/multiplayer.ts',
  )
  return {
    ...actual,
    loadActiveMultiplayerSession: vi.fn(() => mockSession),
    loadMultiplayerRoundSnapshot: vi.fn(async () => ({
      ok: true as const,
      value: {
        roundId: mockSession?.roundId ?? 'round-1',
        roomCode: mockSession?.roomCode ?? 'AB12CD34',
        revision: mockSession?.revision ?? 0,
        expiresAt: mockSession?.expiresAt ?? new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        updatedAt: new Date().toISOString(),
        stateJson: mockSession?.stateJson ?? {},
      },
    })),
    loadMultiplayerParticipants: vi.fn(async () => ({
      ok: true as const,
      value: mockParticipants,
    })),
    saveActiveMultiplayerSession: vi.fn(),
    subscribeToMultiplayerLobby: vi.fn(() => () => {}),
    leaveMultiplayerRound: vi.fn(async () => ({ ok: true as const, value: true })),
    clearActiveMultiplayerSession: vi.fn(),
    clearPendingMultiplayerRoundUpdatesForRound: vi.fn(),
  }
})

function createSessionFixture(overrides: Partial<MultiplayerRoundSession> = {}): MultiplayerRoundSession {
  return {
    roundId: 'round-1',
    roomCode: 'AB12CD34',
    participantId: 'participant-host',
    playerId: 'player-1',
    isHost: true,
    revision: 3,
    expiresAt: new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString(),
    stateJson: {},
    displayName: 'Host Player',
    expectedScore18: 90,
    ...overrides,
  }
}

describe('MultiplayerLobbyScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession = createSessionFixture()
    mockParticipants = [
      {
        id: 'participant-host',
        userId: 'user-host',
        displayName: 'Host Player',
        expectedScore18: 90,
        playerId: 'player-1',
        isHost: true,
        joinedAt: new Date(Date.now() - 10_000).toISOString(),
        lastSeenAt: new Date().toISOString(),
        leftAt: null,
      },
      {
        id: 'participant-2',
        userId: 'user-2',
        displayName: 'Player Two',
        expectedScore18: 95,
        playerId: 'player-2',
        isHost: false,
        joinedAt: new Date(Date.now() - 9_000).toISOString(),
        lastSeenAt: new Date().toISOString(),
        leftAt: null,
      },
    ]
  })

  it('shows no-active-room fallback when no session exists', () => {
    mockSession = null
    render(<MultiplayerLobbyScreen {...createScreenProps()} />)

    expect(screen.getByRole('heading', { name: 'No Active Room' })).toBeInTheDocument()
  })

  it('loads participants and displays host badge', async () => {
    render(<MultiplayerLobbyScreen {...createScreenProps()} />)

    await waitFor(() => {
      expect(loadMultiplayerRoundSnapshot).toHaveBeenCalledWith('round-1')
      expect(loadMultiplayerParticipants).toHaveBeenCalledWith('round-1')
      expect(saveActiveMultiplayerSession).toHaveBeenCalled()
      expect(subscribeToMultiplayerLobby).toHaveBeenCalledWith('round-1', expect.any(Function))
    })

    expect(screen.getByText('Players (2/4)')).toBeInTheDocument()
    expect(screen.getByText('Host')).toBeInTheDocument()
  })

  it('allows host to leave room and returns to home', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    render(
      <MultiplayerLobbyScreen
        {...createScreenProps({
          onNavigate,
        })}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Leave Room' }))

    await waitFor(() => {
      expect(leaveMultiplayerRound).toHaveBeenCalledWith('round-1')
      expect(clearActiveMultiplayerSession).toHaveBeenCalledTimes(1)
      expect(onNavigate).toHaveBeenCalledWith('home')
    })
  })

  it('clears stale session and routes to create/join when membership disappears', async () => {
    mockParticipants = []
    const onNavigate = vi.fn()
    render(
      <MultiplayerLobbyScreen
        {...createScreenProps({
          onNavigate,
        })}
      />,
    )

    await waitFor(() => {
      expect(clearPendingMultiplayerRoundUpdatesForRound).toHaveBeenCalledWith('round-1')
      expect(clearActiveMultiplayerSession).toHaveBeenCalledTimes(1)
      expect(onNavigate).toHaveBeenCalledWith('multiplayerAccess')
    })
  })

  it('keeps Open Shared Round disabled until participant readiness is verified', async () => {
    mockSession = createSessionFixture({
      participantId: 'participant-2',
      isHost: false,
      playerId: null,
    })
    mockParticipants = [
      {
        id: 'participant-2',
        userId: 'user-2',
        displayName: 'Player Two',
        expectedScore18: 95,
        playerId: null,
        isHost: false,
        joinedAt: new Date(Date.now() - 9_000).toISOString(),
        lastSeenAt: new Date().toISOString(),
        leftAt: null,
      },
    ]

    const user = userEvent.setup()
    render(<MultiplayerLobbyScreen {...createScreenProps()} />)

    const openButton = await screen.findByRole('button', { name: 'Open Shared Round' })
    await waitFor(() => {
      expect(openButton).toBeDisabled()
      expect(screen.getByText('Waiting for host player assignment.')).toBeInTheDocument()
    })

    mockParticipants = [
      {
        id: 'participant-2',
        userId: 'user-2',
        displayName: 'Player Two',
        expectedScore18: 95,
        playerId: 'player-2',
        isHost: false,
        joinedAt: new Date(Date.now() - 9_000).toISOString(),
        lastSeenAt: new Date().toISOString(),
        leftAt: null,
      },
    ]

    await user.click(screen.getByRole('button', { name: 'Refresh' }))
    await waitFor(() => {
      expect(openButton).toBeEnabled()
    })
  })
})
