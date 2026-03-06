import HoleSetupCard from '../components/HoleSetupCard.tsx'
import PlayerSetupRow from '../components/PlayerSetupRow.tsx'
import ToggleRow from '../components/ToggleRow.tsx'
import {
  applyCourseStyle,
  applyRoundSetupDraft,
  DEFAULT_EXPECTED_SCORE,
  MAX_GOLFERS,
  MIN_GOLFERS,
  normalizeExpectedScore,
  normalizePar,
  resizeHoles,
  toggleHoleTag,
  type RoundSetupDraft,
} from '../logic/roundSetup.ts'
import type { CourseStyle, HoleCount, Player } from '../types/game.ts'
import type { ScreenProps } from './types.ts'

function createDraftId(position: number): string {
  const timestamp = Date.now().toString(36)
  return `player-${position}-${timestamp}`
}

function RoundSetupScreen({ roundState, onUpdateRoundState }: ScreenProps) {
  const { config, holes, players } = roundState

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

  const setHolePar = (holeNumber: number, par: number) => {
    updateSetup((draft) => ({
      ...draft,
      holes: draft.holes.map((hole) =>
        hole.holeNumber === holeNumber
          ? {
              ...hole,
              par: normalizePar(par),
            }
          : hole,
      ),
    }))
  }

  const setHoleTag = (holeNumber: number, tag: Parameters<typeof toggleHoleTag>[1]) => {
    updateSetup((draft) => ({
      ...draft,
      holes: draft.holes.map((hole) =>
        hole.holeNumber === holeNumber
          ? {
              ...hole,
              tags: toggleHoleTag(hole.tags, tag),
            }
          : hole,
      ),
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

  const setToggle = (toggle: 'dynamicDifficulty' | 'enableChaosCards' | 'enablePropCards') => {
    updateSetup((draft) => ({
      ...draft,
      config: {
        ...draft.config,
        toggles: {
          ...draft.config.toggles,
          [toggle]: !draft.config.toggles[toggle],
        },
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

  return (
    <section className="screen stack-sm">
      <header className="screen__header">
        <h2>Round Setup</h2>
        <p className="muted">
          Configure holes, players, and game options before starting the round.
        </p>
      </header>

      <section className="panel stack-xs">
        <h3>Round Basics</h3>
        <p className="muted">Select hole count and course type.</p>

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
            <button
              type="button"
              className={config.courseStyle === 'custom' ? 'button-primary' : ''}
              onClick={() => setCourseStyle('custom')}
            >
              Custom
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

      <section className="panel stack-xs">
        <h3>Hole Pars & Tags</h3>
        <p className="muted">Edit each hole par and optional tags.</p>

        <div className="hole-list">
          {holes.map((hole) => (
            <HoleSetupCard
              key={hole.holeNumber}
              hole={hole}
              onUpdatePar={(par) => setHolePar(hole.holeNumber, par)}
              onToggleTag={(tag) => setHoleTag(hole.holeNumber, tag)}
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
          onChange={() => setToggle('dynamicDifficulty')}
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

        <ToggleRow
          label="Chaos Cards"
          description="Enable optional public chaos cards."
          checked={config.toggles.enableChaosCards}
          onChange={() => setToggle('enableChaosCards')}
        />

        <ToggleRow
          label="Prop Cards"
          description="Enable optional prediction prop cards."
          checked={config.toggles.enablePropCards}
          onChange={() => setToggle('enablePropCards')}
        />
      </section>
    </section>
  )
}

export default RoundSetupScreen
