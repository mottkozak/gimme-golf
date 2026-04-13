import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createScreenProps } from '../../test/screenProps.ts'
import MultiplayerAccessScreen from './MultiplayerAccessScreen.tsx'
import { loadAccountProfile } from '../../logic/account.ts'
import {
  createMultiplayerRound,
  isMultiplayerConfigured,
  isMultiplayerEnabled,
  joinMultiplayerRound,
  saveActiveMultiplayerSession,
  type MultiplayerRoundSession,
} from '../../logic/multiplayer.ts'

vi.mock('../../capacitor/haptics.ts', () => ({
  hapticError: vi.fn(),
  hapticSelection: vi.fn(),
  hapticSuccess: vi.fn(),
  hapticWarning: vi.fn(),
}))

vi.mock('../../logic/account.ts', () => ({
  loadAccountProfile: vi.fn(() => null),
}))

vi.mock('../../logic/multiplayer.ts', async () => {
  const actual = await vi.importActual<typeof import('../../logic/multiplayer.ts')>(
    '../../logic/multiplayer.ts',
  )
  return {
    ...actual,
    isMultiplayerEnabled: vi.fn(() => true),
    isMultiplayerConfigured: vi.fn(() => true),
    createMultiplayerRound: vi.fn(),
    joinMultiplayerRound: vi.fn(),
    saveActiveMultiplayerSession: vi.fn(),
  }
})

function createSessionFixture(overrides: Partial<MultiplayerRoundSession> = {}): MultiplayerRoundSession {
  return {
    roundId: 'round-1',
    roomCode: 'AB12CD34',
    participantId: 'participant-1',
    playerId: 'player-1',
    isHost: false,
    revision: 0,
    expiresAt: new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString(),
    stateJson: {},
    displayName: 'Alice',
    expectedScore18: 90,
    ...overrides,
  }
}

describe('MultiplayerAccessScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(isMultiplayerEnabled).mockReturnValue(true)
    vi.mocked(isMultiplayerConfigured).mockReturnValue(true)
    vi.mocked(loadAccountProfile).mockReturnValue(null)
  })

  it('shows disabled state when multiplayer feature flag is off', () => {
    vi.mocked(isMultiplayerEnabled).mockReturnValue(false)
    render(<MultiplayerAccessScreen {...createScreenProps()} />)

    expect(screen.getByRole('heading', { name: 'Multiplayer Disabled' })).toBeInTheDocument()
  })

  it('shows setup-needed state when multiplayer is enabled but not configured', () => {
    vi.mocked(isMultiplayerConfigured).mockReturnValue(false)
    render(<MultiplayerAccessScreen {...createScreenProps()} />)

    expect(screen.getByRole('heading', { name: 'Multiplayer Setup Needed' })).toBeInTheDocument()
  })

  it('joins a room with normalized code and navigates to lobby', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    const joinedSession = createSessionFixture()
    vi.mocked(joinMultiplayerRound).mockResolvedValue({
      ok: true,
      value: joinedSession,
    })

    render(
      <MultiplayerAccessScreen
        {...createScreenProps({
          onNavigate,
        })}
      />,
    )

    await user.type(screen.getByLabelText('Display name'), 'Alice')
    await user.type(screen.getByLabelText('Room code'), 'ab-12 cd34')
    await user.click(screen.getByRole('button', { name: 'Join Room' }))

    await waitFor(() => {
      expect(joinMultiplayerRound).toHaveBeenCalledWith('AB12CD34', 'Alice', expect.any(Number))
      expect(saveActiveMultiplayerSession).toHaveBeenCalledWith(joinedSession)
      expect(onNavigate).toHaveBeenCalledWith('multiplayerLobby')
    })
  })

  it('creates a room with the current round state and navigates to lobby', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    const createdSession = createSessionFixture({ isHost: true })
    vi.mocked(createMultiplayerRound).mockResolvedValue({
      ok: true,
      value: createdSession,
    })

    const roundState = createScreenProps().roundState
    render(
      <MultiplayerAccessScreen
        {...createScreenProps({
          onNavigate,
          roundState,
        })}
      />,
    )

    await user.type(screen.getByLabelText('Display name'), 'Host Player')
    await user.click(screen.getByRole('button', { name: 'Create Room' }))

    await waitFor(() => {
      expect(createMultiplayerRound).toHaveBeenCalledWith(
        'Host Player',
        expect.any(Number),
        expect.any(Object),
      )
      expect(saveActiveMultiplayerSession).toHaveBeenCalledWith(createdSession)
      expect(onNavigate).toHaveBeenCalledWith('multiplayerLobby')
    })
  })

  it('surfaces auth setup guidance when anonymous sign-in is disabled', async () => {
    const user = userEvent.setup()
    vi.mocked(createMultiplayerRound).mockResolvedValue({
      ok: false,
      error: {
        code: 'auth',
        message:
          'Anonymous multiplayer sign-in is disabled in Supabase. Enable Auth > Providers > Anonymous, then retry.',
        retryable: false,
      },
    })

    render(<MultiplayerAccessScreen {...createScreenProps()} />)

    await user.type(screen.getByLabelText('Display name'), 'Host Player')
    await user.click(screen.getByRole('button', { name: 'Create Room' }))

    await waitFor(() => {
      expect(
        screen.getByText(
          'Anonymous multiplayer sign-in is disabled in Supabase. Enable Auth > Providers > Anonymous, then retry.',
        ),
      ).toBeInTheDocument()
    })
  })
})
