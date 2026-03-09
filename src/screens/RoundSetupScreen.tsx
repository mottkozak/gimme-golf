import { useState } from 'react'
import CardPackToggleRow from '../components/CardPackToggleRow.tsx'
import PlayerSetupRow from '../components/PlayerSetupRow.tsx'
import ToggleRow from '../components/ToggleRow.tsx'
import { CARD_PACKS, CARD_PACKS_BY_ID } from '../data/cardPacks.ts'
import { FEATURED_HOLES_BY_ID } from '../data/featuredHoles.ts'
import { isPackUnlocked } from '../logic/entitlements.ts'
import { getFeaturedHoleTargetCount } from '../logic/featuredHoles.ts'
import { toggleEnabledPack } from '../logic/roundConfig.ts'
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
import type { CardPackId } from '../types/cards.ts'
import type {
  CourseStyle,
  FeaturedHoleAssignmentMode,
  FeaturedHoleFrequency,
  GameMode,
  HoleCount,
  Player,
} from '../types/game.ts'
import type { ScreenProps } from './types.ts'

function createDraftId(position: number): string {
  const timestamp = Date.now().toString(36)
  return `player-${position}-${timestamp}`
}

function RoundSetupScreen({ roundState, onNavigate, onUpdateRoundState }: ScreenProps) {
  const [activePackInfoId, setActivePackInfoId] = useState<CardPackId | null>(null)
  const { config, players } = roundState
  const isPowerUpsMode = config.gameMode === 'powerUps'

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

  const setGameMode = (gameMode: GameMode) => {
    updateSetup((draft) => ({
      ...draft,
      config: {
        ...draft.config,
        gameMode,
        featuredHoles:
          gameMode === 'powerUps'
            ? {
                ...draft.config.featuredHoles,
                enabled: false,
              }
            : draft.config.featuredHoles,
      },
    }))
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

  const setDynamicDifficulty = (checked: boolean) => {
    updateSetup((draft) => ({
      ...draft,
      config: {
        ...draft.config,
        toggles: {
          ...draft.config.toggles,
          dynamicDifficulty: checked,
        },
      },
    }))
  }

  const setMomentumBonuses = (checked: boolean) => {
    updateSetup((draft) => ({
      ...draft,
      config: {
        ...draft.config,
        toggles: {
          ...draft.config.toggles,
          momentumBonuses: checked,
        },
      },
    }))
  }

  const setFeaturedHolesEnabled = (checked: boolean) => {
    updateSetup((draft) => ({
      ...draft,
      config: {
        ...draft.config,
        featuredHoles: {
          ...draft.config.featuredHoles,
          enabled: checked,
        },
      },
    }))
  }

  const setFeaturedHolesFrequency = (frequency: FeaturedHoleFrequency) => {
    updateSetup((draft) => ({
      ...draft,
      config: {
        ...draft.config,
        featuredHoles: {
          ...draft.config.featuredHoles,
          frequency,
        },
      },
    }))
  }

  const setFeaturedHolesAssignmentMode = (assignmentMode: FeaturedHoleAssignmentMode) => {
    updateSetup((draft) => ({
      ...draft,
      config: {
        ...draft.config,
        featuredHoles: {
          ...draft.config.featuredHoles,
          assignmentMode,
        },
      },
    }))
  }

  const setPackEnabled = (packId: CardPackId, enabled: boolean) => {
    updateSetup((draft) => ({
      ...draft,
      config: {
        ...draft.config,
        enabledPackIds: toggleEnabledPack(draft.config.enabledPackIds, packId, enabled),
      },
    }))
  }

  const setDealMode = (mode: 'drawTwoPickOne' | 'autoAssignOne') => {
    updateSetup((draft) => ({
      ...draft,
      config: {
        ...draft.config,
        toggles: {
          ...draft.config.toggles,
          drawTwoPickOne: mode === 'drawTwoPickOne',
          autoAssignOne: mode === 'autoAssignOne',
        },
      },
    }))
  }

  const beginRound = () => {
    onUpdateRoundState((currentState) => ({
      ...currentState,
      currentHoleIndex: 0,
    }))
    onNavigate('holeSetup')
  }

  const activePackInfo = activePackInfoId ? CARD_PACKS_BY_ID[activePackInfoId] : null
  const featuredHoles = roundState.holes.filter((hole) => hole.featuredHoleType !== null)
  const featuredHoleTargetCount = getFeaturedHoleTargetCount(
    config.holeCount,
    config.featuredHoles.frequency,
  )

  return (
    <section className="screen stack-sm">
      <header className="screen__header">
        <h2>Round Setup</h2>
        <p className="muted">
          Pick the round format, add golfers, and choose game options before hole 1.
        </p>
      </header>

      <section className="panel stack-xs">
        <h3>Round Basics</h3>
        <p className="muted">Select hole count and course type.</p>

        <div className="stack-xs">
          <span className="label">Game Mode</span>
          <div className="button-row">
            <button
              type="button"
              className={config.gameMode === 'cards' ? 'button-primary' : ''}
              onClick={() => setGameMode('cards')}
            >
              Cards Mode
            </button>
            <button
              type="button"
              className={config.gameMode === 'powerUps' ? 'button-primary' : ''}
              onClick={() => setGameMode('powerUps')}
            >
              Power Ups Mode
            </button>
          </div>
          {isPowerUpsMode && (
            <p className="muted">
              Power Ups Mode deals one random power-up per golfer each hole and disables mission
              cards.
            </p>
          )}
        </div>

        <div className="stack-xs">
          <span className="label">Holes</span>
          <div className="button-row">
            <button
              type="button"
              className={config.holeCount === 9 ? 'button-primary' : ''}
              onClick={() => setHoleCount(9)}
            >
              9
            </button>
            <button
              type="button"
              className={config.holeCount === 18 ? 'button-primary' : ''}
              onClick={() => setHoleCount(18)}
            >
              18
            </button>
          </div>
        </div>

        <div className="stack-xs">
          <span className="label">Course Type</span>
          <div className="button-row">
            <button
              type="button"
              className={config.courseStyle === 'par3' ? 'button-primary' : ''}
              onClick={() => setCourseStyle('par3')}
            >
              Par 3
            </button>
            <button
              type="button"
              className={config.courseStyle === 'standard' ? 'button-primary' : ''}
              onClick={() => setCourseStyle('standard')}
            >
              Standard
            </button>
          </div>
        </div>
      </section>

      <section className="panel stack-xs">
        <div className="row-between">
          <h3>Golfers</h3>
          <span className="chip">
            {players.length} / {MAX_GOLFERS}
          </span>
        </div>
        <p className="muted">Add between 1 and 8 golfers.</p>

        <div className="stack-xs">
          {players.map((player, index) => (
            <PlayerSetupRow
              key={player.id}
              player={player}
              position={index + 1}
              canRemove={players.length > MIN_GOLFERS}
              onUpdateName={(name) => updatePlayerName(player.id, name)}
              onUpdateExpectedScore={(expectedScore) =>
                updatePlayerExpectedScore(player.id, expectedScore)
              }
              onRemove={() => removePlayer(player.id)}
            />
          ))}
        </div>

        <button type="button" onClick={addPlayer} disabled={players.length >= MAX_GOLFERS}>
          Add Golfer
        </button>
      </section>

      {!isPowerUpsMode && (
        <>
          <section className="panel stack-xs">
            <h3>Card Packs</h3>
            <p className="muted">Enable the game modes you want in this round.</p>

            <div className="stack-xs">
              {CARD_PACKS.map((pack) => (
                <CardPackToggleRow
                  key={pack.id}
                  pack={pack}
                  enabled={config.enabledPackIds.includes(pack.id)}
                  unlocked={isPackUnlocked(pack.id, pack.premiumTier)}
                  onToggle={(enabled) => setPackEnabled(pack.id, enabled)}
                  onOpenInfo={() => setActivePackInfoId(pack.id)}
                />
              ))}
            </div>
          </section>

          <section className="panel stack-xs">
            <h3>Game Options</h3>

            <ToggleRow
              label="Dynamic Difficulty"
              description="Weight challenge difficulty by expected score."
              checked={config.toggles.dynamicDifficulty}
              onChange={setDynamicDifficulty}
            />

            <ToggleRow
              label="Momentum Bonuses"
              description="Award streak bonuses for consecutive personal card success."
              checked={config.toggles.momentumBonuses}
              onChange={setMomentumBonuses}
            />

            <section className="stack-xs">
              <span className="label">Personal Card Mode</span>
              <div className="button-row">
                <button
                  type="button"
                  className={config.toggles.drawTwoPickOne ? 'button-primary' : ''}
                  onClick={() => setDealMode('drawTwoPickOne')}
                >
                  Draw 2 Pick 1
                </button>
                <button
                  type="button"
                  className={config.toggles.autoAssignOne ? 'button-primary' : ''}
                  onClick={() => setDealMode('autoAssignOne')}
                >
                  Auto-Assign 1
                </button>
              </div>
            </section>
          </section>

          <section className="panel stack-xs">
            <h3>Featured Holes</h3>

            <ToggleRow
              label="Enable Featured Holes"
              description="Add occasional special hole modifiers for pacing and excitement."
              checked={config.featuredHoles.enabled}
              onChange={setFeaturedHolesEnabled}
            />

            <section className="stack-xs">
              <span className="label">Frequency</span>
              <div className="button-row">
                {(['low', 'normal', 'high'] as const).map((frequency) => (
                  <button
                    key={frequency}
                    type="button"
                    className={config.featuredHoles.frequency === frequency ? 'button-primary' : ''}
                    onClick={() => setFeaturedHolesFrequency(frequency)}
                  >
                    {frequency === 'low' ? 'Low' : frequency === 'normal' ? 'Normal' : 'High'}
                  </button>
                ))}
              </div>
              <p className="muted">
                Target featured holes this round: {featuredHoleTargetCount}
              </p>
              <p className="muted">Auto spacing tries to keep featured holes spread out.</p>
            </section>

            <section className="stack-xs">
              <span className="label">Assignment Mode</span>
              <div className="button-row">
                <button
                  type="button"
                  className={config.featuredHoles.assignmentMode === 'auto' ? 'button-primary' : ''}
                  onClick={() => setFeaturedHolesAssignmentMode('auto')}
                >
                  Auto Assign
                </button>
                <button
                  type="button"
                  className={config.featuredHoles.assignmentMode === 'manual' ? 'button-primary' : ''}
                  onClick={() => setFeaturedHolesAssignmentMode('manual')}
                >
                  Manual Assign
                </button>
              </div>
              {config.featuredHoles.assignmentMode === 'manual' && (
                <p className="muted">
                  Manual assignment editor is scaffolded in v1. Existing manual picks are preserved;
                  otherwise the app uses an auto-spaced baseline.
                </p>
              )}
            </section>

            {config.featuredHoles.enabled && (
              <section className="stack-xs">
                <span className="label">Current Featured Holes</span>
                {featuredHoles.length > 0 ? (
                  <div className="stack-xs">
                    {featuredHoles.map((hole) => {
                      const featuredHoleType = hole.featuredHoleType
                      if (!featuredHoleType) {
                        return null
                      }

                      const featuredHole = FEATURED_HOLES_BY_ID[featuredHoleType]

                      return (
                        <div key={hole.holeNumber} className="featured-hole-preview-row">
                          <div className="row-between">
                            <strong>Hole {hole.holeNumber}</strong>
                            <span className="chip featured-hole-chip">{featuredHole.name}</span>
                          </div>
                          <p className="muted">{featuredHole.quickRule}</p>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="muted">No featured holes assigned for current settings.</p>
                )}
              </section>
            )}
          </section>
        </>
      )}

      <section className="panel stack-xs">
        <button type="button" className="button-primary" onClick={beginRound}>
          Begin Round
        </button>
      </section>

      {!isPowerUpsMode && activePackInfo && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setActivePackInfoId(null)}
        >
          <section
            className="panel modal-card stack-xs"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pack-info-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="row-between">
              <h3 id="pack-info-title">{activePackInfo.name}</h3>
              <button type="button" onClick={() => setActivePackInfoId(null)}>
                Close
              </button>
            </div>

            <p>{activePackInfo.longDescription}</p>
            <p className="muted">Includes: {activePackInfo.includesLabel}</p>
            <p className="muted">Best for: {activePackInfo.bestForLabel}</p>
            <div className="stack-xs">
              {activePackInfo.gameplayNotes.map((note) => (
                <p key={note} className="muted">
                  - {note}
                </p>
              ))}
            </div>
            <p className="muted">
              Premium-ready: {activePackInfo.isPremium ? 'Yes' : 'No'}
              {activePackInfo.premiumTier ? ` (${activePackInfo.premiumTier})` : ''}
            </p>
          </section>
        </div>
      )}
    </section>
  )
}

export default RoundSetupScreen
