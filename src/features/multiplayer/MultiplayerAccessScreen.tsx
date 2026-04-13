import { useMemo, useState } from 'react'
import type { ScreenProps } from '../../app/screenContracts.ts'
import { hapticError, hapticSelection, hapticSuccess, hapticWarning } from '../../capacitor/haptics.ts'
import { loadAccountProfile } from '../../logic/account.ts'
import {
  DEFAULT_EXPECTED_SCORE,
  MAX_EXPECTED_SCORE,
  MIN_EXPECTED_SCORE,
  normalizeExpectedScore,
} from '../../logic/roundSetup.ts'
import {
  createMultiplayerRound,
  isMultiplayerConfigured,
  isMultiplayerEnabled,
  joinMultiplayerRound,
  saveActiveMultiplayerSession,
} from '../../logic/multiplayer.ts'

type MultiplayerAccessScreenProps = ScreenProps

function normalizeRoomCodeInput(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
}

function MultiplayerAccessScreen({
  roundState,
  onNavigate,
}: MultiplayerAccessScreenProps) {
  const defaultDisplayName = useMemo(() => {
    const profile = loadAccountProfile()
    return profile?.displayName?.trim() ?? ''
  }, [])
  const defaultExpectedScore = useMemo(() => {
    const profile = loadAccountProfile()
    if (typeof profile?.expectedScore18 === 'number') {
      return normalizeExpectedScore(profile.expectedScore18)
    }

    return DEFAULT_EXPECTED_SCORE
  }, [])
  const [displayName, setDisplayName] = useState(defaultDisplayName)
  const [expectedScore18, setExpectedScore18] = useState(defaultExpectedScore)
  const [roomCode, setRoomCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const multiplayerEnabled = isMultiplayerEnabled()
  const multiplayerConfigured = isMultiplayerConfigured()
  const isJoinEnabled = roomCode.trim().length === 8 && displayName.trim().length > 0 && !isSubmitting

  const onCreateRoom = async () => {
    hapticSelection()
    if (displayName.trim().length < 1) {
      hapticWarning()
      setStatusMessage('Enter a display name before creating a room.')
      return
    }

    setIsSubmitting(true)
    setStatusMessage('Creating room...')
    const createResult = await createMultiplayerRound(
      displayName.trim(),
      expectedScore18,
      roundState as unknown as Record<string, unknown>,
    )
    if (!createResult.ok) {
      hapticError()
      setStatusMessage(createResult.error.message)
      setIsSubmitting(false)
      return
    }

    saveActiveMultiplayerSession(createResult.value)
    hapticSuccess()
    setIsSubmitting(false)
    onNavigate('multiplayerLobby')
  }

  const onJoinRoom = async () => {
    hapticSelection()
    if (displayName.trim().length < 1) {
      hapticWarning()
      setStatusMessage('Enter a display name before joining a room.')
      return
    }

    if (roomCode.trim().length !== 8) {
      hapticWarning()
      setStatusMessage('Enter a valid 8-character room code.')
      return
    }

    setIsSubmitting(true)
    setStatusMessage('Joining room...')
    const joinResult = await joinMultiplayerRound(roomCode, displayName.trim(), expectedScore18)
    if (!joinResult.ok) {
      hapticError()
      setStatusMessage(joinResult.error.message)
      setIsSubmitting(false)
      return
    }

    saveActiveMultiplayerSession(joinResult.value)
    hapticSuccess()
    setIsSubmitting(false)
    onNavigate('multiplayerLobby')
  }

  if (!multiplayerEnabled) {
    return (
      <section className="screen stack-sm multiplayer-screen">
        <header className="screen__header">
          <h2>Multiplayer Disabled</h2>
          <p className="muted">
            Enable `VITE_ENABLE_MULTIPLAYER=true` to access room-code multiplayer.
          </p>
        </header>
        <button type="button" onClick={() => onNavigate('home')}>
          Back to Home
        </button>
      </section>
    )
  }

  if (!multiplayerConfigured) {
    return (
      <section className="screen stack-sm multiplayer-screen">
        <header className="screen__header">
          <h2>Multiplayer Setup Needed</h2>
          <p className="muted">
            Supabase URL/anon key are missing for multiplayer.
          </p>
        </header>
        <button type="button" onClick={() => onNavigate('home')}>
          Back to Home
        </button>
      </section>
    )
  }

  return (
    <section className="screen stack-sm multiplayer-screen">
      <header className="screen__header multiplayer-screen__header">
        <h2>Room Code Multiplayer</h2>
        <p className="muted">
          No friends list needed. Create a room or join one with an 8-character code.
        </p>
      </header>

      <section className="panel stack-xs multiplayer-card">
        <label htmlFor="multiplayer-display-name">Display name</label>
        <input
          id="multiplayer-display-name"
          type="text"
          value={displayName}
          maxLength={40}
          autoComplete="nickname"
          placeholder="Your name"
          onChange={(event) => setDisplayName(event.target.value)}
        />
        <label htmlFor="multiplayer-expected-score">Expected 18-hole score</label>
        <input
          id="multiplayer-expected-score"
          type="number"
          inputMode="numeric"
          min={MIN_EXPECTED_SCORE}
          max={MAX_EXPECTED_SCORE}
          step={1}
          value={expectedScore18}
          onChange={(event) => {
            const parsedValue = Number(event.target.value)
            setExpectedScore18(normalizeExpectedScore(parsedValue))
          }}
        />
      </section>

      <section className="panel stack-xs multiplayer-card">
        <h3>Create a room</h3>
        <p className="muted">Start a new round lobby and share the generated room code.</p>
        <button
          type="button"
          className="button-primary"
          data-requires-network="true"
          disabled={isSubmitting || displayName.trim().length < 1}
          onClick={() => {
            void onCreateRoom()
          }}
        >
          {isSubmitting ? 'Working…' : 'Create Room'}
        </button>
      </section>

      <section className="panel stack-xs multiplayer-card">
        <h3>Join by code</h3>
        <label htmlFor="multiplayer-room-code">Room code</label>
        <input
          id="multiplayer-room-code"
          type="text"
          value={roomCode}
          maxLength={8}
          autoComplete="one-time-code"
          placeholder="ABC12345"
          onChange={(event) => setRoomCode(normalizeRoomCodeInput(event.target.value))}
        />
        <button
          type="button"
          className="button-primary"
          data-requires-network="true"
          disabled={!isJoinEnabled}
          onClick={() => {
            void onJoinRoom()
          }}
        >
          {isSubmitting ? 'Working…' : 'Join Room'}
        </button>
      </section>

      {statusMessage && (
        <p className="muted" role="status" aria-live="polite">
          {statusMessage}
        </p>
      )}
    </section>
  )
}

export default MultiplayerAccessScreen
