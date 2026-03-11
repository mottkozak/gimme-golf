import { useState } from 'react'
import { ICONS } from '../app/icons.ts'
import GameModePresetRow from '../components/GameModePresetRow.tsx'
import PlayerSetupRow from '../components/PlayerSetupRow.tsx'
import {
  GAME_MODE_FEATURES_BY_ID,
  GAME_MODE_PRESETS_BY_ID,
  getSetupPresetCollection,
} from '../data/gameModePresets.ts'
import {
  formatOfferPointRangeLabel,
  getOfferPointRange,
} from '../logic/gameBalance.ts'
import { applyGameModePreset } from '../logic/gameModePresets.ts'
import {
  trackPresetSelected,
  trackRoundSetupCompleted,
  trackRoundStarted,
} from '../logic/analytics.ts'
import { loadLocalIdentityState } from '../logic/localIdentity.ts'
import { applyQuickRoundDefaults } from '../logic/quickRound.ts'
import { hasRoundProgress } from '../logic/roundProgress.ts'
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
import type {
  CourseStyle,
  GameModePresetId,
  HoleCount,
  Player,
} from '../types/game.ts'
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

function RoundSetupScreen({ roundState, hasSavedRound, onNavigate, onUpdateRoundState }: ScreenProps) {
  const [activePresetInfoId, setActivePresetInfoId] = useState<GameModePresetId | null>(null)
  const [showOtherPresetModes, setShowOtherPresetModes] = useState(false)
  const [localIdentityState] = useState(() => loadLocalIdentityState())
  const { config, players } = roundState

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

  const setPreset = (presetId: GameModePresetId, source: 'recommended_card' | 'preset_row') => {
    if (config.selectedPresetId !== presetId) {
      const nextConfig = applyGameModePreset(roundState.config, presetId)
      trackPresetSelected(
        {
          ...roundState,
          config: nextConfig,
        },
        presetId,
        source,
      )
    }

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

  const startQuickRound = () => {
    const quickStartRoundState = applyQuickRoundDefaults(roundState)
    trackRoundSetupCompleted(quickStartRoundState, 'quick_defaults_start')
    trackRoundStarted(quickStartRoundState, 'setup_quick_round')
    onUpdateRoundState((currentState) => applyQuickRoundDefaults(currentState))
    onNavigate('holePlay')
  }

  const activePresetInfo = activePresetInfoId ? GAME_MODE_PRESETS_BY_ID[activePresetInfoId] ?? null : null
  const setupPresetCollection = getSetupPresetCollection()
  const recommendedPreset = setupPresetCollection.recommendedPreset
  const alternatePresetModes = setupPresetCollection.browsePresets
  const activePresetCandidate = GAME_MODE_PRESETS_BY_ID[config.selectedPresetId] ?? recommendedPreset
  const activePreset =
    activePresetCandidate.setupVisibility === 'visible' ? activePresetCandidate : recommendedPreset
  const isRecommendedPresetSelected = activePreset.id === recommendedPreset.id
  const shouldShowOtherPresetModes = showOtherPresetModes || !isRecommendedPresetSelected
  const dynamicDifficultyStatusLabel = config.toggles.dynamicDifficulty ? 'On' : 'Off'
  const drawModeStatusLabel = config.toggles.drawTwoPickOne ? 'Pick 1 of 2' : 'Auto-pick 1'
  const advancedSafeRangeLabel = formatOfferPointRangeLabel(getOfferPointRange(80, true, 'safe'))
  const advancedHardRangeLabel = formatOfferPointRangeLabel(getOfferPointRange(80, true, 'hard'))
  const intermediateSafeRangeLabel = formatOfferPointRangeLabel(
    getOfferPointRange(92, true, 'safe'),
  )
  const intermediateHardRangeLabel = formatOfferPointRangeLabel(
    getOfferPointRange(92, true, 'hard'),
  )
  const developingSafeRangeLabel = formatOfferPointRangeLabel(
    getOfferPointRange(112, true, 'safe'),
  )
  const developingHardRangeLabel = formatOfferPointRangeLabel(
    getOfferPointRange(112, true, 'hard'),
  )
  const hasPublicCardLaneEnabled =
    config.gameMode === 'cards' &&
    (config.enabledPackIds.includes('chaos') || config.enabledPackIds.includes('props'))
  const publicCardsStatusLabel = hasPublicCardLaneEnabled ? 'On' : 'Off'
  const featuredHolesStatusLabel = config.featuredHoles.enabled
    ? `On (${config.featuredHoles.frequency})`
    : 'Off'
  const partyPackMode: 'chaos' | 'props' =
    config.enabledPackIds.includes('props') && !config.enabledPackIds.includes('chaos')
      ? 'props'
      : 'chaos'
  const recentPlayerNameSuggestions = localIdentityState.recentPlayerNames.slice(0, 8)
  const recentGroupNames = localIdentityState.roundHistory[0]?.playerNames ?? []
  const hasSavedPlayerShortcuts =
    recentGroupNames.length > 0 || recentPlayerNameSuggestions.length > 0
  const isReplayReadySetup = hasSavedRound && !hasRoundProgress(roundState)

  return (
    <section className="screen stack-sm round-setup-screen">
      <header className="screen__header round-setup-header">
        <div className="screen-title">
          <img className="screen-title__icon" src={ICONS.roundSetup} alt="" aria-hidden="true" />
          <h2>Round Setup</h2>
        </div>
        <p className="muted round-setup-header__support">
          {isReplayReadySetup
            ? 'Same golfers and mode are loaded. Start now, or tweak one setting before teeing off.'
            : 'Set this once, then each hole follows the same simple play-to-results loop.'}
        </p>
      </header>

      {isReplayReadySetup && (
        <section className="panel inset stack-xs setup-replay-ready">
          <div className="row-between setup-row-wrap">
            <p className="label">Replay Ready</p>
            <span className="chip">Saved Locally</span>
          </div>
          <p className="muted">
            {players.length} golfer{players.length === 1 ? '' : 's'} are preloaded from your last
            round. Keep this mode for a fast run-it-back, or adjust options below.
          </p>
        </section>
      )}

      <section className="panel stack-xs setup-round-preview">
        <p className="label">Round Snapshot</p>
        <p className="setup-round-preview__summary">
          {players.length} golfer{players.length === 1 ? '' : 's'} • {config.holeCount} holes • {activePreset.name}
        </p>
        <p className="muted">
          {activePreset.shortDescription}
        </p>
      </section>

      <section className="panel stack-sm setup-quick-card">
        <div className="row-between setup-row-wrap">
          <h3 className="step-title">
            <img className="step-title__icon" src={ICONS.teeOff} alt="" aria-hidden="true" />
            Quick Round
          </h3>
          <span className="chip setup-quick-card__chip">Recommended</span>
        </div>
        <p className="setup-quick-summary">9 holes • standard course • Quick Start preset</p>
        <p className="muted">
          Fastest way to tee off with a mixed-skill group. Save customization for round two.
        </p>
        <button
          type="button"
          className="setup-quick-card__cta"
          onClick={startQuickRound}
        >
          Use Quick Defaults & Start
        </button>
      </section>

      <section className="setup-advanced-divider">
        <p className="label">Customize (Optional)</p>
        <p className="muted">
          Skip anything you do not need. Defaults are ready to play.
        </p>
      </section>

      <section className="panel stack-sm setup-step setup-step--basics">
        <header className="setup-step__header">
          <h3 className="step-title">
            <img className="step-title__icon" src={ICONS.roundSetup} alt="" aria-hidden="true" />
            1. Round Basics
          </h3>
          <p className="muted setup-step__support">Keep defaults unless your course format is different today.</p>
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
          <p className="muted setup-step__support">
            Add 1-8 golfers. Expected score helps mixed-skill fairness by tuning offer upside only.
            Real golf strokes are never edited.
          </p>
        </header>

        <section className="panel inset stack-xs setup-fairness-card" aria-label="Mixed-skill fairness">
          <div className="row-between setup-row-wrap">
            <p className="label">Mixed-Skill Fair Play</p>
            <span className="chip">Dynamic Difficulty</span>
          </div>
          <p className="muted">
            Draw 2 Pick 1 offers a safer line and an upside line per golfer, based on expected score.
          </p>
          <div className="stack-xs setup-fairness-card__bands">
            <p className="muted">
              <strong>Advanced (72-85):</strong> Safe {advancedSafeRangeLabel} • Upside {advancedHardRangeLabel}
            </p>
            <p className="muted">
              <strong>Intermediate (86-100):</strong> Safe {intermediateSafeRangeLabel} • Upside {intermediateHardRangeLabel}
            </p>
            <p className="muted">
              <strong>Developing (101+):</strong> Safe {developingSafeRangeLabel} • Upside {developingHardRangeLabel}
            </p>
          </div>
        </section>

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
            <p className="muted">Tap a saved name to fill the next open golfer slot.</p>
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
            3. Game Mode
          </h3>
          <p className="muted setup-step__support">
            Start with one obvious default, then explore more only if your group wants it.
          </p>
        </header>

        <section
          className={`panel inset stack-xs setup-mode-recommended ${
            isRecommendedPresetSelected ? 'setup-mode-recommended--selected' : ''
          }`}
        >
          <div className="row-between setup-row-wrap">
            <p className="label">Best First Round</p>
            <span className="chip">
              {isRecommendedPresetSelected ? 'Selected' : 'Recommended'}
            </span>
          </div>
          <h4 className="setup-mode-recommended__title">{recommendedPreset.name}</h4>
          <p className="muted">{recommendedPreset.shortDescription}</p>
          <p className="muted">Includes: {recommendedPreset.includesLabel}</p>
          <button
            type="button"
            className={isRecommendedPresetSelected ? 'setup-mode-recommended__button' : 'button-primary setup-mode-recommended__button'}
            onClick={() => setPreset(recommendedPreset.id, 'recommended_card')}
            disabled={isRecommendedPresetSelected}
          >
            {isRecommendedPresetSelected ? 'Using Recommended Mode' : 'Use Recommended Mode'}
          </button>
        </section>

        <section className="panel inset stack-xs setup-mode-guidance" aria-label="Mode setting guidance">
          <p className="label">What This Changes</p>
          <p className="muted">
            You do not need to master every system now. These labels explain what happens in play.
          </p>
          <ul className="list-reset setup-mode-guidance__list">
            <li className="setup-mode-guidance__item">
              <div className="row-between setup-row-wrap">
                <strong>Dynamic Difficulty</strong>
                <span className="chip">{dynamicDifficultyStatusLabel}</span>
              </div>
              <p className="muted">
                Uses expected score to set fair offer ceilings: stronger golfers get lower-upside offers,
                developing golfers get more comeback upside.
              </p>
            </li>
            <li className="setup-mode-guidance__item">
              <div className="row-between setup-row-wrap">
                <strong>Deal Style</strong>
                <span className="chip">{drawModeStatusLabel}</span>
              </div>
              <p className="muted">
                Pick 1 of 2 shows a Safe line (lower upside) and an Upside line (riskier reward).
                Auto-pick keeps pace fastest.
              </p>
            </li>
            <li className="setup-mode-guidance__item">
              <div className="row-between setup-row-wrap">
                <strong>Public Cards</strong>
                <span className="chip">{publicCardsStatusLabel}</span>
              </div>
              <p className="muted">Mostly used in Party mode for extra group interaction and swings.</p>
            </li>
            <li className="setup-mode-guidance__item">
              <div className="row-between setup-row-wrap">
                <strong>Featured Holes</strong>
                <span className="chip">{featuredHolesStatusLabel}</span>
              </div>
              <p className="muted">Special holes add personality. Off/Low is easiest for a first round.</p>
            </li>
          </ul>
        </section>

        <section className="stack-xs">
          <button
            type="button"
            className={shouldShowOtherPresetModes ? 'button-primary setup-mode-browse' : 'setup-mode-browse'}
            onClick={() => setShowOtherPresetModes((current) => !current)}
            aria-expanded={shouldShowOtherPresetModes}
            aria-controls="setup-mode-options"
          >
            {shouldShowOtherPresetModes ? 'Hide Other Modes' : 'Browse Other Modes'}
          </button>
          {!shouldShowOtherPresetModes && (
            <p className="muted">Most groups can skip this and start with Quick Start.</p>
          )}
        </section>

        {shouldShowOtherPresetModes && (
          <div id="setup-mode-options" className="stack-xs round-setup-mode-list">
            {alternatePresetModes.map((preset) => (
              <GameModePresetRow
                key={preset.id}
                preset={preset}
                selected={config.selectedPresetId === preset.id}
                onSelect={() => setPreset(preset.id, 'preset_row')}
                onOpenInfo={() => setActivePresetInfoId(preset.id)}
              />
            ))}
          </div>
        )}

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
            positive power-up except current round leader(s), who instead receive one curse restriction.
          </p>
        </section>
      )}

      <section className="panel stack-xs setup-cta">
        <p className="muted setup-cta__support">Next step: Hole 1 setup and deal.</p>
        <button type="button" className="button-primary setup-cta__button" onClick={beginRound}>
          Start Round
        </button>
      </section>

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
                if (!feature) {
                  return null
                }

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
