import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import GameplayOverviewWalkthrough from './GameplayOverviewWalkthrough.tsx'
import Modal from './Modal.tsx'
import OnboardingTutorial from './OnboardingTutorial.tsx'

describe('Modal portal regression', () => {
  it('renders generic modal backdrop in document.body and closes only on backdrop click', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(
      <div data-testid="app-shell" className="app-shell">
        <Modal onClose={onClose} labelledBy="modal-title">
          <h2 id="modal-title">Preview card</h2>
          <button type="button">Inside action</button>
        </Modal>
      </div>,
    )

    const appShell = screen.getByTestId('app-shell')
    const backdrop = document.body.querySelector<HTMLElement>('.modal-backdrop')
    const dialog = screen.getByRole('dialog', { name: 'Preview card' })

    expect(backdrop).toBeInTheDocument()
    expect(dialog).toBeInTheDocument()
    expect(appShell).not.toContainElement(backdrop)
    expect(backdrop).toContainElement(dialog)

    await user.click(screen.getByRole('button', { name: 'Inside action' }))
    expect(onClose).not.toHaveBeenCalled()

    if (!backdrop) {
      throw new Error('Expected modal backdrop to exist.')
    }
    await user.click(backdrop)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders onboarding tutorial modal via body portal', () => {
    render(
      <div data-testid="app-shell" className="app-shell">
        <OnboardingTutorial onClose={() => {}} />
      </div>,
    )

    const appShell = screen.getByTestId('app-shell')
    const backdrop = document.body.querySelector<HTMLElement>('.modal-backdrop')
    const dialog = screen.getByRole('dialog', { name: /quick tutorial/i })

    expect(backdrop).toBeInTheDocument()
    expect(dialog).toBeInTheDocument()
    expect(appShell).not.toContainElement(backdrop)
    expect(backdrop).toContainElement(dialog)
  })

  it('renders walkthrough modal via body portal', () => {
    render(
      <div data-testid="app-shell" className="app-shell">
        <GameplayOverviewWalkthrough onClose={() => {}} />
      </div>,
    )

    const appShell = screen.getByTestId('app-shell')
    const backdrop = document.body.querySelector<HTMLElement>('.modal-backdrop')
    const dialog = screen.getByRole('dialog', { name: /core walkthrough/i })

    expect(backdrop).toBeInTheDocument()
    expect(dialog).toBeInTheDocument()
    expect(appShell).not.toContainElement(backdrop)
    expect(backdrop).toContainElement(dialog)
  })
})
