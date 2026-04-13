import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { createScreenProps } from '../../test/screenProps.ts'
import RoundSetupScreen from './RoundSetupScreen.tsx'
import {
  createMultiplayerRound,
  isMultiplayerConfigured,
  isMultiplayerEnabled,
  loadActiveMultiplayerSession,
  saveActiveMultiplayerSession,
} from '../../logic/multiplayer.ts'

vi.mock('../../capacitor/haptics.ts', () => ({
  hapticLightImpact: vi.fn(),
  hapticSelection: vi.fn(),
}))

vi.mock('../../logic/analytics.ts', () => ({
  trackRoundSetupCompleted: vi.fn(),
  trackRoundStarted: vi.fn(),
}))

vi.mock('../../logic/localIdentity.ts', () => ({
  loadLocalIdentityState: () => ({
    recentPlayerNames: [] as string[],
    roundHistory: [] as Array<{ playerNames: string[] }>,
  }),
}))

vi.mock('../../logic/multiplayer.ts', async () => {
  const actual = await vi.importActual<typeof import('../../logic/multiplayer.ts')>(
    '../../logic/multiplayer.ts',
  )

  return {
    ...actual,
    isMultiplayerEnabled: vi.fn(() => true),
    isMultiplayerConfigured: vi.fn(() => true),
    loadActiveMultiplayerSession: vi.fn(() => null),
    createMultiplayerRound: vi.fn(),
    saveActiveMultiplayerSession: vi.fn(),
    joinMultiplayerRound: vi.fn(),
    leaveMultiplayerRound: vi.fn(async () => ({ ok: true as const, value: true })),
    clearActiveMultiplayerSession: vi.fn(),
  }
})

describe('RoundSetupScreen component flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(isMultiplayerEnabled).mockReturnValue(true)
    vi.mocked(isMultiplayerConfigured).mockReturnValue(true)
    vi.mocked(loadActiveMultiplayerSession).mockReturnValue(null)
  })

  it('adds a golfer through round-state update orchestration', async () => {
    const user = userEvent.setup()
    const onUpdateRoundState = vi.fn()
    const props = createScreenProps({ onUpdateRoundState })

    render(<RoundSetupScreen {...props} />)

    await user.click(screen.getByRole('button', { name: 'Add Golfer' }))

    expect(onUpdateRoundState).toHaveBeenCalledTimes(1)
    const updater = onUpdateRoundState.mock.calls[0]?.[0]
    expect(typeof updater).toBe('function')
    const nextState = updater(props.roundState)
    expect(nextState.players.length).toBe(props.roundState.players.length + 1)
  })

  it('navigates into hole play when setup is confirmed', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    const onUpdateRoundState = vi.fn()
    const props = createScreenProps({
      onNavigate,
      onUpdateRoundState,
    })

    render(<RoundSetupScreen {...props} />)

    await user.click(screen.getByRole('button', { name: 'Play' }))

    expect(onNavigate).toHaveBeenCalledWith('holePlay')
    expect(onUpdateRoundState).toHaveBeenCalledTimes(1)
    const updater = onUpdateRoundState.mock.calls[0]?.[0]
    const nextState = updater(props.roundState)
    expect(nextState.currentHoleIndex).toBe(0)
    expect(nextState.config.featuredHoles.assignmentMode).toBe('auto')
  })

  it('defaults to local mode and shows multiplayer setup when toggled', async () => {
    const user = userEvent.setup()
    render(<RoundSetupScreen {...createScreenProps()} />)

    expect(screen.getByRole('button', { name: 'Add Golfer' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Multiplayer' }))

    expect(screen.getByLabelText('Display name')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create Room Code' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add Golfer' })).not.toBeInTheDocument()
  })

  it('creates a multiplayer room from round config and saves the session', async () => {
    const user = userEvent.setup()
    const props = createScreenProps()
    vi.mocked(createMultiplayerRound).mockResolvedValue({
      ok: true,
      value: {
        roundId: 'round-1',
        roomCode: 'AB12CD34',
        participantId: 'participant-1',
        playerId: 'player-1',
        isHost: true,
        revision: 0,
        expiresAt: new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString(),
        stateJson: props.roundState as unknown as Record<string, unknown>,
        displayName: 'Alex',
        expectedScore18: 90,
      },
    })

    render(<RoundSetupScreen {...props} />)
    await user.click(screen.getByRole('button', { name: 'Multiplayer' }))
    await user.clear(screen.getByLabelText('Display name'))
    await user.type(screen.getByLabelText('Display name'), 'Alex')
    await user.click(screen.getByRole('button', { name: 'Create Room Code' }))

    expect(createMultiplayerRound).toHaveBeenCalledWith('Alex', expect.any(Number), expect.any(Object))
    expect(saveActiveMultiplayerSession).toHaveBeenCalled()
    expect(await screen.findByText(/Room code:/)).toBeInTheDocument()
  })
})
