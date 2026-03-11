import { useState } from 'react'
import { ICONS } from '../app/icons.ts'
import CardPackToggleRow from '../components/CardPackToggleRow.tsx'
import GameModePresetRow from '../components/GameModePresetRow.tsx'
import PlayerSetupRow from '../components/PlayerSetupRow.tsx'
import ToggleRow from '../components/ToggleRow.tsx'
import { CARD_PACKS, CARD_PACKS_BY_ID } from '../data/cardPacks.ts'
import {
  GAME_MODE_FEATURES_BY_ID,
  GAME_MODE_PRESETS,
  GAME_MODE_PRESETS_BY_ID,
} from '../data/gameModePresets.ts'
import { FEATURED_HOLES_BY_ID } from '../data/featuredHoles.ts'
import { isPackUnlocked } from '../logic/entitlements.ts'
import { getFeaturedHoleTargetCount } from '../logic/featuredHoles.ts'
import { applyGameModePreset } from '../logic/gameModePresets.ts'
import { applyQuickRoundDefaults } from '../logic/quickRound.ts'
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
  FeaturedHoleFrequency,
  GameModePresetId,
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
  const [activePresetInfoId, setActivePresetInfoId] = useState<GameModePresetId | null>(null)
  const [advancedVisible, setAdvancedVisible] = useState(false)
  const { config, players } = roundState
  const isCustomPreset = config.selectedPresetId === 'custom'

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

  const setPreset = (presetId: GameModePresetId) => {
    updateSetup((draft) => ({
      ...draft,
      config: applyGameModePreset(draft.config, presetId),
    }))
  }

  const setPartyPackMode = (mode: 'chaos' | 'props') => {
    updateSetup((draft) => ({
      ...draft,
      config: {
        ...draft.config,
        selectedPresetId: 'party',
        enabledPackIds: mode === 'props' ? ['classic', 'props'] : ['classic', 'chaos'],
      },
    }))
  }

  const setCustomModeName = (customModeName: string) => {
    updateSetup((draft) => ({
      ...draft,
      config: {
        ...draft.config,
        selectedPresetId: 'custom',
        customModeName,
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
        selectedPresetId: 'custom',
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
        selectedPresetId: 'custom',
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
        selectedPresetId: 'custom',
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
        selectedPresetId: 'custom',
        featuredHoles: {
          ...draft.config.featuredHoles,
          frequency,
        },
      },
    }))
  }

  const setPackEnabled = (packId: CardPackId, enabled: boolean) => {
    updateSetup((draft) => ({
      ...draft,
      config: {
        ...draft.config,
        selectedPresetId: 'custom',
        enabledPackIds: toggleEnabledPack(draft.config.enabledPackIds, packId, enabled),
      },
    }))
  }

  const setDealMode = (mode: 'drawTwoPickOne' | 'autoAssignOne') => {
    updateSetup((draft) => ({
      ...draft,
      config: {
        ...draft.config,
        selectedPresetId: 'custom',
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

  const startQuickRound = () => {
    onUpdateRoundState((currentState) => applyQuickRoundDefaults(currentState))
    onNavigate('holePlay')
  }

  const activePackInfo = activePackInfoId ? CARD_PACKS_BY_ID[activePackInfoId] ?? null : null
  const activePresetInfo = activePresetInfoId ? GAME_MODE_PRESETS_BY_ID[activePresetInfoId] : null
  const featuredHoles = roundState.holes.filter((hole) => hole.featuredHoleType !== null)
  const partyPackMode: 'chaos' | 'props' =
    config.enabledPackIds.includes('props') && !config.enabledPackIds.includes('chaos')
      ? 'props'
      : 'chaos'
  const featuredHoleTargetCount = getFeaturedHoleTargetCount(
    config.holeCount,
    config.featuredHoles.frequency,
  )

  return (
    <section className="screen stack-sm round-setup-screen">
      <header className="screen__header round-setup-header">
        <div className="screen-title">
          <img className="screen-title__icon" src={ICONS.roundSetup} alt="" aria-hidden="true" />
          <h2>Round Setup</h2>
        </div>
        <p className="muted round-setup-header__support">
          Start fast with Quick Round, or fine-tune the round below.
        </p>
      </header>

      <section className="panel stack-sm setup-quick-card">
        <div className="row-between setup-row-wrap">
          <h3 className="step-title">
            <img className="step-title__icon" src={ICONS.teeOff} alt="" aria-hidden="true" />
            Quick Round
          </h3>
          <span className="chip setup-quick-card__chip">Recommended</span>
        </div>
        <p className="setup-quick-summary">9 holes • standard course • Core Pack defaults</p>
        <p className="muted">Core Pack only, auto-assigned cards, and no featured holes.</p>
        <button
          type="button"
          className="button-primary setup-quick-card__cta"
          onClick={startQuickRound}
        >
          Start Quick Round
        </button>
      </section>

      <section className="setup-advanced-divider">
        <p className="label">Advanced Setup</p>
        <p className="muted">
          Customize your round with the sections below.
        </p>
      </section>

      <section className="panel stack-sm setup-step setup-step--basics">
        <header className="setup-step__header">
          <h3 className="step-title">
            <img className="step-title__icon" src={ICONS.roundSetup} alt="" aria-hidden="true" />
            1. Round Basics
          </h3>
          <p className="muted setup-step__support">Select hole count and course type.</p>
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
              <img className="step-title__icon" src={ICONS.golfers} alt="" aria-hidden="true" />
              2. Golfers
            </h3>
            <span className="chip setup-step__count-chip">
              {players.length} / {MAX_GOLFERS}
            </span>
          </div>
          <p className="muted setup-step__support">Add between 1 and 8 golfers.</p>
        </header>

        <div className="stack-xs setup-player-list">
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

        <button
          type="button"
          className="round-setup-add-player"
          onClick={addPlayer}
          disabled={players.length >= MAX_GOLFERS}
        >
          Add Golfer
        </button>
      </section>

      <section className="panel stack-sm setup-step setup-step--mode">
        <header className="setup-step__header">
          <h3 className="step-title">
            <img className="step-title__icon" src={ICONS.gameOptions} alt="" aria-hidden="true" />
            3. Game Mode Selection
          </h3>
          <p className="muted setup-step__support">
            Choose a mode. Tap the info button for details.
          </p>
        </header>

        <div className="stack-xs round-setup-mode-list">
          {GAME_MODE_PRESETS.map((preset) => (
            <GameModePresetRow
              key={preset.id}
              preset={preset}
              selected={config.selectedPresetId === preset.id}
              onSelect={() => setPreset(preset.id)}
              onOpenInfo={() => setActivePresetInfoId(preset.id)}
            />
          ))}
        </div>
      </section>

      {config.selectedPresetId === 'party' && (
        <section className="panel stack-sm setup-step">
          <header className="setup-step__header">
            <h3 className="step-title">
              <img className="step-title__icon" src={ICONS.gameOptions} alt="" aria-hidden="true" />
              Party Lane
            </h3>
            <p className="muted setup-step__support">
              Choose which public-card mode to run in Party Pack.
            </p>
          </header>

          <section className="setup-control-group">
            <span className="label setup-control-label">Party Mode</span>
            <div className="segmented-control" role="group" aria-label="Party pack mode">
              <button
                type="button"
                className={`segmented-control__button ${
                  partyPackMode === 'chaos' ? 'segmented-control__button--active' : ''
                }`}
                onClick={() => setPartyPackMode('chaos')}
              >
                Chaos
              </button>
              <button
                type="button"
                className={`segmented-control__button ${
                  partyPackMode === 'props' ? 'segmented-control__button--active' : ''
                }`}
                onClick={() => setPartyPackMode('props')}
              >
                Props
              </button>
            </div>
            <p className="muted">
              {partyPackMode === 'chaos'
                ? 'Chaos mode adds one swingy public modifier card per hole.'
                : 'Props mode adds one prediction-style public card per hole.'}
            </p>
          </section>
        </section>
      )}

      {config.selectedPresetId === 'powerUps' && (
        <section className="panel stack-sm setup-step">
          <header className="setup-step__header">
            <h3 className="step-title">
              <img className="step-title__icon" src={ICONS.holePlay} alt="" aria-hidden="true" />
              Power Up / Curse Pack
            </h3>
          </header>
          <p className="muted">
            Lightweight standalone mode: no card packs, no public-card resolution, and no featured
            holes.
          </p>
          <p className="muted">
            Each golfer receives one random power-up per hole and can use it once before scoring.
          </p>
          <p className="muted">
            Hole 1 gives everyone a positive power-up. From hole 2 onward, everyone still gets a
            positive power-up and previous-hole winner(s) also receive one curse restriction.
          </p>
        </section>
      )}

      {isCustomPreset && (
        <>
          <section className="panel stack-sm setup-step setup-step--advanced">
            <div className="row-between setup-row-wrap">
              <h3 className="step-title">
                <img className="step-title__icon" src={ICONS.customPack} alt="" aria-hidden="true" />
                4. Advanced Options
              </h3>
              <button
                type="button"
                className={advancedVisible ? 'button-primary setup-advanced-toggle' : 'setup-advanced-toggle'}
                onClick={() => setAdvancedVisible((current) => !current)}
                aria-expanded={advancedVisible}
                aria-controls="advanced-setup-options"
              >
                {advancedVisible ? 'Hide Advanced' : 'Show Advanced'}
              </button>
            </div>
            <p className="muted setup-step__support">
              Custom pack selection and fine-grained toggles are hidden by default to keep setup
              fast.
            </p>
          </section>

          {advancedVisible && (
            <div
              id="advanced-setup-options"
              className="stack-xs setup-advanced-stack"
              role="region"
              aria-label="Advanced setup options"
            >
              <section className="panel stack-sm setup-step">
                <header className="setup-step__header">
                  <h3 className="step-title">
                    <img className="step-title__icon" src={ICONS.customPack} alt="" aria-hidden="true" />
                    Custom Mode
                  </h3>
                  <p className="muted setup-step__support">Customize this round only.</p>
                </header>

                <label className="field">
                  <span className="label">Custom Mode Name</span>
                  <input
                    type="text"
                    value={config.customModeName}
                    onChange={(event) => setCustomModeName(event.target.value)}
                    placeholder="My Custom Mode"
                  />
                </label>
              </section>

              <section className="panel stack-sm setup-step">
                <header className="setup-step__header">
                  <h3 className="step-title">
                    <img className="step-title__icon" src={ICONS.customPack} alt="" aria-hidden="true" />
                    Card Packs
                  </h3>
                  <p className="muted setup-step__support">
                    Enable the game modes you want in this round.
                  </p>
                </header>

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

              <section className="panel stack-sm setup-step">
                <header className="setup-step__header">
                  <h3 className="step-title">
                    <img className="step-title__icon" src={ICONS.gameOptions} alt="" aria-hidden="true" />
                    Game Options
                  </h3>
                </header>

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
                {config.toggles.momentumBonuses && (
                  <p className="muted">
                    Momentum is automatic: consecutive Completed results increase bonus tiers over
                    time.
                  </p>
                )}

                <section className="setup-control-group">
                  <span className="label setup-control-label">Personal Card Mode</span>
                  <div className="segmented-control" role="group" aria-label="Personal card mode">
                    <button
                      type="button"
                      className={`segmented-control__button ${
                        config.toggles.drawTwoPickOne ? 'segmented-control__button--active' : ''
                      }`}
                      onClick={() => setDealMode('drawTwoPickOne')}
                    >
                      Draw 2 Pick 1
                    </button>
                    <button
                      type="button"
                      className={`segmented-control__button ${
                        config.toggles.autoAssignOne ? 'segmented-control__button--active' : ''
                      }`}
                      onClick={() => setDealMode('autoAssignOne')}
                    >
                      Auto-Assign 1
                    </button>
                  </div>
                </section>
              </section>

              <section className="panel stack-sm setup-step">
                <header className="setup-step__header">
                  <h3 className="step-title">
                    <img className="step-title__icon" src={ICONS.golfFlag} alt="" aria-hidden="true" />
                    Featured Holes
                  </h3>
                </header>

                <ToggleRow
                  label="Enable Featured Holes"
                  description="Add occasional special hole modifiers for pacing and excitement."
                  checked={config.featuredHoles.enabled}
                  onChange={setFeaturedHolesEnabled}
                />

                <section className="setup-control-group">
                  <span className="label setup-control-label">Frequency</span>
                  <div className="segmented-control segmented-control--three" role="group" aria-label="Featured hole frequency">
                    {(['low', 'normal', 'high'] as const).map((frequency) => (
                      <button
                        key={frequency}
                        type="button"
                        className={`segmented-control__button ${
                          config.featuredHoles.frequency === frequency
                            ? 'segmented-control__button--active'
                            : ''
                        }`}
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
            </div>
          )}
        </>
      )}

      <section className="panel stack-xs setup-cta">
        <p className="muted setup-cta__support">Ready when you are.</p>
        <button type="button" className="button-primary setup-cta__button" onClick={beginRound}>
          Start Round
        </button>
      </section>

      {isCustomPreset && activePackInfo && (
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

      {activePresetInfo && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setActivePresetInfoId(null)}
        >
          <section
            className="panel modal-card stack-xs"
            role="dialog"
            aria-modal="true"
            aria-labelledby="preset-info-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="row-between">
              <h3 id="preset-info-title">{activePresetInfo.name}</h3>
              <button type="button" onClick={() => setActivePresetInfoId(null)}>
                Close
              </button>
            </div>

            <p>{activePresetInfo.longDescription}</p>
            <p className="muted">Includes: {activePresetInfo.includesLabel}</p>
            <p className="muted">Best for: {activePresetInfo.bestForLabel}</p>
            <p className="muted">Preset type: {activePresetInfo.settings ? 'Auto-configured' : 'Customizable'}</p>

            <section className="stack-xs">
              <span className="label">Included Modes</span>
              {activePresetInfo.includedFeatureIds.map((featureId) => {
                const feature = GAME_MODE_FEATURES_BY_ID[featureId]

                return (
                  <div key={feature.id} className="preset-feature-row">
                    <strong>{feature.name}</strong>
                    <p className="muted">{feature.shortDescription}</p>
                  </div>
                )
              })}
            </section>
          </section>
        </div>
      )}
    </section>
  )
}

export default RoundSetupScreen
