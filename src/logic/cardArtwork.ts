import type { PersonalCard, PublicCard } from '../types/cards.ts'
import type { PowerUp } from '../data/powerUps.ts'

interface PersonalCardArtwork {
  src: string
  alt: string
}

interface ClassicCore54ArtworkEntry {
  difficulty: PersonalCard['difficulty']
  fileName: string
}

interface PackArtworkEntry {
  difficulty: 'easy' | 'medium' | 'hard'
  fileName: string
}

const CLASSIC_CORE54_ARTWORK_BY_CODE: Record<string, ClassicCore54ArtworkEntry> = {
  'COM-001': { difficulty: 'easy', fileName: 'COM-001-Fairway Finder.png' },
  'COM-002': { difficulty: 'easy', fileName: 'COM-002-Green Light.png' },
  'COM-003': { difficulty: 'easy', fileName: 'COM-003-Clean Start.png' },
  'COM-004': { difficulty: 'easy', fileName: 'COM-004-Two-Putt Pro.png' },
  'COM-005': { difficulty: 'easy', fileName: 'COM-005-Bogey Saver.png' },
  'COM-014': { difficulty: 'easy', fileName: 'COM-014-Center Face-ish.png' },
  'COM-015': { difficulty: 'easy', fileName: 'COM-015-Keep It Moving.png' },
  'COM-019': { difficulty: 'easy', fileName: 'COM-019-Fair Miss.png' },
  'COM-022': { difficulty: 'easy', fileName: 'COM-022-No Three Off the Tee.png' },
  'COM-023': { difficulty: 'easy', fileName: 'COM-023-Lag Master.png' },
  'COM-026': { difficulty: 'easy', fileName: 'COM-026-Trouble Avoided.png' },
  'COM-027': { difficulty: 'easy', fileName: 'COM-027-Tap-In Finish.png' },
  'COM-030': { difficulty: 'easy', fileName: 'COM-030-Tee Box Competent.png' },
  'COM-031': { difficulty: 'easy', fileName: 'COM-031-Fairway First.png' },
  'COM-032': { difficulty: 'easy', fileName: 'COM-032-Middle of the Green.png' },
  'COM-039': { difficulty: 'easy', fileName: 'COM-039-Keep the Card Clean.png' },
  'COM-006': { difficulty: 'medium', fileName: 'COM-006-Solid Contact.png' },
  'COM-008': { difficulty: 'medium', fileName: 'COM-008-Recovery Artist.png' },
  'COM-013': { difficulty: 'medium', fileName: 'COM-013-Good Miss.png' },
  'HYB-001': { difficulty: 'medium', fileName: 'HYB-001-Match the Leader.png' },
  'HYB-005': { difficulty: 'medium', fileName: 'HYB-005-Survivor.png' },
  'HYB-006': { difficulty: 'medium', fileName: 'HYB-006-Pressure Pairing.png' },
  'HYB-008': { difficulty: 'medium', fileName: "HYB-008-Closer's Bonus.png" },
  'SKL-001': { difficulty: 'medium', fileName: 'SKL-001-Stick It Close.png' },
  'SKL-002': { difficulty: 'medium', fileName: 'SKL-002-Ice Putter.png' },
  'SKL-004': { difficulty: 'medium', fileName: 'SKL-004-Fairway to Green.png' },
  'SKL-005': { difficulty: 'medium', fileName: 'SKL-005-One-Putt Hero.png' },
  'SKL-006': { difficulty: 'medium', fileName: 'SKL-006-Pin Hunter.png' },
  'SKL-007': { difficulty: 'medium', fileName: 'SKL-007-Long Two-Putt.png' },
  'SKL-013': { difficulty: 'medium', fileName: 'SKL-013-Birdie Chance.png' },
  'SKL-021': { difficulty: 'medium', fileName: 'SKL-021-Clutch Two-Putt.png' },
  'SKL-022': { difficulty: 'medium', fileName: 'SKL-022-Par 4 Precision.png' },
  'SKL-024': { difficulty: 'medium', fileName: 'SKL-024-Long Iron Life.png' },
  'SKL-028': { difficulty: 'medium', fileName: 'SKL-028-Course Management.png' },
  'SKL-031': { difficulty: 'medium', fileName: 'SKL-031-Wedge Wizard.png' },
  'SKL-032': { difficulty: 'medium', fileName: 'SKL-032-Lag and Tap.png' },
  'SKL-033': { difficulty: 'medium', fileName: 'SKL-033-Fairway Conversion.png' },
  'SKL-037': { difficulty: 'medium', fileName: 'SKL-0370-Strong Three.png' },
  'HYB-004': { difficulty: 'hard', fileName: 'HYB-004-Best in the Group.png' },
  'RSK-002': { difficulty: 'hard', fileName: 'RSK-002-Dagger Putt.png' },
  'RSK-005': { difficulty: 'hard', fileName: 'RSK-005-Birdie Hunt.png' },
  'RSK-007': { difficulty: 'hard', fileName: 'RSK-007-Flag Attack.png' },
  'RSK-008': { difficulty: 'hard', fileName: 'RSK-008-Long Drive King.png' },
  'RSK-010': { difficulty: 'hard', fileName: 'RSK-010-Scramble God.png' },
  'RSK-013': { difficulty: 'hard', fileName: 'RSK-013-Must-Make Finish.png' },
  'RSK-014': { difficulty: 'hard', fileName: 'RSK-014-Perfect Par 3.png' },
  'RSK-020': { difficulty: 'hard', fileName: 'RSK-020-Snake Eyes.png' },
  'RSK-021': { difficulty: 'hard', fileName: 'RSK-021-Eagle Look.png' },
  'RSK-022': { difficulty: 'hard', fileName: 'RSK-022-Driver Offense.png' },
  'RSK-025': { difficulty: 'hard', fileName: 'RSK-025-Thread the Needle.png' },
  'SKL-003': { difficulty: 'hard', fileName: 'SKL-003-Up-and-Down.png' },
  'SKL-008': { difficulty: 'hard', fileName: 'SKL-008-Par Machine.png' },
  'SKL-011': { difficulty: 'hard', fileName: 'SKL-011-No-Waste Hole.png' },
  'SKL-017': { difficulty: 'hard', fileName: 'SKL-017-Closed Strong.png' },
}

export const CLASSIC_CORE54_CARD_CODES = Object.keys(CLASSIC_CORE54_ARTWORK_BY_CODE).sort()

const NOVELTY_ARTWORK_BY_CODE: Record<string, PackArtworkEntry> = {
  'NOV-001': { difficulty: 'hard', fileName: 'NOV-001-One-Hand Wonder.png' },
  'NOV-002': { difficulty: 'hard', fileName: 'NOV-002-Opposite-Hand Escape.png' },
  'NOV-004': { difficulty: 'hard', fileName: 'NOV-004-Feet Together.png' },
  'NOV-015': { difficulty: 'medium', fileName: 'NOV-015 -Grip Switch Putt.png' },
  'NOV-018': { difficulty: 'medium', fileName: 'NOV-018-Choke-Down Tee Ball.png' },
  'NOV-023': { difficulty: 'hard', fileName: 'NOV-023-One-Club Wizard.png' },
  'NOV-027': { difficulty: 'medium', fileName: 'NOV-027-Lob Landing.png' },
  'NOV-029': { difficulty: 'medium', fileName: 'NOV-029-Trust the Read.png' },
  'NOV-032': { difficulty: 'medium', fileName: 'NOV-032-Lead-Hand Putt.png' },
  'NOV-034': { difficulty: 'medium', fileName: 'NOV-034-Step-Through Swing.png' },
  'NOV-003': { difficulty: 'easy', fileName: 'NOV-003-Putter Off the Fringe.png' },
  'NOV-013': { difficulty: 'easy', fileName: 'NOV-013 -The Bump-and-Run.png' },
  'NOV-016': { difficulty: 'hard', fileName: 'NOV-016 -One-Second Pause.png' },
  'NOV-024': { difficulty: 'easy', fileName: 'NOV-024-Recovery to Safety.png' },
  'NOV-025': { difficulty: 'medium', fileName: 'NOV-025-Club-Up Control.png' },
  'NOV-031': { difficulty: 'medium', fileName: 'NOV-031 -Baseball Grip Strike.png' },
  'NOV-033': { difficulty: 'easy', fileName: 'NOV-033-Hybrid Bump Rescue.png' },
  'NOV-017': { difficulty: 'easy', fileName: 'NOV-017-No Tee.png' },
}

const CHAOS_ARTWORK_BY_CODE: Record<string, PackArtworkEntry> = {
  'CHA-002': { difficulty: 'easy', fileName: 'CHA-002-Longest Drive Bonus.png' },
  'CHA-003': { difficulty: 'easy', fileName: 'CHA-003-Closest to Pin Bonus.png' },
  'CHA-004': { difficulty: 'medium', fileName: 'CHA-004-Shared Pain.png' },
  'CHA-005': { difficulty: 'hard', fileName: 'CHA-005-Sabotage Token.png' },
  'CHA-007': { difficulty: 'hard', fileName: 'CHA-007-Lone Wolf.png' },
  'CHA-011': { difficulty: 'easy', fileName: 'CHA-011-Birdie Bounty.png' },
  'CHA-012': { difficulty: 'medium', fileName: 'CHA-012-Bogey Tax.png' },
  'CHA-013': { difficulty: 'easy', fileName: 'CHA-013-Long Putt Special.png' },
  'CHA-015': { difficulty: 'hard', fileName: 'CHA-015-Chaos Swap.png' },
  'CHA-018': { difficulty: 'medium', fileName: 'CHA-018-Jackpot Hole.png' },
  'CHA-021': { difficulty: 'medium', fileName: 'CHA-021-Robin Hood.png' },
  'CHA-026': { difficulty: 'medium', fileName: 'CHA-026-Mercy Rule.png' },
  'CHA-027': { difficulty: 'medium', fileName: 'CHA-027-Group Project.png' },
  'CHA-028': { difficulty: 'hard', fileName: 'CHA-028-Disaster Dividend.png' },
  'CHA-031': { difficulty: 'medium', fileName: 'CHA-031 -Bonus for Bravery.png' },
  'CHA-033': { difficulty: 'easy', fileName: 'CHA-033-Clean Card Bonus.png' },
  'CHA-036': { difficulty: 'medium', fileName: 'CHA-036-Miss and Pay.png' },
  'CHA-037': { difficulty: 'hard', fileName: 'CHA-037-Kingmaker.png' },
}

const PROPS_ARTWORK_BY_CODE: Record<string, PackArtworkEntry> = {
  'PRP-001': { difficulty: 'medium', fileName: 'PRP-001-Somebody Birdies.png' },
  'PRP-002': { difficulty: 'medium', fileName: 'PRP-002-Longest Drive Leader.png' },
  'PRP-003': { difficulty: 'medium', fileName: 'PRP-003-Green Hit.png' },
  'PRP-004': { difficulty: 'hard', fileName: 'PRP-004-Clutch Putt.png' },
  'PRP-006': { difficulty: 'easy', fileName: 'PRP-006-Safe Hole.png' },
  'PRP-007': { difficulty: 'easy', fileName: 'PRP-007-Trouble Hole.png' },
  'PRP-008': { difficulty: 'medium', fileName: 'PRP-008-Par 3 Dart.png' },
  'PRP-009': { difficulty: 'medium', fileName: 'PRP-009-No Three-Putts.png' },
  'PRP-010': { difficulty: 'easy', fileName: 'PRP-010-Blow-Up Alert.png' },
  'PRP-012': { difficulty: 'medium', fileName: 'PRP-012-Bomb Watch.png' },
  'PRP-015': { difficulty: 'medium', fileName: 'PRP-015-Two-Putt Field.png' },
  'PRP-017': { difficulty: 'hard', fileName: 'PRP-017-Closest to Pin Pick.png' },
  'PRP-019': { difficulty: 'easy', fileName: 'PRP-019-Fairway Sweep.png' },
  'PRP-020': { difficulty: 'medium', fileName: 'PRP-020-Green Sweep.png' },
  'PRP-022': { difficulty: 'hard', fileName: 'PRP-022-Long Putt Drop.png' },
  'PRP-024': { difficulty: 'hard', fileName: 'PRP-024-Lone Birdie.png' },
  'PRP-031': { difficulty: 'easy', fileName: 'PRP-031-Par Train.png' },
  'PRP-035': { difficulty: 'hard', fileName: 'PRP-035-One-Putt Club.png' },
}

const POWER_UP_ARTWORK_BY_CODE: Record<string, PackArtworkEntry> = {
  'PWR-007': { difficulty: 'easy', fileName: 'PWR-007-Putt Preview.png' },
  'PWR-010': { difficulty: 'easy', fileName: 'PWR-010-Roll Back.png' },
  'PWR-011': { difficulty: 'easy', fileName: 'PWR-011-Foot Wedge – Small.png' },
  'PWR-014': { difficulty: 'easy', fileName: 'PWR-014-Kick Save.png' },
  'PWR-015': { difficulty: 'easy', fileName: 'PWR-015-Fringe Fix.png' },
  'PWR-016': { difficulty: 'easy', fileName: 'PWR-016-Fairway Finder.png' },
  'PWR-019': { difficulty: 'easy', fileName: 'PWR-019-Power Drive.png' },
  'PWR-023': { difficulty: 'easy', fileName: 'PWR-023-Lucky Kick.png' },
  'PWR-040': { difficulty: 'easy', fileName: 'PWR-040-Chip Cushion.png' },
  'PWR-041': { difficulty: 'easy', fileName: 'PWR-041-Green Bump.png' },
  'PWR-012': { difficulty: 'medium', fileName: 'PWR-012-Foot Wedge – Medium.png' },
  'PWR-017': { difficulty: 'medium', fileName: 'PWR-017-Sand Skip.png' },
  'PWR-018': { difficulty: 'medium', fileName: 'PWR-018-Safety Net.png' },
  'PWR-020': { difficulty: 'medium', fileName: 'PWR-020-Power Drive – Turbo.png' },
  'PWR-022': { difficulty: 'medium', fileName: 'PWR-022-The Booster.png' },
  'PWR-025': { difficulty: 'medium', fileName: 'PWR-025-Equalizer.png' },
  'PWR-026': { difficulty: 'medium', fileName: 'PWR-026-Cart Golf.png' },
  'PWR-028': { difficulty: 'medium', fileName: 'PWR-028-Ricochet.png' },
  'PWR-029': { difficulty: 'medium', fileName: 'PWR-029-Sand Savior.png' },
  'PWR-030': { difficulty: 'medium', fileName: 'PWR-030-Sticky Stuff.png' },
  'PWR-031': { difficulty: 'medium', fileName: 'PWR-031-Green Light.png' },
  'PWR-032': { difficulty: 'medium', fileName: 'PWR-032-Mulligan Lite.png' },
  'PWR-035': { difficulty: 'medium', fileName: 'PWR-035-The Hammer.png' },
  'PWR-036': { difficulty: 'medium', fileName: 'PWR-036-High Roller.png' },
  'PWR-039': { difficulty: 'medium', fileName: 'PWR-039-Long Putt Insurance.png' },
  'PWR-001': { difficulty: 'hard', fileName: 'PWR-001-Pinball Wizard.png' },
  'PWR-002': { difficulty: 'hard', fileName: 'PWR-002-Backboard.png' },
  'PWR-003': { difficulty: 'hard', fileName: 'PWR-003-Gimme Magnet.png' },
  'PWR-006': { difficulty: 'hard', fileName: 'PWR-006-One-Putt Wonder.png' },
  'PWR-027': { difficulty: 'hard', fileName: 'PWR-027-Ice Man.png' },
  'PWR-034': { difficulty: 'hard', fileName: 'PWR-034-Hand Wedge.png' },
  'PWR-042': { difficulty: 'hard', fileName: 'PWR-042-The Wormhole.png' },
  'PWR-043': { difficulty: 'hard', fileName: 'PWR-043-The Teleporter.png' },
  'PWR-048': { difficulty: 'hard', fileName: 'PWR-048-The Portal.png' },
  'PWR-050': { difficulty: 'hard', fileName: 'PWR-050-Ball Magnet.png' },
  'PWR-051': { difficulty: 'hard', fileName: 'PWR-051-The Miracle.png' },
}

const CURSE_ARTWORK_BY_CODE: Record<string, PackArtworkEntry> = {
  'CUR-001': { difficulty: 'easy', fileName: 'CUR-001 -No Driver.png' },
  'CUR-006': { difficulty: 'easy', fileName: 'CUR-006-No Tap-In.png' },
  'CUR-009': { difficulty: 'easy', fileName: 'CUR-009-Texas Holdem.png' },
  'CUR-010': { difficulty: 'easy', fileName: 'CUR-010-No Practice Swings.png' },
  'CUR-011': { difficulty: 'easy', fileName: 'CUR-011 No Yardage Help.png' },
  'CUR-013': { difficulty: 'easy', fileName: 'CUR-013 -Ten-Second Decision.png' },
  'CUR-018': { difficulty: 'easy', fileName: 'CUR-018 -No Favorite Club.png' },
  'CUR-002': { difficulty: 'medium', fileName: 'CUR-002-Three-Club Limit.png' },
  'CUR-007': { difficulty: 'medium', fileName: 'CUR-007-Club Down.png' },
  'CUR-008': { difficulty: 'medium', fileName: 'CUR-008-Club Up.png' },
  'CUR-012': { difficulty: 'medium', fileName: 'CUR-012-Blind Commit.png' },
  'CUR-016': { difficulty: 'medium', fileName: 'CUR-016 -No Hero Shot.png' },
  'CUR-003': { difficulty: 'hard', fileName: 'CUR-003-Back Tee Penalty.png' },
  'CUR-004': { difficulty: 'hard', fileName: 'CUR-004-Bunker Tax.png' },
  'CUR-005': { difficulty: 'hard', fileName: 'CUR-005-Rough Is Fairway.png' },
  'CUR-014': { difficulty: 'hard', fileName: 'CUR-014 -No Optional Relief.png' },
  'CUR-015': { difficulty: 'hard', fileName: 'CUR-015 -One Ball Only.png' },
  'CUR-017': { difficulty: 'hard', fileName: 'CUR-017-Par Pressure.png' },
}

export const NOVELTY_SHOWTIME_CARD_CODES = Object.keys(NOVELTY_ARTWORK_BY_CODE).sort()
export const CHAOS_WILDCARD_CARD_CODES = Object.keys(CHAOS_ARTWORK_BY_CODE).sort()
export const PROPS_FORECAST_CARD_CODES = Object.keys(PROPS_ARTWORK_BY_CODE).sort()
export const POWER_UP_ARCADE_CARD_CODES = Object.keys(POWER_UP_ARTWORK_BY_CODE).sort()
export const CURSE_ARCADE_CARD_CODES = Object.keys(CURSE_ARTWORK_BY_CODE).sort()

function getAssetBaseUrl(): string {
  const candidate = (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL
  if (typeof candidate !== 'string' || candidate.length === 0) {
    return '/'
  }

  return candidate.endsWith('/') ? candidate : `${candidate}/`
}

function encodeRelativePath(relativePath: string): string {
  return relativePath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
}

function buildPublicAssetUrl(relativePath: string): string {
  return `${getAssetBaseUrl()}${encodeRelativePath(relativePath)}`
}

export function getPersonalCardArtwork(card: PersonalCard): PersonalCardArtwork | null {
  if (card.packId === 'classic' || card.packId === 'hybrid') {
    const mappedArtwork = CLASSIC_CORE54_ARTWORK_BY_CODE[card.code]
    if (!mappedArtwork) {
      return null
    }

    return {
      src: buildPublicAssetUrl(`cards/core54/${mappedArtwork.difficulty}/${mappedArtwork.fileName}`),
      alt: `${card.code} ${card.name} challenge card artwork`,
    }
  }

  if (card.packId !== 'novelty') {
    return null
  }

  const mappedArtwork = NOVELTY_ARTWORK_BY_CODE[card.code]
  if (!mappedArtwork) {
    return null
  }

  return {
    src: buildPublicAssetUrl(`cards/Novelty/${mappedArtwork.difficulty}/${mappedArtwork.fileName}`),
    alt: `${card.code} ${card.name} challenge card artwork`,
  }
}

export function getPublicCardArtwork(card: PublicCard): PersonalCardArtwork | null {
  if (card.packId !== 'chaos' && card.packId !== 'props') {
    return null
  }

  const mappedArtwork =
    card.packId === 'chaos' ? CHAOS_ARTWORK_BY_CODE[card.code] : PROPS_ARTWORK_BY_CODE[card.code]
  if (!mappedArtwork) {
    return null
  }

  const folder = card.packId === 'chaos' ? 'Chaos' : 'Props'
  return {
    src: buildPublicAssetUrl(`cards/${folder}/${mappedArtwork.difficulty}/${mappedArtwork.fileName}`),
    alt: `${card.code} ${card.name} public card artwork`,
  }
}

export function getPowerUpCardArtwork(card: PowerUp): PersonalCardArtwork | null {
  const mappedArtwork =
    card.cardKind === 'curse' ? CURSE_ARTWORK_BY_CODE[card.code] : POWER_UP_ARTWORK_BY_CODE[card.code]
  if (!mappedArtwork) {
    return null
  }

  const folder = card.cardKind === 'curse' ? 'Curse' : 'PowerUp'
  return {
    src: buildPublicAssetUrl(`cards/${folder}/${mappedArtwork.difficulty}/${mappedArtwork.fileName}`),
    alt: `${card.code} ${card.title} arcade card artwork`,
  }
}
