import { useState } from 'react'
import { ICONS } from '../app/icons.ts'
import AppIcon from '../components/AppIcon.tsx'
import PlayerSetupRow from '../components/PlayerSetupRow.tsx'
import { trackRoundSetupCompleted, trackRoundStarted } from '../logic/analytics.ts'
import { loadLocalIdentityState } from '../logic/localIdentity.ts'
import { resolveLandingModeFromConfig } from '../logic/landingModes.ts'
import {
  applyCourseStyle,
  applyRoundSetupDraft,
  DEFAULT_EXPECTED_SCORE,
  MAX_GOLFERS,
  MIN_GOLFERS,
  normalizeExpectedScore,
  resizeHoles,
  type RoundSetupDraft,
} from '../logic/roundSetup.ts'
import type { CourseStyle, HoleCount, Player } from '../types/game.ts'
import type { ScreenProps } from './types.ts'

function createDraftId(position: number): string {
  const timestamp = Date.now().toString(36)
  return `player-${position}-${timestamp}`
}

function normalizeSetupPlayerName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

function isDefaultSetupPlayerName(playerName: string, position: number): boolean {
  const normalizedName = normalizeSetupPlayerName(playerName)
  if (!normalizedName) {
    return true
  }

  return normalizedName.toLocaleLowerCase() === `golfer ${position}`.toLocaleLowerCase()
}

function dedupeNames(names: string[]): string[] {
  const seen = new Set<string>()
  const deduped: string[] = []

  for (const name of names) {
    const normalizedName = normalizeSetupPlayerName(name)
    if (!normalizedName) {
      continue
    }

    const normalizedKey = normalizedName.toLocaleLowerCase()
    if (seen.has(normalizedKey)) {
      continue
    }

    seen.add(normalizedKey)
    deduped.push(normalizedName)
  }

  return deduped
}

function RoundSetupScreen({ roundState, onNavigate, onUpdateRoundState }: ScreenProps) {
  const [localIdentityState] = useState(() => loadLocalIdentityState())
  const { config, players } = roundState
  const activeMode = resolveLandingModeFromConfig(config)

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

    trackRoundSetupCompleted(nextRoundState, 'start_round')
    trackRoundStarted(nextRoundState, 'setup_start_round')

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

  const recentPlayerNameSuggestions = localIdentityState.recentPlayerNames.slice(0, 8)
  const recentGroupNames = localIdentityState.roundHistory[0]?.playerNames ?? []
  const hasSavedPlayerShortcuts =
    recentGroupNames.length > 0 || recentPlayerNameSuggestions.length > 0

  return (
    <section className="screen stack-sm round-setup-screen mode-config-screen">
      <header className="screen__header round-setup-header">
        <div className="screen-title">
          <AppIcon className="screen-title__icon" icon={ICONS.roundSetup} />
          <h2>Round Config</h2>
        </div>
        <p className="muted round-setup-header__support">
          Step 3 of 3: set course and golfers, then hit Play.
        </p>
      </header>

      <section className={`panel stack-xs mode-config-mode-card mode-tone--${activeMode.toneClassName}`}>
        <div className="row-between setup-row-wrap">
          <p className="label">Selected Mode</p>
          <button
            type="button"
            className="setup-player-shortcuts__button"
            onClick={() => onNavigate('home')}
          >
            Change
          </button>
        </div>
        <div className="mode-config-mode-card__title">
          <AppIcon className="mode-config-mode-card__icon" icon={activeMode.icon} />
          <strong>{activeMode.name}</strong>
        </div>
        <p className="muted">{activeMode.description}</p>
        <p className="muted">Includes: {activeMode.packsLabel}</p>
      </section>

      <section className="panel stack-sm setup-step setup-step--basics">
        <header className="setup-step__header">
          <h3 className="step-title">
            <AppIcon className="step-title__icon" icon={ICONS.roundSetup} />
            Course
          </h3>
          <p className="muted setup-step__support">Keep defaults if you want the fastest tee-off.</p>
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
            Add golfers and expected score so offers stay fair for mixed-skill groups.
          </p>
        </header>

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

        <div className="stack-xs setup-player-list">
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
      </section>

      <section className="panel stack-xs setup-cta">
        <p className="muted setup-cta__support">Everything is set. Start Hole 1.</p>
        <button type="button" className="button-primary setup-cta__button" onClick={beginRound}>
          <AppIcon className="button-icon" icon="play_arrow" />
          Play
        </button>
      </section>
    </section>
  )
}

export default RoundSetupScreen
