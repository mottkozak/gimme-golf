import type { HoleTag } from '../types/cards.ts'
import type { GameModePresetId } from '../types/game.ts'

export const ICONS = {
  teeOff: 'sports_golf',
  golfBall: 'sports_baseball',
  roundSetup: 'map',
  golfers: 'groups',
  gameOptions: 'tune',
  account: 'account_circle',
  settings: 'settings',
  play: 'play_arrow',
  customPack: 'inventory_2',
  dealCards: 'style',
  holePlay: 'golf_course',
  holeResults: 'scoreboard',
  holeRecap: 'assignment',
  leaderboard: 'leaderboard',
  golfFlag: 'flag',
} as const

export type AppIconName = string

export const PRESET_ICON_BY_ID: Record<GameModePresetId, AppIconName> = {
  casual: 'wb_sunny',
  competitive: 'emoji_events',
  party: 'celebration',
  balanced: 'tune',
  powerUps: 'bolt',
  custom: 'build',
}

export const HOLE_TAG_ICON_BY_TAG: Record<HoleTag, AppIconName> = {
  water: 'water_drop',
  bunkers: 'beach_access',
  trees: 'park',
  dogleg: 'turn_right',
  reachablePar5: 'flight_takeoff',
}
