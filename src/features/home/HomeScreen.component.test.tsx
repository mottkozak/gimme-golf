import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { createNewRoundState } from '../../logic/roundLifecycle.ts'
import { createScreenProps } from '../../test/screenProps.ts'
import HomeScreen from './HomeScreen.tsx'

vi.mock('../../capacitor/haptics.ts', () => ({
  hapticLightImpact: vi.fn(),
  hapticSelection: vi.fn(),
}))

vi.mock('../../logic/analytics.ts', () => ({
  trackHomeAction: vi.fn(),
}))

describe('HomeScreen component flow', () => {
  it('starts classic round setup from the primary play control', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    const onUpdateRoundState = vi.fn()
    const props = createScreenProps({
      onNavigate,
      onUpdateRoundState,
    })

    render(
      <HomeScreen
        {...props}
        onModeDetailOpenChange={() => {}}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Start classic round setup' }))

    expect(onNavigate).toHaveBeenCalledWith('roundSetup')
    expect(onUpdateRoundState).toHaveBeenCalledTimes(1)
    const updater = onUpdateRoundState.mock.calls[0]?.[0]
    expect(typeof updater).toBe('function')
    expect(updater(props.roundState)).not.toBe(props.roundState)
  })

  it('starts setup for the selected pack when carousel selection changes', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    const onUpdateRoundState = vi.fn()
    const props = createScreenProps({
      onNavigate,
      onUpdateRoundState,
    })

    render(
      <HomeScreen
        {...props}
        onModeDetailOpenChange={() => {}}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Next pack' }))
    await user.click(screen.getByRole('button', { name: 'Start Showtime round setup' }))

    expect(onNavigate).toHaveBeenCalledWith('roundSetup')
    expect(onUpdateRoundState).toHaveBeenCalledTimes(1)
    const updater = onUpdateRoundState.mock.calls[0]?.[0]
    const nextState = updater(props.roundState)
    expect(nextState.config.enabledPackIds).toContain('novelty')
  })

  it('flips the selected pack preview when the pack is tapped', async () => {
    const user = userEvent.setup()
    const props = createScreenProps()

    render(
      <HomeScreen
        {...props}
        onModeDetailOpenChange={() => {}}
      />,
    )

    const flipToPreviewButton = screen.getByRole('button', {
      name: 'Flip Classic pack to preview example card',
    })
    await user.click(flipToPreviewButton)
    expect(
      screen.getByRole('button', {
        name: 'Show Classic pack back',
      }),
    ).toBeInTheDocument()
  })

  it('supports swipe gesture on the pack card to move to the next pack', async () => {
    const props = createScreenProps()

    render(
      <HomeScreen
        {...props}
        onModeDetailOpenChange={() => {}}
      />,
    )

    const packCardButton = screen.getByRole('button', {
      name: 'Flip Classic pack to preview example card',
    })
    fireEvent.touchStart(packCardButton, {
      touches: [{ identifier: 1, clientX: 260, clientY: 280 }],
    })
    fireEvent.touchEnd(packCardButton, {
      changedTouches: [{ identifier: 1, clientX: 160, clientY: 286 }],
    })

    expect(
      await screen.findByRole('button', {
        name: 'Flip Showtime pack to preview example card',
      }),
    ).toBeInTheDocument()
  })

  it('prompts before replacing a saved round when starting a selected mode', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    const onUpdateRoundState = vi.fn()
    const roundStateWithProgress = createNewRoundState()
    const primaryPlayerId = roundStateWithProgress.players[0]?.id
    if (!primaryPlayerId) {
      throw new Error('Expected at least one player in round fixture.')
    }
    roundStateWithProgress.holeResults[0].strokesByPlayerId[primaryPlayerId] = 4

    render(
      <HomeScreen
        {...createScreenProps({
          roundState: roundStateWithProgress,
          hasSavedRound: true,
          onNavigate,
          onUpdateRoundState,
        })}
        onModeDetailOpenChange={() => {}}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Start Classic and replace saved round' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Start Classic instead?' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Continue to Setup' }))
    expect(onNavigate).toHaveBeenCalledWith('roundSetup')
    expect(onUpdateRoundState).toHaveBeenCalledTimes(1)
  })

  it('surfaces resume feedback when saved round cannot be restored', async () => {
    const user = userEvent.setup()
    const onResumeSavedRound = vi.fn(() => false)
    const roundStateWithProgress = createNewRoundState()
    const primaryPlayerId = roundStateWithProgress.players[0]?.id
    if (!primaryPlayerId) {
      throw new Error('Expected at least one player in round fixture.')
    }
    roundStateWithProgress.holeResults[0].strokesByPlayerId[primaryPlayerId] = 4

    render(
      <HomeScreen
        {...createScreenProps({
          roundState: roundStateWithProgress,
          hasSavedRound: true,
          onResumeSavedRound,
        })}
        onModeDetailOpenChange={() => {}}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Resume Saved Round' }))

    expect(onResumeSavedRound).toHaveBeenCalledTimes(1)
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Saved round is no longer available.',
    )
  })
})
