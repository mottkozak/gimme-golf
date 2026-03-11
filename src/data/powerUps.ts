export type PowerUpCardKind = 'power_up' | 'curse'
export type PowerUpDifficulty = 'easy' | 'medium' | 'hard'

export interface PowerUp {
  id: string
  code: string
  title: string
  description: string
  cardKind: PowerUpCardKind
  category: string
  difficulty: PowerUpDifficulty
  isActive: boolean
  expansionPack: 'power-ups'
  legendary?: boolean
}

interface PowerUpSeed {
  id: string
  title: string
  description: string
  category: string
  difficulty?: PowerUpDifficulty
  isActive?: boolean
  legendary?: boolean
}

const POWER_UP_EXPANSION_PACK = 'power-ups' as const

function createPowerUp(seed: PowerUpSeed, index: number): PowerUp {
  return {
    id: seed.id,
    code: `PWR-${String(index + 1).padStart(3, '0')}`,
    title: seed.title,
    description: seed.description,
    cardKind: 'power_up',
    category: seed.category,
    difficulty: seed.difficulty ?? (seed.legendary ? 'hard' : 'medium'),
    isActive: seed.isActive ?? true,
    expansionPack: POWER_UP_EXPANSION_PACK,
    legendary: seed.legendary ?? false,
  }
}

function createCurse(seed: PowerUpSeed, index: number): PowerUp {
  return {
    id: seed.id,
    code: `CUR-${String(index + 1).padStart(3, '0')}`,
    title: seed.title,
    description: seed.description,
    cardKind: 'curse',
    category: seed.category,
    difficulty: seed.difficulty ?? 'medium',
    isActive: seed.isActive ?? true,
    expansionPack: POWER_UP_EXPANSION_PACK,
  }
}

const POWER_UP_SEEDS: PowerUpSeed[] = [
  {
    id: 'pinball-wizard',
    title: 'Pinball Wizard',
    description:
      'Tap a moving putt one additional time to redirect it. If it drops, sequence still counts as one stroke.',
    category: 'putting',
    difficulty: 'hard',
  },
  {
    id: 'backboard',
    title: 'Backboard',
    description:
      'Playing partners create a human backboard (shoes) behind the hole. Your putt may bounce off it.',
    category: 'putting',
    difficulty: 'medium',
  },
  {
    id: 'gimme-magnet-short',
    title: 'Gimme Magnet – Short',
    description: 'Any putt inside 6 feet automatically counts as holed.',
    category: 'putting',
    difficulty: 'easy',
  },
  {
    id: 'gimme-magnet-medium',
    title: 'Gimme Magnet – Medium',
    description: 'Any putt inside 12 feet automatically counts as holed.',
    category: 'putting',
    difficulty: 'medium',
    isActive: false,
  },
  {
    id: 'gimme-magnet-long',
    title: 'Gimme Magnet – Long',
    description: 'Any putt inside 18 feet automatically counts as holed.',
    category: 'putting',
    difficulty: 'hard',
    isActive: false,
  },
  {
    id: 'one-putt-wonder',
    title: 'One-Putt Wonder',
    description: 'Once your ball reaches the green, the hole can never require more than one putt.',
    category: 'putting',
    difficulty: 'medium',
  },
  {
    id: 'putt-preview',
    title: 'Putt Preview',
    description: 'Roll one practice putt that does not count, then take your real putt.',
    category: 'putting',
    difficulty: 'easy',
  },
  {
    id: 'the-clutch',
    title: 'The Clutch',
    description:
      'If you miss a putt inside 4 feet, tap it again and it still counts as one stroke.',
    category: 'putting',
    difficulty: 'medium',
    isActive: false,
  },
  {
    id: 'laser-line',
    title: 'Laser Line',
    description: 'Walk the exact putt line once with your putter touching the ground.',
    category: 'putting',
    difficulty: 'easy',
    isActive: false,
  },
  {
    id: 'roll-back',
    title: 'Roll Back',
    description: 'If a putt or chip rolls more than 10 feet past, move the ball halfway back.',
    category: 'putting',
    difficulty: 'medium',
  },
  {
    id: 'foot-wedge-small',
    title: 'Foot Wedge – Small',
    description: 'Move your ball 1 club length to improve the lie.',
    category: 'lie-position',
    difficulty: 'easy',
  },
  {
    id: 'foot-wedge-medium',
    title: 'Foot Wedge – Medium',
    description: 'Move your ball 2 club lengths to improve the lie.',
    category: 'lie-position',
    difficulty: 'medium',
  },
  {
    id: 'foot-wedge-deluxe',
    title: 'Foot Wedge – Deluxe',
    description: 'Move your ball 3 club lengths to improve the lie.',
    category: 'lie-position',
    difficulty: 'hard',
    isActive: false,
  },
  {
    id: 'kick-save',
    title: 'Kick Save',
    description: 'If your ball finishes behind a tree, move it 1 club length sideways.',
    category: 'lie-position',
    difficulty: 'medium',
  },
  {
    id: 'fringe-fix',
    title: 'Fringe Fix',
    description: 'If your ball stops just off the green, place it onto the fringe.',
    category: 'lie-position',
    difficulty: 'easy',
  },
  {
    id: 'fairway-finder',
    title: 'Fairway Finder',
    description: 'If your drive lands in rough but in play, move it to nearest fairway edge.',
    category: 'lie-position',
    difficulty: 'easy',
  },
  {
    id: 'sand-skip',
    title: 'Sand Skip',
    description: 'If your ball lands in a bunker, drop it just outside the bunker.',
    category: 'lie-position',
    difficulty: 'easy',
  },
  {
    id: 'safety-net',
    title: 'Safety Net',
    description: 'If your shot goes out of bounds, drop in bounds with no penalty stroke.',
    category: 'lie-position',
    difficulty: 'medium',
  },
  {
    id: 'power-drive',
    title: 'Power Drive',
    description: 'After your drive, move the ball 1 club length forward.',
    category: 'distance-boost',
    difficulty: 'easy',
  },
  {
    id: 'power-drive-turbo',
    title: 'Power Drive – Turbo',
    description: 'After your drive, move the ball 2 club lengths forward.',
    category: 'distance-boost',
    difficulty: 'medium',
  },
  {
    id: 'power-drive-rocket',
    title: 'Power Drive – Rocket',
    description: 'After your drive, move the ball 3 club lengths forward.',
    category: 'distance-boost',
    difficulty: 'hard',
    isActive: false,
  },
  {
    id: 'the-booster',
    title: 'The Booster',
    description: 'After a drive, move your ball 15 yards closer to the hole.',
    category: 'distance-boost',
    difficulty: 'medium',
  },
  {
    id: 'lucky-kick',
    title: 'Lucky Kick',
    description: 'After a drive, move your ball one club length toward the green.',
    category: 'distance-boost',
    difficulty: 'easy',
  },
  {
    id: 'tree-friendly',
    title: 'Tree Friendly',
    description: 'If your ball hits a tree but stays in play, move it 10 yards forward.',
    category: 'distance-boost',
    difficulty: 'medium',
    isActive: false,
  },
  {
    id: 'equalizer',
    title: 'Equalizer',
    description:
      'If another player outdrives you by 30+ yards, move your ball 10 yards forward.',
    category: 'distance-boost',
    difficulty: 'medium',
  },
  {
    id: 'cart-golf',
    title: 'Cart Golf',
    description: 'If someone outdrives you on the hole, place your ball at their drive location.',
    category: 'distance-boost',
    difficulty: 'medium',
  },
  {
    id: 'frozone',
    title: 'Frozone',
    description: 'If you hit water, drop on the far side with no penalty (water treated as frozen).',
    category: 'hazard-trouble',
    difficulty: 'medium',
  },
  {
    id: 'ricochet',
    title: 'Ricochet',
    description:
      'If your ball kicks OB from a tree/path, drop where it crossed with no stroke penalty.',
    category: 'hazard-trouble',
    difficulty: 'medium',
  },
  {
    id: 'sand-savior',
    title: 'Sand Savior',
    description: 'Your first bunker shot does not count if you escape the bunker.',
    category: 'hazard-trouble',
    difficulty: 'medium',
  },
  {
    id: 'reverse-bounce',
    title: 'Sticky Stuff',
    description:
      'If approach hits green then rolls off, place it back where you believe it hit the green first.',
    category: 'hazard-trouble',
    difficulty: 'medium',
  },
  {
    id: 'green-light',
    title: 'Green Light',
    description: 'If approach rolls off green, place it back on edge of putting surface.',
    category: 'hazard-trouble',
    difficulty: 'medium',
  },
  {
    id: 'mulligan-lite',
    title: 'Mulligan Lite',
    description: 'Replay one shot on the hole, but you must use the second result.',
    category: 'shot-replay',
    difficulty: 'medium',
  },
  {
    id: 'time-warp',
    title: 'Time Warp',
    description: 'Replay your previous shot, even if good. You must use the second result.',
    category: 'shot-replay',
    difficulty: 'hard',
    isActive: false,
  },
  {
    id: 'hand-wedge',
    title: 'Hand Wedge',
    description: 'Once this hole, toss the ball with your hand instead of hitting with a club.',
    category: 'special-shot',
    difficulty: 'hard',
  },
  {
    id: 'the-hammer',
    title: 'The Hammer',
    description: 'If you hit the longest drive on the hole, subtract one stroke from your score.',
    category: 'special-shot',
    difficulty: 'hard',
  },
  {
    id: 'high-roller',
    title: 'High Roller',
    description:
      'Before a shot, flip/roll a tee. If it points forward, advance ball 10 yards after shot.',
    category: 'special-shot',
    difficulty: 'medium',
  },
  {
    id: 'the-glide',
    title: 'The Glide',
    description: 'If approach finishes within one club length of green, drop onto the surface.',
    category: 'special-shot',
    difficulty: 'medium',
    isActive: false,
  },
  {
    id: 'the-walk-off',
    title: 'The Walk-Off',
    description: 'If your ball finishes within 2 feet of hole, the putt is automatic.',
    category: 'special-shot',
    difficulty: 'medium',
    isActive: false,
  },
  {
    id: 'long-putt-insurance',
    title: 'Long Putt Insurance',
    description: 'If you three-putt, remove one putt from the score.',
    category: 'recovery',
    difficulty: 'medium',
  },
  {
    id: 'chip-cushion',
    title: 'Chip Cushion',
    description: 'If chip rolls 15 feet past, move it halfway back toward the hole.',
    category: 'recovery',
    difficulty: 'medium',
  },
  {
    id: 'green-bump',
    title: 'Green Bump',
    description: 'Once your chip lands on the green, move it one club length closer to the hole.',
    category: 'recovery',
    difficulty: 'medium',
  },
  {
    id: 'the-wormhole',
    title: 'The Wormhole',
    description: 'Place your ball anywhere on the green once this hole.',
    category: 'legendary',
    difficulty: 'hard',
    legendary: true,
  },
  {
    id: 'the-teleporter',
    title: 'The Teleporter',
    description: 'Replace any one shot with a drop 50 yards closer to the hole.',
    category: 'legendary',
    difficulty: 'hard',
    legendary: true,
  },
  {
    id: 'gravity-off',
    title: 'Gravity Off',
    description: 'Your ball cannot roll backward away from the hole on this hole.',
    category: 'legendary',
    difficulty: 'hard',
    legendary: true,
    isActive: false,
  },
  {
    id: 'tiger-vision',
    title: 'Tiger Vision',
    description: 'Once this hole, place your ball exactly where your shot should have landed.',
    category: 'legendary',
    difficulty: 'hard',
    legendary: true,
    isActive: false,
  },
  {
    id: 'the-crowd-goes-wild',
    title: 'The Crowd Goes Wild',
    description: 'Others cheer before your shot; if they do, move your ball 10 yards forward.',
    category: 'legendary',
    difficulty: 'hard',
    legendary: true,
    isActive: false,
  },
  {
    id: 'the-time-loop',
    title: 'The Time Loop',
    description: 'Replay any one shot after seeing the result.',
    category: 'legendary',
    difficulty: 'hard',
    legendary: true,
    isActive: false,
  },
  {
    id: 'the-portal',
    title: 'The Portal',
    description: 'If ball lands within 20 feet of green, place it on the green.',
    category: 'legendary',
    difficulty: 'hard',
    legendary: true,
  },
  {
    id: 'ice-rink',
    title: 'Ice Rink',
    description: 'All bunker shots on this hole slide directly onto the green.',
    category: 'legendary',
    difficulty: 'hard',
    legendary: true,
    isActive: false,
  },
  {
    id: 'ball-magnet',
    title: 'Ball Magnet',
    description: 'If your putt passes within 6 inches of hole on your first putt, it counts as holed.',
    category: 'legendary',
    difficulty: 'hard',
    legendary: true,
  },
  {
    id: 'the-miracle',
    title: 'The Miracle',
    description: 'Once this hole, erase one stroke from your score.',
    category: 'legendary',
    difficulty: 'hard',
    legendary: true,
  },
]

const CURSE_SEEDS: PowerUpSeed[] = [
  {
    id: 'curse-no-driver',
    title: 'No Driver',
    description: 'You cannot use driver on this hole.',
    category: 'curse',
    difficulty: 'medium',
  },
  {
    id: 'curse-three-club-limit',
    title: 'Three-Club Limit',
    description: 'Choose only three clubs for the hole. You may use putter in addition.',
    category: 'curse',
    difficulty: 'hard',
  },
  {
    id: 'curse-back-tee',
    title: 'Back Tee Penalty',
    description: 'You must tee off from one tee box behind the group.',
    category: 'curse',
    difficulty: 'hard',
  },
  {
    id: 'curse-bunker-tax',
    title: 'Bunker Tax',
    description: 'If you hit a bunker, add one penalty stroke.',
    category: 'curse',
    difficulty: 'medium',
  },
  {
    id: 'curse-rough-only-drop',
    title: 'Rough Is Fairway',
    description: 'If you hit fairway off the tee, move your ball to first cut rough.',
    category: 'curse',
    difficulty: 'medium',
  },
  {
    id: 'curse-short-putt-repeat',
    title: 'No Tap-In',
    description: 'All putts must be played from at least one putter head behind the marker.',
    category: 'curse',
    difficulty: 'medium',
  },
  {
    id: 'curse-club-down',
    title: 'Club Down',
    description: 'On one full swing, you must take one less club than normal.',
    category: 'curse',
    difficulty: 'medium',
  },
  {
    id: 'curse-club-up',
    title: 'Club Up',
    description: 'On one full swing, you must take one extra club and swing smooth.',
    category: 'curse',
    difficulty: 'medium',
  },
  {
    id: 'curse-putt-from-fringe',
    title: 'Texas Holdem',
    description: 'If your ball is on the fringe, you must putt instead of chip.',
    category: 'curse',
    difficulty: 'medium',
  },
  {
    id: 'curse-no-practice',
    title: 'No Practice Swings',
    description: 'No practice swings allowed on full shots this hole.',
    category: 'curse',
    difficulty: 'medium',
  },
  {
    id: 'curse-no-gps',
    title: 'No Yardage Help',
    description: 'No rangefinder or GPS allowed on this hole.',
    category: 'curse',
    difficulty: 'medium',
  },
  {
    id: 'curse-blind-commit',
    title: 'Blind Commit',
    description: 'Choose your club before hearing anyone else discuss yardage.',
    category: 'curse',
    difficulty: 'hard',
  },
  {
    id: 'curse-fast-decision',
    title: 'Ten-Second Decision',
    description: 'You must pick your club within 10 seconds when it is your turn.',
    category: 'curse',
    difficulty: 'hard',
  },
  {
    id: 'curse-no-free-drop',
    title: 'No Optional Relief',
    description: 'Optional free relief is disabled for you on this hole.',
    category: 'curse',
    difficulty: 'medium',
  },
  {
    id: 'curse-one-ball',
    title: 'One Ball Only',
    description: 'No provisional or second ball allowed this hole.',
    category: 'curse',
    difficulty: 'hard',
  },
  {
    id: 'curse-no-hero-shot',
    title: 'No Hero Shot',
    description: 'When in trouble, you must play the safe punch-out option.',
    category: 'curse',
    difficulty: 'medium',
  },
  {
    id: 'curse-par-or-worse',
    title: 'Par Pressure',
    description: 'If you make worse than par, add one penalty stroke.',
    category: 'curse',
    difficulty: 'hard',
  },
  {
    id: 'curse-no-favorite-club',
    title: 'No Favorite Club',
    description: 'You cannot use your favorite club this hole.',
    category: 'curse',
    difficulty: 'hard',
  },
]

// Retired curses remain by id for compatibility with old saved rounds,
// but are intentionally inactive and excluded from Power Ups dealing pools.
const RETIRED_CURSE_SEEDS: PowerUpSeed[] = [
  {
    id: 'curse-putter-only',
    title: 'Putter Grip Lock',
    description: 'Any putt inside 5 feet must be holed cleanly with no gimmies.',
    category: 'curse',
    difficulty: 'medium',
    isActive: false,
  },
  {
    id: 'curse-first-off-tee',
    title: 'First Off The Tee',
    description: 'You must tee off first regardless of honors.',
    category: 'curse',
    difficulty: 'medium',
    isActive: false,
  },
  {
    id: 'curse-quiet-setup',
    title: 'Silent Setup',
    description: 'No talking during your setup, swing, or immediate result.',
    category: 'curse',
    difficulty: 'easy',
    isActive: false,
  },
  {
    id: 'curse-no-lie-improvement',
    title: 'No Lie Improvement',
    description: 'Ball must be played exactly as it lies unless required by safety rules.',
    category: 'curse',
    difficulty: 'medium',
    isActive: false,
  },
  {
    id: 'curse-two-putt-max-fail',
    title: 'Three-Putt Punisher',
    description: 'If you three-putt, add one extra stroke penalty.',
    category: 'curse',
    difficulty: 'hard',
    isActive: false,
  },
  {
    id: 'curse-carry-bag',
    title: 'No Cart Assist',
    description: 'No cart ride to your ball after tee shot; walk to your next shot.',
    category: 'curse',
    difficulty: 'easy',
    isActive: false,
  },
]

const POSITIVE_POWER_UP_CARDS: PowerUp[] = POWER_UP_SEEDS.map((seed, index) => createPowerUp(seed, index))
const CURSE_POWER_UP_CARDS: PowerUp[] = CURSE_SEEDS.map((seed, index) => createCurse(seed, index))
const RETIRED_CURSE_POWER_UP_CARDS: PowerUp[] = RETIRED_CURSE_SEEDS.map((seed, index) =>
  createCurse(seed, CURSE_POWER_UP_CARDS.length + index),
)

const APP_REMOVED_POWER_UP_CODES = new Set([
  'PWR-004',
  'PWR-005',
  'PWR-009',
  'PWR-013',
  'PWR-021',
  'PWR-024',
  'PWR-037',
  'PWR-044',
  'PWR-045',
  'PWR-046',
  'PWR-047',
  'PWR-049',
  'CUR-019',
  'CUR-020',
  'CUR-021',
  'CUR-022',
  'CUR-023',
  'CUR-024',
])

const RAW_POWER_UP_CARDS: PowerUp[] = [
  ...POSITIVE_POWER_UP_CARDS,
  ...CURSE_POWER_UP_CARDS,
  ...RETIRED_CURSE_POWER_UP_CARDS,
]

export const POWER_UP_CARDS: PowerUp[] = RAW_POWER_UP_CARDS.filter(
  (card) => !APP_REMOVED_POWER_UP_CODES.has(card.code),
)

export const POWER_UPS: PowerUp[] = POWER_UP_CARDS.filter(
  (card) => card.cardKind === 'power_up' && card.isActive,
)

export const CURSE_CARDS: PowerUp[] = POWER_UP_CARDS.filter(
  (card) => card.cardKind === 'curse' && card.isActive,
)

export const POWER_UPS_BY_ID: Record<string, PowerUp> = Object.fromEntries(
  POWER_UP_CARDS.map((powerUp) => [powerUp.id, powerUp]),
)
