import { FEATURED_HOLES_BY_ID } from '../data/featuredHoles.ts'
import type { PublicCard } from '../types/cards.ts'
import type {
  FeaturedHoleType,
  GameMode,
  MissionStatus,
  Player,
  PublicCardResolutionState,
  RoundState,
} from '../types/game.ts'
import { getAssignedCurse, getAssignedPowerUp } from './powerUps.ts'
import { getMomentumTierLabel, type MomentumTier } from './gameBalance.ts'
import {
  buildHolePointBreakdownsByPlayerId,
  createEmptyHolePointBreakdown,
} from './streaks.ts'
import {
  getPublicCardResolutionMode,
  normalizePublicCardResolutions,
  resolvePublicCardPointDeltas,
  type CanonicalPublicResolutionMode,
} from './publicCardResolution.ts'
import { formatPlayerNames, getDisplayPlayerName } from './playerNames.ts'
import { createRefMemoizedSelector } from './selectors.ts'
import { resolveMajorityVoteWinnerId } from './votes.ts'
import { resolveLandingModeIdFromConfig, type LandingModeId } from './landingModes.ts'

const MOMENTUM_TIER_RANK: Record<MomentumTier, number> = {
  none: 0,
  heater: 1,
  fire: 2,
  inferno: 3,
}

const SPECIAL_CARD_TYPES = new Set(['risk', 'curse', 'novelty', 'hybrid'])

export interface HoleRecapPlayerRow {
  playerId: string
  playerName: string
  powerUpTitle: string | null
  curseTitle: string | null
  powerUpUsed: boolean | null
  selectedCardName: string | null
  selectedCardCode: string | null
  selectedCardDescription: string | null
  selectedCardType: string | null
  selectedCardDifficulty: string | null
  selectedCardPoints: number
  missionStatus: MissionStatus
  baseCardPoints: number
  featuredBonusPoints: number
  momentumBonusPoints: number
  rivalryBonus: number
  rivalryOpponentPlayerId: string | null
  publicBonusPoints: number
  balanceCapAdjustment: number
  bonusPoints: number
  holePoints: number
  strokes: number | null
  totalGamePoints: number
  totalRealScore: number
  totalAdjustedScore: number
  momentumBeforeTier: MomentumTier
  momentumAfterTier: MomentumTier
  momentumBeforeLabel: string
  momentumAfterLabel: string
  streakBefore: number
  streakAfter: number
  momentumTierJumped: boolean
  shieldApplied: boolean
  isHoleWinnerByPoints: boolean
}

export interface PublicCardImpactRow {
  playerId: string
  playerName: string
  delta: number
}

export interface PublicCardRecapItem {
  cardId: string
  cardCode: string
  cardName: string
  modeLabel: string
  summaryLine: string
  impactRows: PublicCardImpactRow[]
  biggestSwing: number
}

export interface HoleWinnerSummary {
  score: number | null
  playerIds: string[]
  playerNames: string[]
}

export interface LeaderSnapshotSummary {
  real: HoleWinnerSummary
  game: HoleWinnerSummary
  adjusted: HoleWinnerSummary
}

export interface HoleRecapData {
  gameMode: GameMode
  holeNumber: number
  holePar: number
  highlightLine: string
  featuredHoleRecap: FeaturedHoleRecap | null
  playerRows: HoleRecapPlayerRow[]
  publicCardRecapItems: PublicCardRecapItem[]
  gamePointHoleWinners: HoleWinnerSummary
  /** Strokes minus hole game points on this hole; lowest wins (matches adjusted = real − points at hole scope). */
  adjustedHoleWinners: HoleWinnerSummary
  bestRealScoreHoleWinners: HoleWinnerSummary
  leaderSnapshot: LeaderSnapshotSummary
}

export interface FeaturedHoleRecap {
  type: FeaturedHoleType
  name: string
  shortDescription: string
  impactLine: string
  topBeneficiaries: string[]
  leaderboardImpact: boolean
}

type HoleRecapComputationState = Pick<
  RoundState,
  | 'players'
  | 'holes'
  | 'holeCards'
  | 'holePowerUps'
  | 'holeResults'
  | 'totalsByPlayerId'
  | 'config'
  | 'currentHoleIndex'
>

function formatPoints(points: number): string {
  return `${points > 0 ? '+' : ''}${points}`
}

function formatCardTypeLabel(cardType: string | null): string {
  if (!cardType) {
    return 'Personal'
  }

  return `${cardType.charAt(0).toUpperCase()}${cardType.slice(1)}`
}

const SOLO_WINNER_BROADCAST_TEMPLATES = [
  '{winner} takes the hole.',
  '{winner} claims the hole outright.',
  '{winner} wins the hole clean.',
  '{winner} edges the field and takes the hole.',
  '{winner} posts the number that matters.',
  '{winner} grabs the honors on this hole.',
  '{winner} comes out on top.',
  '{winner} snags the hole.',
  '{winner} gets the job done and takes the hole.',
  '{winner} walks away with the hole.',
  '{winner} stands alone on this one.',
  '{winner} takes care of business here.',
  '{winner} cashes in and takes the hole.',
  '{winner} finds the fairway to victory.',
  '{winner} turns that hole into a highlight.',
  '{winner} leaves no doubt and claims the hole.',
  '{winner} shuts the door and takes it.',
  '{winner} sneaks off with the hole.',
  '{winner} steals the hole with some clutch golf.',
  '{winner} scrambles home and wins the hole.',
  '{winner} hangs on and wins the hole.',
  '{winner} wins it with pure survival golf.',
  '{winner} keeps the card clean enough and takes the hole.',
  '{winner} grinds one out and wins the hole.',
  '{winner} escapes with the hole like a bandit.',
  '{winner} pipes one through the pressure and takes the hole.',
  '{winner} flushes the moment and wins the hole.',
  '{winner} stripes the hole and cashes in.',
  '{winner} rolls it right in the heart and takes it.',
  '{winner} pours one in and wins the hole.',
  '{winner} drains the dagger and owns the hole.',
  '{winner} wins the hole with some premium-grade nonsense.',
  '{winner} takes the hole with broadcast-booth confidence.',
  '{winner} just dropped a little Sunday swagger on that hole.',
  '{winner} brings major-championship energy and takes it.',
  '{winner} takes the hole like it’s the back nine on Sunday.',
  '{winner} channels pure clubhouse confidence and takes it.',
  '{winner} posts a number worthy of a polite Nantz whisper.',
  '{winner} wins the hole with a “better than most” kind of vibe.',
  '{winner} looked dead in the water and still won the hole.',
  '{winner} survives bunkers, branches, and bad ideas to take it.',
  '{winner} takes the hole through sheer chaos tolerance.',
  '{winner} wins it ugly, which still absolutely counts.',
  '{winner} survives the wreckage and comes out smiling.',
  '{winner} turns chaos into points and points into bragging rights.',
  '{winner} takes the hole and the golf gods sign off on the nonsense.',
  '{winner} wins the hole with full “GET IN THE HOLE” energy.',
  '{winner} just turned that hole into Saturday broadcast material.',
  '{winner} wins the hole like the producer told the camera crew to stay tight.',
  '{winner} wins the hole and immediately becomes unbearable in the group chat.',
  '{winner} just went full Sunday Red and slammed the door.',
  '{winner} brought Magnolia Lane energy and never looked back.',
  '{winner} survived Amen Corner vibes and came out with the hole.',
  "{winner} crossed their own Rae's Creek and still took the skin.",
  '{winner} turned this into a Butler Cabin audition and took it.',
  '{winner} brought 16-at-Augusta chip-in confidence and stole the hole.',
  '{winner} hit this with a little "better than most" magic and won it.',
  '{winner} gave it the old "in your life" finish and took the hole.',
  '{winner} channeled peak Sawgrass-on-17 nerve and owned the moment.',
  '{winner} found island-green composure and cashed this hole.',
  '{winner} went St Andrews Road Hole mode and outlasted everyone.',
  '{winner} turned this into a links-weather grind and still won the hole.',
  '{winner} brought Open Championship grit and nicked the hole late.',
  '{winner} went full Ryder Cup fist-pump and grabbed this one.',
  '{winner} pulled a Miracle-at-Medinah style heist and took the hole.',
  '{winner} delivered Duel-in-the-Sun energy and came out on top.',
  '{winner} gave this hole 2008-Torrey resilience and finished it off.',
  '{winner} found a pine-straw miracle and stole the hole anyway.',
  '{winner} escaped like Seve from the car park and took it.',
  '{winner} played this like Pebble on Sunday and cashed it in.',
  '{winner} took the hole with a Bay Hill Sunday snarl.',
  '{winner} rolled in a putt with full CBS-theme timing and took it.',
  '{winner} finished this hole like the producer just called for slow-mo.',
  '{winner} brought "hello friends" calm and took absolute control.',
  '{winner} turned this hole into a Caddyshack highlight and won it.',
  '{winner} went full Happy Gilmore swagger and took the hole.',
  '{winner} won it with Tin Cup bravery and none of the regret.',
]

const CLASSIC_SOLO_WINNER_BROADCAST_TEMPLATES = [
  '{winner} takes the hole.',
  '{winner} claims the hole outright.',
  '{winner} wins the hole clean.',
  '{winner} posts the number that matters.',
  '{winner} gets the job done and takes the hole.',
  '{winner} comes out on top.',
  '{winner} wins the hole with steady golf.',
  '{winner} handles business and takes the hole.',
  '{winner} stands alone on this one.',
  '{winner} closes it out and takes the hole.',
]

const CHAOS_SOLO_WINNER_BROADCAST_TEMPLATES = [
  '{winner} survived the chaos and stole the hole.',
  '{winner} rode the turbulence and took the hole.',
  '{winner} turned mayhem into points and won it.',
  '{winner} came out of the blender with the hole.',
  '{winner} won the hole through pure chaos control.',
  '{winner} weathered the swings and took it.',
  '{winner} thrived in the mess and grabbed the hole.',
  '{winner} took the hole after a very questionable sequence.',
  '{winner} turned a scramble into a headline and won it.',
  '{winner} out-chaosed the chaos and took the hole.',
]

const PROPS_SOLO_WINNER_BROADCAST_TEMPLATES = [
  '{winner} called the line and cashed the hole.',
  '{winner} read it right and takes the hole.',
  '{winner} trusted the forecast and won this one.',
  '{winner} made the right call and claimed the hole.',
  '{winner} played the percentages and took the hole.',
  '{winner} picked the smart angle and won the hole.',
  '{winner} won the hole on good reads and clean execution.',
  '{winner} made the better prediction and took it.',
  '{winner} saw it early and finished the job.',
  '{winner} took the hole with strategy over noise.',
]

const POWER_UPS_SOLO_WINNER_BROADCAST_TEMPLATES = [
  '{winner} hit turbo mode and took the hole.',
  '{winner} fired the right boost and won this one.',
  '{winner} dodged the curses and stole the hole.',
  '{winner} played arcade golf and cashed the hole.',
  '{winner} popped the right power-up and took it.',
  '{winner} outlasted the curse storm and won the hole.',
  '{winner} took the hole with power-up timing and nerve.',
  '{winner} turned boosts into bragging rights and won it.',
  '{winner} beat the curse energy and grabbed the hole.',
  '{winner} went full arcade and closed it out.',
]

const CLASSIC_TIE_BROADCAST_TEMPLATES = [
  '{players} halve the hole.',
  '{players} finish all square on this one.',
  '{players} post matching numbers and split the hole.',
  '{players} finish level and share the hole.',
  '{players} couldn’t be separated on this hole.',
  '{players} split the hole with matching scores.',
  '{players} match cards and split the honors.',
]

const CHAOS_TIE_BROADCAST_TEMPLATES = [
  '{players} survived the chaos and split the hole.',
  '{players} traded swings and finished all square.',
  '{players} came through the chaos with matching numbers.',
  '{players} tied this one in full turbulence.',
  '{players} split the hole after pure wildcard golf.',
  '{players} finished dead even through the mayhem.',
]

const PROPS_TIE_BROADCAST_TEMPLATES = [
  '{players} made matching calls and split the hole.',
  '{players} read it the same and finished all square.',
  '{players} post matching numbers and share the result.',
  '{players} split the hole after identical reads.',
  '{players} tied this one with mirror-image strategy.',
  '{players} matched outcomes and halved the hole.',
]

const POWER_UPS_TIE_BROADCAST_TEMPLATES = [
  '{players} traded boosts and split the hole.',
  '{players} canceled each other out and halved it.',
  '{players} tied the hole after matching power plays.',
  '{players} finished all square in full arcade mode.',
  '{players} split the hole with equal boost energy.',
  '{players} matched scores and shared the hole.',
]

const TWO_WAY_TIE_BROADCAST_TEMPLATES = [
  '{players} halve the hole.',
  '{players} split the hole.',
  '{players} finish all square on this one.',
  '{players} share the hole.',
  '{players} post matching numbers and split the honors.',
  '{players} match cards and halve it.',
  '{players} card the same number and call it even.',
  '{players} end the hole in a dead heat.',
  '{players} split the skin.',
  '{players} trade punches and finish even.',
  '{players} couldn’t be separated on that one.',
  '{players} finish in a scorecard stalemate.',
  '{players} settle for a split.',
  '{players} deadlock the hole.',
  '{players} split the honors and the chirping rights.',
  '{players} make it a push.',
  '{players} go toe-to-toe and come up even.',
  '{players} both wanted it, neither gave an inch.',
  '{players} match numbers and move on.',
  '{players} split it with a gentleman’s ceasefire.',
  '{players} trade blows and halve the hole.',
  '{players} post twin numbers and share the hole.',
  '{players} answer each other and split the result.',
  '{players} finish tied with nothing between them but grass clippings.',
  '{players} post a dead-even finish.',
  '{players} split the hole and the imaginary TV coverage.',
  '{players} go full match-play mode and halve it.',
  '{players} finish all square — queue the polite golf applause.',
  '{players} match cards with a little “hello, friends” energy.',
  '{players} split the hole and head to the next tee still chirping.',
  '{players} halve it with vintage match-play tension.',
  '{players} dead heat the hole with pure Sunday broadcast energy.',
  '{players} match numbers like they rehearsed it in the parking lot.',
  '{players} halved it with pure Ryder Cup tension.',
  '{players} went Presidents Cup mode and split the hole.',
  '{players} finished all square with Sunday-at-Augusta pressure.',
  '{players} posted matching numbers like it is 18 at Brookline.',
  '{players} split this hole with proper match-play theater.',
  '{players} matched cards with Amen Corner-level nerves.',
  '{players} split the hole like a final-pairing stalemate at Sawgrass.',
  '{players} dead-heated this one with St Andrews patience.',
  '{players} traded blows like a links Sunday and halved it.',
  '{players} made this a Butler Cabin-worthy standoff.',
  '{players} split the hole with enough drama for a Netflix golf cutaway.',
  '{players} halved it with Caddyshack chaos and real golf consequences.',
  '{players} tied this hole like it was written by Happy Gilmore and a rules official.',
  '{players} finished level with full back-nine broadcast energy.',
  '{players} split it in a fairway-sized rerun of Medinah chaos.',
  '{players} turned this hole into a leaderboard logjam and called truce.',
]

const THREE_WAY_TIE_BROADCAST_TEMPLATES = [
  '{players} finish in a three-way tie.',
  '{players} split the hole three ways.',
  '{players} all match cards on this one.',
  '{players} crowd into a three-way deadlock.',
  '{players} post the same number and share the hole.',
  '{players} turn the hole into a three-way stalemate.',
  '{players} finish in a proper traffic jam.',
  '{players} make it a three-player split.',
  '{players} leave the hole in total gridlock.',
  '{players} finish all square in a three-way pileup.',
  '{players} post a three-way dead heat.',
  '{players} share the hole and the confusion.',
  '{players} turn that hole into a small committee meeting.',
  '{players} finish tied like a leaderboard logjam.',
]

const FOUR_WAY_TIE_BROADCAST_TEMPLATES = [
  '{players} make it a four-way split.',
  '{players} all tie the hole.',
  '{players} post matching numbers in a four-player pileup.',
  '{players} turn the hole into a four-way traffic jam.',
  '{players} leave the hole in full gridlock.',
  '{players} crowd into a four-way deadlock.',
  '{players} all land on the same number and split it.',
  '{players} make the scorecard look copy-pasted.',
  '{players} post a full-on four-player stalemate.',
  '{players} split the hole like a gallery bottleneck around the green.',
]

const FIVE_WAY_TIE_BROADCAST_TEMPLATES = [
  '{players} make it a five-way tie on the hole.',
  '{players} all post the same number — absolute chaos.',
  '{players} turn the hole into a five-car pileup.',
  '{players} leave the scorecard in five-way gridlock.',
  '{players} all split the hole in a full-blown traffic jam.',
  '{players} somehow all arrive at the exact same destination.',
  '{players} make the hole look like rush hour at the clubhouse.',
]

const SIX_WAY_TIE_BROADCAST_TEMPLATES = [
  '{players} bring six names and one result to the card.',
  '{players} all tie the hole in a six-way logjam.',
  '{players} turn the hole into a golf traffic report.',
  '{players} post matching numbers across six scorecards.',
  '{players} leave absolutely no separation on that hole.',
  '{players} make it a six-way stalemate.',
]

const SEVEN_WAY_TIE_BROADCAST_TEMPLATES = [
  '{players} somehow all tie the hole.',
  '{players} turn the scorecard into a seven-way copy machine.',
  '{players} post a seven-player deadlock.',
  '{players} leave the hole in total and impressive nonsense.',
  '{players} make it a seven-way split — deeply rude to variety.',
]

const EIGHT_WAY_TIE_BROADCAST_TEMPLATES = [
  '{players} all tie the hole — pure democracy.',
  '{players} post matching numbers across the entire group.',
  '{players} turn the hole into an eight-way traffic apocalypse.',
  '{players} make it a full-card stalemate.',
  '{players} leave the hole with maximum gridlock and minimum separation.',
  '{players} all land on the same number, which feels statistically disrespectful.',
]

const UNIVERSAL_ALL_TIED_BROADCAST_TEMPLATES = [
  'Everybody ties the hole.',
  'The whole group finishes all square.',
  'Full-card stalemate — everyone ties the hole.',
  'Nobody gains an inch — the whole group ties it.',
  'Everybody matches cards on this one.',
  'The hole belongs to absolutely no one.',
  'Whole-group deadlock on the hole.',
  'Everyone posts the same number and moves on slightly annoyed.',
  'The entire group brings the same result to the scorecard.',
  'Universal tie — pure golf democracy.',
  'The whole group just went full Ryder Cup handshake line on this hole.',
  'Everybody posted the same number and created a broadcast producer\'s dilemma.',
  'Universal tie: someone cue the polite Masters applause.',
  'Entire-card deadlock; this hole ends in pure golf democracy.',
  'No winner, no loser, just full-group Sunday tension.',
]

function interpolateBroadcastTemplate(
  template: string,
  placeholders: { winner?: string; players?: string },
): string {
  return template
    .replaceAll('{winner}', placeholders.winner ?? '')
    .replaceAll('{players}', placeholders.players ?? '')
}

function getTemplateIndex(seedSource: string, holeNumber: number, templateCount: number): number {
  let hash = holeNumber * 131
  for (const character of seedSource) {
    hash = (hash * 33 + character.charCodeAt(0)) % 2_147_483_647
  }

  return Math.abs(hash) % templateCount
}

function selectBroadcastTemplate(
  templates: readonly string[],
  seedSource: string,
  holeNumber: number,
): string {
  if (templates.length === 0) {
    return ''
  }

  return templates[getTemplateIndex(seedSource, holeNumber, templates.length)]
}

function getTieTemplatesByWinnerCount(
  winnerCount: number,
  totalPlayers: number,
  modeId: LandingModeId,
): readonly string[] {
  if (modeId === 'classic') {
    return CLASSIC_TIE_BROADCAST_TEMPLATES
  }

  if (modeId === 'chaos') {
    if (winnerCount === totalPlayers && winnerCount > 1) {
      return [...CHAOS_TIE_BROADCAST_TEMPLATES, ...UNIVERSAL_ALL_TIED_BROADCAST_TEMPLATES]
    }
    return CHAOS_TIE_BROADCAST_TEMPLATES
  }

  if (modeId === 'props') {
    return PROPS_TIE_BROADCAST_TEMPLATES
  }

  if (modeId === 'powerUps') {
    if (winnerCount === totalPlayers && winnerCount > 1) {
      return [...POWER_UPS_TIE_BROADCAST_TEMPLATES, ...UNIVERSAL_ALL_TIED_BROADCAST_TEMPLATES]
    }
    return POWER_UPS_TIE_BROADCAST_TEMPLATES
  }

  const countSpecificTemplates: readonly string[] = (() => {
    switch (winnerCount) {
      case 2:
        return TWO_WAY_TIE_BROADCAST_TEMPLATES
      case 3:
        return THREE_WAY_TIE_BROADCAST_TEMPLATES
      case 4:
        return FOUR_WAY_TIE_BROADCAST_TEMPLATES
      case 5:
        return FIVE_WAY_TIE_BROADCAST_TEMPLATES
      case 6:
        return SIX_WAY_TIE_BROADCAST_TEMPLATES
      case 7:
        return SEVEN_WAY_TIE_BROADCAST_TEMPLATES
      case 8:
        return EIGHT_WAY_TIE_BROADCAST_TEMPLATES
      default:
        return TWO_WAY_TIE_BROADCAST_TEMPLATES
    }
  })()

  if (winnerCount === totalPlayers && winnerCount > 1) {
    return [...countSpecificTemplates, ...UNIVERSAL_ALL_TIED_BROADCAST_TEMPLATES]
  }

  return countSpecificTemplates
}

function createTieBroadcastLine(
  playerNames: string[],
  holeNumber: number,
  totalPlayers: number,
  modeId: LandingModeId,
): string {
  const formattedNames = formatPlayerNames(playerNames)
  const templates = getTieTemplatesByWinnerCount(playerNames.length, totalPlayers, modeId)
  const template =
    selectBroadcastTemplate(templates, formattedNames, holeNumber) ??
    '{players} finish all square on this one.'

  return interpolateBroadcastTemplate(template, { players: formattedNames })
}

function getWinnerTemplatesByMode(modeId: LandingModeId): readonly string[] {
  if (modeId === 'classic') {
    return CLASSIC_SOLO_WINNER_BROADCAST_TEMPLATES
  }

  if (modeId === 'chaos') {
    return CHAOS_SOLO_WINNER_BROADCAST_TEMPLATES
  }

  if (modeId === 'props') {
    return PROPS_SOLO_WINNER_BROADCAST_TEMPLATES
  }

  if (modeId === 'powerUps') {
    return POWER_UPS_SOLO_WINNER_BROADCAST_TEMPLATES
  }

  return SOLO_WINNER_BROADCAST_TEMPLATES
}

function createWinnerBroadcastLine(
  playerName: string,
  holeNumber: number,
  modeId: LandingModeId,
): string {
  const templates = getWinnerTemplatesByMode(modeId)
  const template =
    selectBroadcastTemplate(templates, playerName, holeNumber) ??
    '{winner} takes the hole.'

  return interpolateBroadcastTemplate(template, { winner: playerName })
}

function getPlayerNameById(players: Player[], playerId: string | null): string | null {
  if (!playerId) {
    return null
  }

  const playerIndex = players.findIndex((player) => player.id === playerId)
  if (playerIndex < 0) {
    return null
  }

  return getDisplayPlayerName(players[playerIndex].name, playerIndex)
}

function getWinnerSummaryByMetric(
  players: Player[],
  getMetricValue: (player: Player) => number,
  preferredDirection: 'max' | 'min',
): HoleWinnerSummary {
  const playerValues = players.map((player) => ({
    player,
    value: getMetricValue(player),
  }))

  if (playerValues.length === 0) {
    return {
      score: null,
      playerIds: [],
      playerNames: [],
    }
  }

  const winnerScore = playerValues.reduce((selected, current) => {
    if (preferredDirection === 'max') {
      return Math.max(selected, current.value)
    }

    return Math.min(selected, current.value)
  }, playerValues[0]?.value ?? 0)

  const winners = playerValues
    .filter((entry) => entry.value === winnerScore)
    .map((entry) => entry.player)

  return {
    score: winnerScore,
    playerIds: winners.map((winner) => winner.id),
    playerNames: winners.map((winner) => {
      const winnerIndex = players.findIndex((player) => player.id === winner.id)
      return getDisplayPlayerName(winner.name, winnerIndex >= 0 ? winnerIndex : 0)
    }),
  }
}

function getBestRealScoreHoleWinners(playerRows: HoleRecapPlayerRow[]): HoleWinnerSummary {
  const validRows = playerRows.filter((row) => typeof row.strokes === 'number')
  if (validRows.length === 0) {
    return {
      score: null,
      playerIds: [],
      playerNames: [],
    }
  }

  const bestScore = validRows.reduce((best, row) => Math.min(best, row.strokes ?? best), validRows[0]?.strokes ?? 0)
  const winners = validRows.filter((row) => row.strokes === bestScore)

  return {
    score: bestScore,
    playerIds: winners.map((winner) => winner.playerId),
    playerNames: winners.map((winner) => winner.playerName),
  }
}

function getAdjustedHoleWinners(playerRows: HoleRecapPlayerRow[]): HoleWinnerSummary {
  const validRows = playerRows.filter((row) => typeof row.strokes === 'number')
  if (validRows.length === 0) {
    return {
      score: null,
      playerIds: [],
      playerNames: [],
    }
  }

  const net = (row: HoleRecapPlayerRow) => (row.strokes as number) - row.holePoints
  const bestNet = validRows.reduce((min, row) => Math.min(min, net(row)), net(validRows[0]!))
  const winners = validRows.filter((row) => net(row) === bestNet)

  return {
    score: bestNet,
    playerIds: winners.map((winner) => winner.playerId),
    playerNames: winners.map((winner) => winner.playerName),
  }
}

function getPublicModeLabel(mode: CanonicalPublicResolutionMode): string {
  switch (mode) {
    case 'yes_no_triggered':
      return 'Yes/No Trigger'
    case 'vote_target_player':
      return 'Vote Target'
    case 'choose_one_of_two_effects':
      return 'Choose Effect'
    case 'leader_selects_target':
      return 'Leader Picks Target'
    case 'trailing_player_selects_target':
      return 'Trailing Picks Target'
    case 'pick_affected_players':
      return 'Pick Affected'
    default:
      return 'Manual Resolve'
  }
}

function summarizePublicCardResolution(
  card: PublicCard,
  resolution: PublicCardResolutionState,
  players: Player[],
  impactRows: PublicCardImpactRow[],
): string {
  if (!resolution.triggered) {
    return 'Not triggered.'
  }

  const mode = getPublicCardResolutionMode(card, resolution)

  if (mode === 'yes_no_triggered') {
    return `Triggered for all players (${formatPoints(card.points)} each).`
  }

  if (mode === 'vote_target_player') {
    const winnerId = resolveMajorityVoteWinnerId(
      resolution.targetPlayerIdByVoterId,
      new Set(players.map((player) => player.id)),
    )
    const winnerName = getPlayerNameById(players, winnerId)
    return winnerName ? `Vote selected ${winnerName}.` : 'Vote tied or unresolved.'
  }

  if (mode === 'leader_selects_target' || mode === 'trailing_player_selects_target') {
    const targetName = getPlayerNameById(players, resolution.winningPlayerId)
    return targetName ? `Target selected: ${targetName}.` : 'No target selected.'
  }

  if (mode === 'pick_affected_players') {
    if (impactRows.length === 0) {
      return 'No affected players selected.'
    }

    return `Affected: ${impactRows.map((row) => row.playerName).join(', ')}.`
  }

  const selectedEffect = card.interaction?.effectOptions?.find(
    (effect) => effect.id === resolution.selectedEffectOptionId,
  )
  const effectLabel = selectedEffect?.label ?? 'Default effect'

  if (impactRows.length === 0) {
    return `${effectLabel}. No point change applied.`
  }

  return `${effectLabel}.`
}

function buildPublicCardRecapItems(roundState: HoleRecapComputationState): PublicCardRecapItem[] {
  const currentHoleCards = roundState.holeCards[roundState.currentHoleIndex]
  const currentResult = roundState.holeResults[roundState.currentHoleIndex]
  const resolutions = normalizePublicCardResolutions(
    currentHoleCards.publicCards,
    currentResult.publicCardResolutionsByCardId,
  )

  return currentHoleCards.publicCards.map((card) => {
    const resolution = resolutions[card.id]
    const cardPointDeltaByPlayerId = resolvePublicCardPointDeltas(
      roundState.players,
      [card],
      { [card.id]: resolution },
    )
    const impactRows = roundState.players
      .map((player, playerIndex) => ({
        playerId: player.id,
        playerName: getDisplayPlayerName(player.name, playerIndex),
        delta: cardPointDeltaByPlayerId[player.id] ?? 0,
      }))
      .filter((row) => row.delta !== 0)
    const biggestSwing = impactRows.reduce(
      (largest, row) => Math.max(largest, Math.abs(row.delta)),
      0,
    )
    const mode = getPublicCardResolutionMode(card, resolution)

    return {
      cardId: card.id,
      cardCode: card.code,
      cardName: card.name,
      modeLabel: getPublicModeLabel(mode),
      summaryLine: summarizePublicCardResolution(card, resolution, roundState.players, impactRows),
      impactRows,
      biggestSwing,
    }
  })
}

function getCountWord(value: number): string {
  const wordMap: Record<number, string> = {
    1: 'One',
    2: 'Two',
    3: 'Three',
    4: 'Four',
    5: 'Five',
    6: 'Six',
    7: 'Seven',
    8: 'Eight',
  }

  return wordMap[value] ?? String(value)
}

function getFeaturedTopBeneficiaries(playerRows: HoleRecapPlayerRow[]): string[] {
  const maxBonus = playerRows.reduce(
    (maxValue, row) => Math.max(maxValue, row.featuredBonusPoints),
    0,
  )

  if (maxBonus <= 0) {
    return []
  }

  return playerRows
    .filter((row) => row.featuredBonusPoints === maxBonus)
    .map((row) => row.playerName)
}

function didFeaturedHoleAffectWinners(playerRows: HoleRecapPlayerRow[]): boolean {
  if (playerRows.length === 0) {
    return false
  }

  const winningScoreWithFeatured = Math.max(...playerRows.map((row) => row.holePoints))
  const winnersWithFeatured = new Set(
    playerRows
      .filter((row) => row.holePoints === winningScoreWithFeatured)
      .map((row) => row.playerId),
  )

  const winningScoreWithoutFeatured = Math.max(
    ...playerRows.map((row) => row.holePoints - row.featuredBonusPoints),
  )
  const winnersWithoutFeatured = new Set(
    playerRows
      .filter((row) => row.holePoints - row.featuredBonusPoints === winningScoreWithoutFeatured)
      .map((row) => row.playerId),
  )

  if (winnersWithFeatured.size !== winnersWithoutFeatured.size) {
    return true
  }

  for (const winnerId of winnersWithFeatured) {
    if (!winnersWithoutFeatured.has(winnerId)) {
      return true
    }
  }

  return false
}

function buildFeaturedHoleImpactLine(
  featuredHoleType: FeaturedHoleType,
  playerRows: HoleRecapPlayerRow[],
): string {
  if (featuredHoleType === 'jackpot') {
    const successes = playerRows.filter((row) => row.missionStatus === 'success').length
    return `${successes} successful mission${successes === 1 ? '' : 's'} received +1.`
  }

  if (featuredHoleType === 'double_points') {
    const doubled = playerRows.filter((row) => row.featuredBonusPoints > 0).length
    return `${doubled} mission${doubled === 1 ? '' : 's'} were doubled for extra points.`
  }

  if (featuredHoleType === 'chaos') {
    const swingCount = playerRows.filter((row) => row.publicBonusPoints !== 0).length
    return swingCount > 0
      ? `Guaranteed public chaos card created swings for ${swingCount} player${swingCount === 1 ? '' : 's'}.`
      : 'Guaranteed chaos card was active, but no direct swing was applied.'
  }

  if (featuredHoleType === 'rivalry') {
    const rivalryWinner = playerRows.find((row) => row.rivalryBonus > 0)
    if (!rivalryWinner) {
      return 'Rivalry matchup ended tied, so no head-to-head bonus was awarded.'
    }
    const opponentName = playerRows.find(
      (row) => row.playerId === rivalryWinner.rivalryOpponentPlayerId,
    )?.playerName
    return opponentName
      ? `${rivalryWinner.playerName} beat ${opponentName} and earned +${rivalryWinner.rivalryBonus}.`
      : `${rivalryWinner.playerName} earned the rivalry bonus.`
  }

  const pressuredPlayers = playerRows.filter((row) => row.selectedCardCode).length
  return `No Mercy removed safe options and forced harder cards for ${pressuredPlayers} player${pressuredPlayers === 1 ? '' : 's'}.`
}

function buildFeaturedHoleRecap(
  featuredHoleType: FeaturedHoleType | null,
  playerRows: HoleRecapPlayerRow[],
): FeaturedHoleRecap | null {
  if (!featuredHoleType) {
    return null
  }

  const featuredHole = FEATURED_HOLES_BY_ID[featuredHoleType]
  const topBeneficiaries = getFeaturedTopBeneficiaries(playerRows)

  return {
    type: featuredHoleType,
    name: featuredHole.name,
    shortDescription: featuredHole.shortDescription,
    impactLine: buildFeaturedHoleImpactLine(featuredHoleType, playerRows),
    topBeneficiaries,
    leaderboardImpact: didFeaturedHoleAffectWinners(playerRows),
  }
}

function createHighlightLine(
  modeId: LandingModeId,
  playerRows: HoleRecapPlayerRow[],
  publicCardRecapItems: PublicCardRecapItem[],
  holeWinners: HoleWinnerSummary,
  holeNumber: number,
): string {
  if (holeWinners.playerNames.length > 0) {
    if (holeWinners.playerNames.length === 1) {
      return createWinnerBroadcastLine(holeWinners.playerNames[0], holeNumber, modeId)
    }

    return createTieBroadcastLine(
      holeWinners.playerNames,
      holeNumber,
      playerRows.length,
      modeId,
    )
  }

  const momentumTierJumps = playerRows
    .filter(
      (row) =>
        MOMENTUM_TIER_RANK[row.momentumAfterTier] >
        MOMENTUM_TIER_RANK[row.momentumBeforeTier],
    )
    .sort((rowA, rowB) => {
      const jumpA = MOMENTUM_TIER_RANK[rowA.momentumAfterTier] - MOMENTUM_TIER_RANK[rowA.momentumBeforeTier]
      const jumpB = MOMENTUM_TIER_RANK[rowB.momentumAfterTier] - MOMENTUM_TIER_RANK[rowB.momentumBeforeTier]
      if (jumpA !== jumpB) {
        return jumpB - jumpA
      }
      return rowB.momentumBonusPoints - rowA.momentumBonusPoints
    })

  if (momentumTierJumps.length > 0) {
    const standout = momentumTierJumps[0]
    return `${standout.playerName} caught ${standout.momentumAfterLabel}`
  }

  const featuredStandout = [...playerRows]
    .filter((row) => row.featuredBonusPoints > 0)
    .sort((rowA, rowB) => rowB.featuredBonusPoints - rowA.featuredBonusPoints)[0]

  if (featuredStandout) {
    return `${featuredStandout.playerName} cashed in +${featuredStandout.featuredBonusPoints} from the featured hole`
  }

  const biggestPublicSwing = publicCardRecapItems
    .flatMap((item) =>
      item.impactRows.map((impactRow) => ({
        cardName: item.cardName,
        playerName: impactRow.playerName,
        delta: impactRow.delta,
        absDelta: Math.abs(impactRow.delta),
      })),
    )
    .sort((swingA, swingB) => swingB.absDelta - swingA.absDelta)[0]

  if (biggestPublicSwing && biggestPublicSwing.absDelta >= 2) {
    if (biggestPublicSwing.delta > 0) {
      return `${biggestPublicSwing.playerName} stole ${biggestPublicSwing.absDelta} points with ${biggestPublicSwing.cardName}`
    }
    return `${biggestPublicSwing.cardName} clipped ${biggestPublicSwing.playerName} for ${biggestPublicSwing.absDelta}`
  }

  const specialCardCompletion = playerRows
    .filter(
      (row) =>
        row.missionStatus === 'success' &&
        (SPECIAL_CARD_TYPES.has(row.selectedCardType ?? '') || row.baseCardPoints >= 3),
    )
    .sort((rowA, rowB) => rowB.baseCardPoints - rowA.baseCardPoints)[0]

  if (specialCardCompletion) {
    return `${specialCardCompletion.playerName} cleared a ${formatCardTypeLabel(specialCardCompletion.selectedCardType)} card`
  }

  const pointsBeforeByPlayerId = Object.fromEntries(
    playerRows.map((row) => [row.playerId, row.totalGamePoints - row.holePoints]),
  )
  const minBefore = Math.min(...Object.values(pointsBeforeByPlayerId))
  const minAfter = Math.min(...playerRows.map((row) => row.totalGamePoints))
  const lastBefore = new Set(
    playerRows
      .filter((row) => pointsBeforeByPlayerId[row.playerId] === minBefore)
      .map((row) => row.playerId),
  )
  const lastAfter = new Set(
    playerRows.filter((row) => row.totalGamePoints === minAfter).map((row) => row.playerId),
  )
  const comebackPlayer = playerRows
    .filter(
      (row) =>
        lastBefore.has(row.playerId) &&
        !lastAfter.has(row.playerId) &&
        row.holePoints > 0,
    )
    .sort((rowA, rowB) => rowB.holePoints - rowA.holePoints)[0]

  if (comebackPlayer) {
    return `${comebackPlayer.playerName} clawed back into the round`
  }

  const successfulPlayers = playerRows.filter((row) => row.missionStatus === 'success')

  if (successfulPlayers.length === playerRows.length && playerRows.length > 1) {
    return 'Everyone completed their missions'
  }

  if (successfulPlayers.length >= 2) {
    return `${getCountWord(successfulPlayers.length)} players completed their missions`
  }

  if (successfulPlayers.length === 0) {
    return 'Nobody survived the hole cleanly'
  }

  return 'Hole complete'
}

function computeHoleRecapData(roundState: HoleRecapComputationState): HoleRecapData {
  const currentHole = roundState.holes[roundState.currentHoleIndex]
  const currentResult = roundState.holeResults[roundState.currentHoleIndex]
  const momentumEnabled = roundState.config.toggles.momentumBonuses
  const featuredHoleType = currentHole.featuredHoleType ?? null
  const breakdownsByPlayerId = buildHolePointBreakdownsByPlayerId(
    roundState.players,
    roundState.holes,
    roundState.holeCards,
    roundState.holeResults,
    momentumEnabled,
  )

  const playerRows = roundState.players.map((player, playerIndex) => {
    const pointBreakdown =
      breakdownsByPlayerId[player.id]?.[roundState.currentHoleIndex] ??
      createEmptyHolePointBreakdown()
    const totals = roundState.totalsByPlayerId[player.id]
    const momentumBeforeLabel = getMomentumTierLabel(pointBreakdown.momentumTierBefore)
    const momentumAfterLabel = getMomentumTierLabel(pointBreakdown.momentumTierAfter)
    const momentumTierJumped =
      MOMENTUM_TIER_RANK[pointBreakdown.momentumTierAfter] >
      MOMENTUM_TIER_RANK[pointBreakdown.momentumTierBefore]

    const assignedPowerUp = getAssignedPowerUp(
      roundState.holePowerUps[roundState.currentHoleIndex],
      player.id,
    )
    const assignedCurse = getAssignedCurse(
      roundState.holePowerUps[roundState.currentHoleIndex],
      player.id,
    )
    const powerUpUsed =
      roundState.holePowerUps[roundState.currentHoleIndex]?.usedPowerUpByPlayerId[player.id]

    return {
      playerId: player.id,
      playerName: getDisplayPlayerName(player.name, playerIndex),
      powerUpTitle: assignedPowerUp?.title ?? null,
      curseTitle: assignedCurse?.title ?? null,
      powerUpUsed: typeof powerUpUsed === 'boolean' ? powerUpUsed : null,
      selectedCardName: pointBreakdown.selectedCardName,
      selectedCardCode: pointBreakdown.selectedCardCode,
      selectedCardDescription: pointBreakdown.selectedCardDescription,
      selectedCardType: pointBreakdown.selectedCardType,
      selectedCardDifficulty: pointBreakdown.selectedCardDifficulty,
      selectedCardPoints: pointBreakdown.selectedCardPoints,
      missionStatus: pointBreakdown.missionStatus,
      baseCardPoints: pointBreakdown.baseMissionPoints,
      featuredBonusPoints: pointBreakdown.featuredBonusPoints,
      momentumBonusPoints: pointBreakdown.momentumBonus,
      rivalryBonus: pointBreakdown.rivalryBonus,
      rivalryOpponentPlayerId: pointBreakdown.rivalryOpponentPlayerId,
      publicBonusPoints: pointBreakdown.publicDelta,
      balanceCapAdjustment: pointBreakdown.balanceCapAdjustment,
      bonusPoints:
        pointBreakdown.featuredBonusPoints +
        pointBreakdown.momentumBonus +
        pointBreakdown.publicDelta +
        pointBreakdown.rivalryBonus +
        pointBreakdown.balanceCapAdjustment,
      holePoints: pointBreakdown.total,
      strokes: currentResult.strokesByPlayerId[player.id] ?? null,
      totalGamePoints: totals?.gamePoints ?? 0,
      totalRealScore: totals?.realScore ?? 0,
      totalAdjustedScore: totals?.adjustedScore ?? 0,
      momentumBeforeTier: pointBreakdown.momentumTierBefore,
      momentumAfterTier: pointBreakdown.momentumTierAfter,
      momentumBeforeLabel,
      momentumAfterLabel,
      streakBefore: pointBreakdown.streakBefore,
      streakAfter: pointBreakdown.streakAfter,
      momentumTierJumped,
      shieldApplied: pointBreakdown.shieldApplied,
      isHoleWinnerByPoints: false,
    }
  })

  const gamePointHoleWinners = getWinnerSummaryByMetric(
    roundState.players,
    (player) => playerRows.find((row) => row.playerId === player.id)?.holePoints ?? 0,
    'max',
  )
  const adjustedHoleWinners = getAdjustedHoleWinners(playerRows)
  const bestRealScoreHoleWinners = getBestRealScoreHoleWinners(playerRows)
  const isPowerUpsMode = roundState.config.gameMode === 'powerUps'
  const headlineHoleWinners = isPowerUpsMode ? bestRealScoreHoleWinners : gamePointHoleWinners
  const winnerIdSet = new Set(
    (isPowerUpsMode ? bestRealScoreHoleWinners : adjustedHoleWinners).playerIds,
  )

  const playerRowsWithWinnerFlags = playerRows.map((row) => ({
    ...row,
    isHoleWinnerByPoints: winnerIdSet.has(row.playerId),
  }))

  const publicCardRecapItems = buildPublicCardRecapItems(roundState)
  const featuredHoleRecap = buildFeaturedHoleRecap(featuredHoleType, playerRowsWithWinnerFlags)
  const landingModeId = resolveLandingModeIdFromConfig(roundState.config)

  const leaderSnapshot: LeaderSnapshotSummary = {
    real: getWinnerSummaryByMetric(
      roundState.players,
      (player) => roundState.totalsByPlayerId[player.id]?.realScore ?? 0,
      'min',
    ),
    game: getWinnerSummaryByMetric(
      roundState.players,
      (player) => roundState.totalsByPlayerId[player.id]?.gamePoints ?? 0,
      'max',
    ),
    adjusted: getWinnerSummaryByMetric(
      roundState.players,
      (player) => roundState.totalsByPlayerId[player.id]?.adjustedScore ?? 0,
      'min',
    ),
  }

  return {
    gameMode: roundState.config.gameMode,
    holeNumber: currentHole.holeNumber,
    holePar: currentHole.par,
    highlightLine: createHighlightLine(
      landingModeId,
      playerRowsWithWinnerFlags,
      publicCardRecapItems,
      headlineHoleWinners,
      currentHole.holeNumber,
    ),
    featuredHoleRecap,
    playerRows: playerRowsWithWinnerFlags,
    publicCardRecapItems,
    gamePointHoleWinners,
    adjustedHoleWinners,
    bestRealScoreHoleWinners,
    leaderSnapshot,
  }
}

const holeRecapDataSelector = createRefMemoizedSelector(
  (
    players: RoundState['players'],
    holes: RoundState['holes'],
    holeCards: RoundState['holeCards'],
    holePowerUps: RoundState['holePowerUps'],
    holeResults: RoundState['holeResults'],
    totalsByPlayerId: RoundState['totalsByPlayerId'],
    config: RoundState['config'],
    currentHoleIndex: number,
  ): HoleRecapData => {
    const recapState: HoleRecapComputationState = {
      players,
      holes,
      holeCards,
      holePowerUps,
      holeResults,
      totalsByPlayerId,
      config,
      currentHoleIndex,
    }

    return computeHoleRecapData(recapState)
  },
)

export function clearHoleRecapDataCache(): void {
  holeRecapDataSelector.clear()
}

export function buildHoleRecapData(roundState: RoundState): HoleRecapData {
  return holeRecapDataSelector(
    roundState.players,
    roundState.holes,
    roundState.holeCards,
    roundState.holePowerUps,
    roundState.holeResults,
    roundState.totalsByPlayerId,
    roundState.config,
    roundState.currentHoleIndex,
  )
}

export function formatWinnerSummary(summary: HoleWinnerSummary): string {
  if (summary.playerNames.length === 0 || summary.score === null) {
    return '-'
  }

  if (summary.playerNames.length === 1) {
    return `${summary.playerNames[0]} (${summary.score})`
  }

  return `${formatPlayerNames(summary.playerNames)} (${summary.score})`
}

/** Supporting copy under Best Moment: per-winner strokes, hole points, and adjusted hole net. */
export function formatAdjustedHoleWinnersSupportingLine(recapData: HoleRecapData): string {
  if (recapData.gameMode === 'powerUps') {
    const { bestRealScoreHoleWinners, playerRows } = recapData
    if (bestRealScoreHoleWinners.score === null || bestRealScoreHoleWinners.playerIds.length === 0) {
      return 'Hole score (actual): not yet - enter strokes on Hole Results to rank this hole by real score.'
    }

    const rowByPlayerId = new Map(playerRows.map((row) => [row.playerId, row]))
    const parts: string[] = []

    for (let index = 0; index < bestRealScoreHoleWinners.playerIds.length; index += 1) {
      const playerId = bestRealScoreHoleWinners.playerIds[index]
      if (!playerId) {
        continue
      }

      const row = rowByPlayerId.get(playerId)
      const displayName = row?.playerName ?? bestRealScoreHoleWinners.playerNames[index] ?? 'Golfer'
      if (!row || typeof row.strokes !== 'number') {
        parts.push(`${displayName} (strokes not entered yet)`)
        continue
      }

      parts.push(`${displayName} (${row.strokes} actual strokes)`)
    }

    if (parts.length === 0) {
      return 'Hole score (actual): not yet - enter strokes on Hole Results to rank this hole by real score.'
    }

    const label = bestRealScoreHoleWinners.playerIds.length === 1 ? 'Hole Winner' : 'Hole Winners'
    return `${label}: ${parts.join(', ')}.`
  }

  const { adjustedHoleWinners, playerRows } = recapData
  if (adjustedHoleWinners.score === null || adjustedHoleWinners.playerIds.length === 0) {
    return 'Hole net (adjusted): not yet - enter strokes on Hole Results to rank this hole by net (strokes - hole points).'
  }

  const rowByPlayerId = new Map(playerRows.map((row) => [row.playerId, row]))
  const parts: string[] = []

  for (let index = 0; index < adjustedHoleWinners.playerIds.length; index += 1) {
    const playerId = adjustedHoleWinners.playerIds[index]
    if (!playerId) {
      continue
    }

    const row = rowByPlayerId.get(playerId)
    const displayName = row?.playerName ?? adjustedHoleWinners.playerNames[index] ?? 'Golfer'

    if (!row || typeof row.strokes !== 'number') {
      parts.push(`${displayName} (strokes not entered yet)`)
      continue
    }

    const strokes = row.strokes
    const holePoints = row.holePoints
    const adjustedHoleNet = strokes - holePoints
    parts.push(
      `${displayName} (${strokes} real strokes - ${holePoints} hole points = ${adjustedHoleNet} adjusted score)`,
    )
  }

  if (parts.length === 0) {
    return 'Hole net (adjusted): not yet - enter strokes on Hole Results to rank this hole by net (strokes - hole points).'
  }

  const label = adjustedHoleWinners.playerIds.length === 1 ? 'Hole Winner' : 'Hole Winners'
  return `${label}: ${parts.join(', ')}.`
}
