import type { HoleTag } from '../types/cards.ts'
import type { GameModePresetId } from '../types/game.ts'

const ICON_BASE = `${import.meta.env.BASE_URL}icons/`

function iconPath(fileName: string): string {
  return `${ICON_BASE}${fileName}`
}

export const ICONS = {
  teeOff: iconPath('play_button_tee_off.png'),
  roundSetup: iconPath('course_layout.png'),
  golfers: iconPath('golfer_setup.png'),
  gameOptions: iconPath('sliders.png'),
  customPack: iconPath('custom_pack.png'),
  dealCards: iconPath('deal_cards.png'),
  holePlay: iconPath('golfer_swing.png'),
  holeResults: iconPath('hole_results.png'),
  holeRecap: iconPath('hole_recap.png'),
  leaderboard: iconPath('leaderboard.png'),
  golfFlag: iconPath('golf_flag.png'),
} as const

export const PRESET_ICON_BY_ID: Record<GameModePresetId, string> = {
  casual: iconPath('casual_mode.png'),
  competitive: iconPath('competitive_mode.png'),
  party: iconPath('party_mode.png'),
  balanced: iconPath('balanced_mode.png'),
  powerUps: iconPath('golfer_swing.png'),
  custom: iconPath('custom_pack.png'),
}

export const HOLE_TAG_ICON_BY_TAG: Record<HoleTag, string> = {
  water: iconPath('water_hazard.png'),
  bunkers: iconPath('sand_hazard.png'),
  trees: iconPath('tree_hazard.png'),
  dogleg: iconPath('dogleg.png'),
  reachablePar5: iconPath('driveable_par_5.png'),
}
