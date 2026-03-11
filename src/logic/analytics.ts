import { formatPlayerNames } from './playerNames.ts'
import { buildLeaderboardEntries } from './leaderboard.ts'
import type { AppScreen } from '../app/router.tsx'
import type { GameModePresetId, RoundState } from '../types/game.ts'

type SummaryScreenName = 'leaderboard' | 'end_round'
type HomeActionName =
  | 'continue_round'
  | 'start_quick_round'
  | 'start_full_setup'
  | 'abandon_round'
  | 'replay_tutorial'
type RoundStartSource =
  | 'home_quick_round'
  | 'setup_quick_round'
  | 'setup_start_round'
  | 'end_round_run_it_back'
type PresetSelectionSource = 'recommended_card' | 'preset_row' | 'custom_section'
type ScoreInputMethod =
  | 'quick_button'
  | 'high_button'
  | 'adjust_minus'
  | 'adjust_plus'
  | 'quick_9_plus'
  | 'manual_input'
  | 'manual_reset'
type PublicResolutionAction =
  | 'trigger_toggle'
  | 'winner_select'
  | 'vote_target_select'
  | 'affected_toggle'
  | 'effect_select'
type RecapShareOutcome = 'shared' | 'copied' | 'downloaded' | 'cancelled' | 'error' | 'unsupported'

export interface RoundAnalyticsContext {
  selectedMode: GameModePresetId
  gameMode: RoundState['config']['gameMode']
  playerCount: number
  holeCount: RoundState['config']['holeCount']
  currentHoleNumber: number
  dynamicDifficulty: boolean
  momentumBonuses: boolean
  chaosEnabled: boolean
  propsEnabled: boolean
  featuredHolesEnabled: boolean
  drawTwoPickOne: boolean
  autoAssignOne: boolean
}

export interface AnalyticsEventPayloadByName {
  home_action: {
    action: HomeActionName
    hasSavedRound: boolean
    currentScreen: AppScreen
  }
  round_started: {
    source: RoundStartSource
    round: RoundAnalyticsContext
  }
  round_resumed: {
    source: 'home_continue'
    resumeScreen: AppScreen
    round: RoundAnalyticsContext
  }
  round_abandoned: {
    source: 'home_danger_zone'
    abandonmentPoint: AppScreen
    round: RoundAnalyticsContext
  }
  preset_selected: {
    presetId: GameModePresetId
    source: PresetSelectionSource
    round: RoundAnalyticsContext
  }
  round_setup_completed: {
    source: 'start_round' | 'quick_defaults_start'
    round: RoundAnalyticsContext
  }
  hole_started: {
    holeNumber: number
    wasPrepared: boolean
    round: RoundAnalyticsContext
  }
  card_selected: {
    holeNumber: number
    playerId: string
    cardId: string
    round: RoundAnalyticsContext
  }
  score_entered: {
    holeNumber: number
    playerId: string
    strokes: number | null
    inputMethod: ScoreInputMethod
    round: RoundAnalyticsContext
  }
  public_card_resolution: {
    holeNumber: number
    cardId: string
    action: PublicResolutionAction
    round: RoundAnalyticsContext
  }
  hole_completed: {
    holeNumber: number
    round: RoundAnalyticsContext
  }
  round_completed: {
    winnerNames: string
    round: RoundAnalyticsContext
  }
  awards_viewed: {
    section: 'signature' | 'additional'
    awardCount: number
    round: RoundAnalyticsContext
  }
  summary_screen_viewed: {
    screen: SummaryScreenName
    holeNumber: number
    round: RoundAnalyticsContext
  }
  recap_share_action: {
    outcome: RecapShareOutcome
    round: RoundAnalyticsContext
  }
}

export type AnalyticsEventName = keyof AnalyticsEventPayloadByName

export interface AnalyticsEvent<Name extends AnalyticsEventName = AnalyticsEventName> {
  name: Name
  payload: AnalyticsEventPayloadByName[Name]
  atMs: number
}

export type AnyAnalyticsEvent = {
  [Name in AnalyticsEventName]: AnalyticsEvent<Name>
}[AnalyticsEventName]

export interface AnalyticsProvider {
  track: (event: AnyAnalyticsEvent) => void | Promise<void>
}

const isDevEnvironment = Boolean(
  (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV,
)

const NOOP_ANALYTICS_PROVIDER: AnalyticsProvider = {
  track: () => {},
}

const DEV_CONSOLE_ANALYTICS_PROVIDER: AnalyticsProvider = {
  track: (event) => {
    if (!isDevEnvironment) {
      return
    }

    console.info('[analytics]', event.name, event.payload)
  },
}

let activeAnalyticsProvider: AnalyticsProvider = DEV_CONSOLE_ANALYTICS_PROVIDER

export function setAnalyticsProvider(provider: AnalyticsProvider | null): void {
  activeAnalyticsProvider = provider ?? NOOP_ANALYTICS_PROVIDER
}

export function resetAnalyticsProvider(): void {
  activeAnalyticsProvider = DEV_CONSOLE_ANALYTICS_PROVIDER
}

export function buildRoundAnalyticsContext(roundState: RoundState): RoundAnalyticsContext {
  return {
    selectedMode: roundState.config.selectedPresetId,
    gameMode: roundState.config.gameMode,
    playerCount: roundState.players.length,
    holeCount: roundState.config.holeCount,
    currentHoleNumber: roundState.holes[roundState.currentHoleIndex]?.holeNumber ?? 1,
    dynamicDifficulty: roundState.config.toggles.dynamicDifficulty,
    momentumBonuses: roundState.config.toggles.momentumBonuses,
    chaosEnabled: roundState.config.toggles.enableChaosCards,
    propsEnabled: roundState.config.toggles.enablePropCards,
    featuredHolesEnabled: roundState.config.featuredHoles.enabled,
    drawTwoPickOne: roundState.config.toggles.drawTwoPickOne,
    autoAssignOne: roundState.config.toggles.autoAssignOne,
  }
}

export function trackAnalyticsEvent<Name extends AnalyticsEventName>(
  name: Name,
  payload: AnalyticsEventPayloadByName[Name],
): void {
  try {
    const event = {
      name,
      payload,
      atMs: Date.now(),
    } as AnalyticsEvent<Name> as AnyAnalyticsEvent
    void activeAnalyticsProvider.track(event)
  } catch {
    // Analytics should never break round flow.
  }
}

export function trackHomeAction(params: {
  action: HomeActionName
  hasSavedRound: boolean
  currentScreen: AppScreen
}): void {
  trackAnalyticsEvent('home_action', params)
}

export function trackRoundStarted(roundState: RoundState, source: RoundStartSource): void {
  trackAnalyticsEvent('round_started', {
    source,
    round: buildRoundAnalyticsContext(roundState),
  })
}

export function trackRoundResumed(roundState: RoundState, resumeScreen: AppScreen): void {
  trackAnalyticsEvent('round_resumed', {
    source: 'home_continue',
    resumeScreen,
    round: buildRoundAnalyticsContext(roundState),
  })
}

export function trackRoundAbandoned(roundState: RoundState, abandonmentPoint: AppScreen): void {
  trackAnalyticsEvent('round_abandoned', {
    source: 'home_danger_zone',
    abandonmentPoint,
    round: buildRoundAnalyticsContext(roundState),
  })
}

export function trackPresetSelected(
  roundState: RoundState,
  presetId: GameModePresetId,
  source: PresetSelectionSource,
): void {
  trackAnalyticsEvent('preset_selected', {
    presetId,
    source,
    round: buildRoundAnalyticsContext(roundState),
  })
}

export function trackRoundSetupCompleted(
  roundState: RoundState,
  source: 'start_round' | 'quick_defaults_start',
): void {
  trackAnalyticsEvent('round_setup_completed', {
    source,
    round: buildRoundAnalyticsContext(roundState),
  })
}

export function trackHoleStarted(roundState: RoundState, holeNumber: number, wasPrepared: boolean): void {
  trackAnalyticsEvent('hole_started', {
    holeNumber,
    wasPrepared,
    round: buildRoundAnalyticsContext(roundState),
  })
}

export function trackCardSelected(
  roundState: RoundState,
  holeNumber: number,
  playerId: string,
  cardId: string,
): void {
  trackAnalyticsEvent('card_selected', {
    holeNumber,
    playerId,
    cardId,
    round: buildRoundAnalyticsContext(roundState),
  })
}

export function trackScoreEntered(
  roundState: RoundState,
  holeNumber: number,
  playerId: string,
  strokes: number | null,
  inputMethod: ScoreInputMethod,
): void {
  trackAnalyticsEvent('score_entered', {
    holeNumber,
    playerId,
    strokes,
    inputMethod,
    round: buildRoundAnalyticsContext(roundState),
  })
}

export function trackPublicCardResolution(
  roundState: RoundState,
  holeNumber: number,
  cardId: string,
  action: PublicResolutionAction,
): void {
  trackAnalyticsEvent('public_card_resolution', {
    holeNumber,
    cardId,
    action,
    round: buildRoundAnalyticsContext(roundState),
  })
}

export function trackHoleCompleted(roundState: RoundState, holeNumber: number): void {
  trackAnalyticsEvent('hole_completed', {
    holeNumber,
    round: buildRoundAnalyticsContext(roundState),
  })
}

export function trackRoundCompleted(roundState: RoundState): void {
  const leaderboardRows = buildLeaderboardEntries(
    roundState.players,
    roundState.totalsByPlayerId,
    'adjustedScore',
  )
  const winningAdjustedScore = leaderboardRows[0]?.adjustedScore
  const winnerNames =
    typeof winningAdjustedScore === 'number'
      ? formatPlayerNames(
          leaderboardRows
            .filter((row) => row.adjustedScore === winningAdjustedScore)
            .map((row) => row.playerName),
        )
      : '-'

  trackAnalyticsEvent('round_completed', {
    winnerNames,
    round: buildRoundAnalyticsContext(roundState),
  })
}

export function trackAwardsViewed(
  roundState: RoundState,
  section: 'signature' | 'additional',
  awardCount: number,
): void {
  trackAnalyticsEvent('awards_viewed', {
    section,
    awardCount,
    round: buildRoundAnalyticsContext(roundState),
  })
}

export function trackSummaryScreenViewed(
  roundState: RoundState,
  screen: SummaryScreenName,
  holeNumber: number,
): void {
  trackAnalyticsEvent('summary_screen_viewed', {
    screen,
    holeNumber,
    round: buildRoundAnalyticsContext(roundState),
  })
}

export function trackRecapShareAction(roundState: RoundState, outcome: RecapShareOutcome): void {
  trackAnalyticsEvent('recap_share_action', {
    outcome,
    round: buildRoundAnalyticsContext(roundState),
  })
}
