export interface PowerUp {
  id: string
  title: string
  description: string
  category?: string
  legendary?: boolean
}

export const POWER_UPS: PowerUp[] = [
  {
    id: 'pinball-wizard',
    title: 'Pinball Wizard',
    description:
      'Tap a moving putt one additional time to redirect it. If it drops, sequence still counts as one stroke.',
    category: 'putting',
  },
  {
    id: 'backboard',
    title: 'Backboard',
    description:
      'Playing partners create a human backboard (shoes) behind the hole. Your putt may bounce off it.',
    category: 'putting',
  },
  {
    id: 'gimme-magnet-short',
    title: 'Gimme Magnet – Short',
    description: 'Any putt inside 6 feet automatically counts as holed.',
    category: 'putting',
  },
  {
    id: 'gimme-magnet-medium',
    title: 'Gimme Magnet – Medium',
    description: 'Any putt inside 12 feet automatically counts as holed.',
    category: 'putting',
  },
  {
    id: 'gimme-magnet-long',
    title: 'Gimme Magnet – Long',
    description: 'Any putt inside 18 feet automatically counts as holed.',
    category: 'putting',
  },
  {
    id: 'one-putt-wonder',
    title: 'One-Putt Wonder',
    description: 'Once your ball reaches the green, the hole can never require more than one putt.',
    category: 'putting',
  },
  {
    id: 'putt-preview',
    title: 'Putt Preview',
    description: 'Roll one practice putt that does not count, then take your real putt.',
    category: 'putting',
  },
  {
    id: 'the-clutch',
    title: 'The Clutch',
    description:
      'If you miss a putt inside 4 feet, tap it again and it still counts as one stroke.',
    category: 'putting',
  },
  {
    id: 'laser-line',
    title: 'Laser Line',
    description: 'Walk the exact putt line once with your putter touching the ground.',
    category: 'putting',
  },
  {
    id: 'roll-back',
    title: 'Roll Back',
    description: 'If a putt or chip rolls more than 10 feet past, move the ball halfway back.',
    category: 'putting',
  },
  {
    id: 'foot-wedge-small',
    title: 'Foot Wedge – Small',
    description: 'Move your ball 1 club length to improve the lie.',
    category: 'lie-position',
  },
  {
    id: 'foot-wedge-medium',
    title: 'Foot Wedge – Medium',
    description: 'Move your ball 2 club lengths to improve the lie.',
    category: 'lie-position',
  },
  {
    id: 'foot-wedge-deluxe',
    title: 'Foot Wedge – Deluxe',
    description: 'Move your ball 3 club lengths to improve the lie.',
    category: 'lie-position',
  },
  {
    id: 'kick-save',
    title: 'Kick Save',
    description: 'If your ball finishes behind a tree, move it 1 club length sideways.',
    category: 'lie-position',
  },
  {
    id: 'fringe-fix',
    title: 'Fringe Fix',
    description: 'If your ball stops just off the green, place it onto the fringe.',
    category: 'lie-position',
  },
  {
    id: 'fairway-finder',
    title: 'Fairway Finder',
    description: 'If your drive lands in rough but in play, move it to nearest fairway edge.',
    category: 'lie-position',
  },
  {
    id: 'sand-skip',
    title: 'Sand Skip',
    description: 'If your ball lands in a bunker, drop it just outside the bunker.',
    category: 'lie-position',
  },
  {
    id: 'safety-net',
    title: 'Safety Net',
    description: 'If your shot goes out of bounds, drop in bounds with no penalty stroke.',
    category: 'lie-position',
  },
  {
    id: 'power-drive',
    title: 'Power Drive',
    description: 'After your drive, move the ball 1 club length forward.',
    category: 'distance-boost',
  },
  {
    id: 'power-drive-turbo',
    title: 'Power Drive – Turbo',
    description: 'After your drive, move the ball 2 club lengths forward.',
    category: 'distance-boost',
  },
  {
    id: 'power-drive-rocket',
    title: 'Power Drive – Rocket',
    description: 'After your drive, move the ball 3 club lengths forward.',
    category: 'distance-boost',
  },
  {
    id: 'the-booster',
    title: 'The Booster',
    description: 'After a drive, move your ball 15 yards closer to the hole.',
    category: 'distance-boost',
  },
  {
    id: 'lucky-kick',
    title: 'Lucky Kick',
    description: 'After a drive, move your ball one club length toward the green.',
    category: 'distance-boost',
  },
  {
    id: 'tree-friendly',
    title: 'Tree Friendly',
    description: 'If your ball hits a tree but stays in play, move it 10 yards forward.',
    category: 'distance-boost',
  },
  {
    id: 'equalizer',
    title: 'Equalizer',
    description:
      'If another player outdrives you by 30+ yards, move your ball 10 yards forward.',
    category: 'distance-boost',
  },
  {
    id: 'cart-golf',
    title: 'Cart Golf',
    description: 'If someone outdrives you on the hole, place your ball at their drive location.',
    category: 'distance-boost',
  },
  {
    id: 'frozone',
    title: 'Frozone',
    description: 'If you hit water, drop on the far side with no penalty (water treated as frozen).',
    category: 'hazard-trouble',
  },
  {
    id: 'ricochet',
    title: 'Ricochet',
    description:
      'If your ball kicks OB from a tree/path, drop where it crossed with no stroke penalty.',
    category: 'hazard-trouble',
  },
  {
    id: 'sand-savior',
    title: 'Sand Savior',
    description: 'Your first bunker shot does not count if you escape the bunker.',
    category: 'hazard-trouble',
  },
  {
    id: 'reverse-bounce',
    title: 'Sticky Stuff',
    description:
      'If approach hits green then rolls off, place it back where you believe it hit the green first.',
    category: 'hazard-trouble',
  },
  {
    id: 'green-light',
    title: 'Green Light',
    description: 'If approach rolls off green, place it back on edge of putting surface.',
    category: 'hazard-trouble',
  },
  {
    id: 'mulligan-lite',
    title: 'Mulligan Lite',
    description: 'Replay one shot on the hole, but you must use the second result.',
    category: 'shot-replay',
  },
  {
    id: 'time-warp',
    title: 'Time Warp',
    description: 'Replay your previous shot, even if good. You must use the second result.',
    category: 'shot-replay',
  },
  {
    id: 'hand-wedge',
    title: 'Hand Wedge',
    description: 'Once this hole, toss the ball with your hand instead of hitting with a club.',
    category: 'special-shot',
  },
  {
    id: 'the-hammer',
    title: 'The Hammer',
    description: 'If you hit the longest drive on the hole, subtract one stroke from your score.',
    category: 'special-shot',
  },
  {
    id: 'high-roller',
    title: 'High Roller',
    description:
      'Before a shot, flip/roll a tee. If it points forward, advance ball 10 yards after shot.',
    category: 'special-shot',
  },
  {
    id: 'the-glide',
    title: 'The Glide',
    description: 'If approach finishes within one club length of green, drop onto the surface.',
    category: 'special-shot',
  },
  {
    id: 'the-walk-off',
    title: 'The Walk-Off',
    description: 'If your ball finishes within 2 feet of hole, the putt is automatic.',
    category: 'special-shot',
  },
  {
    id: 'long-putt-insurance',
    title: 'Long Putt Insurance',
    description: 'If you three-putt, remove one putt from the score.',
    category: 'recovery',
  },
  {
    id: 'chip-cushion',
    title: 'Chip Cushion',
    description: 'If chip rolls 15 feet past, move it halfway back toward the hole.',
    category: 'recovery',
  },
  {
    id: 'green-bump',
    title: 'Green Bump',
    description: 'Once your chip lands on the green, move it one club length closer to the hole.',
    category: 'recovery',
  },
  {
    id: 'the-wormhole',
    title: 'The Wormhole',
    description: 'Place your ball anywhere on the green once this hole.',
    category: 'legendary',
    legendary: true,
  },
  {
    id: 'the-teleporter',
    title: 'The Teleporter',
    description: 'Replace any one shot with a drop 50 yards closer to the hole.',
    category: 'legendary',
    legendary: true,
  },
  {
    id: 'gravity-off',
    title: 'Gravity Off',
    description: 'Your ball cannot roll backward away from the hole on this hole.',
    category: 'legendary',
    legendary: true,
  },
  {
    id: 'tiger-vision',
    title: 'Tiger Vision',
    description: 'Once this hole, place your ball exactly where your shot should have landed.',
    category: 'legendary',
    legendary: true,
  },
  {
    id: 'the-crowd-goes-wild',
    title: 'The Crowd Goes Wild',
    description: 'Others cheer before your shot; if they do, move your ball 10 yards forward.',
    category: 'legendary',
    legendary: true,
  },
  {
    id: 'the-time-loop',
    title: 'The Time Loop',
    description: 'Replay any one shot after seeing the result.',
    category: 'legendary',
    legendary: true,
  },
  {
    id: 'the-portal',
    title: 'The Portal',
    description: 'If ball lands within 20 feet of green, place it on the green.',
    category: 'legendary',
    legendary: true,
  },
  {
    id: 'ice-rink',
    title: 'Ice Rink',
    description: 'All bunker shots on this hole slide directly onto the green.',
    category: 'legendary',
    legendary: true,
  },
  {
    id: 'ball-magnet',
    title: 'Ball Magnet',
    description: 'If your putt passes within 6 inches of hole on your first putt, it counts as holed.',
    category: 'legendary',
    legendary: true,
  },
  {
    id: 'the-miracle',
    title: 'The Miracle',
    description: 'Once this hole, erase one stroke from your score.',
    category: 'legendary',
    legendary: true,
  },
]

export const BAD_POWER_UPS: PowerUp[] = [
  {
    id: 'curse-no-driver',
    title: 'No Driver',
    description: 'You cannot use driver on this hole.',
    category: 'curse',
  },
  {
    id: 'curse-putter-only',
    title: 'Putter Grip Lock',
    description: 'Any putt inside 5 feet must be holed cleanly with no gimmies.',
    category: 'curse',
  },
  {
    id: 'curse-first-off-tee',
    title: 'First Off The Tee',
    description: 'You must tee off first regardless of honors.',
    category: 'curse',
  },
  {
    id: 'curse-no-practice',
    title: 'No Practice Swings',
    description: 'No practice swings allowed on full shots this hole.',
    category: 'curse',
  },
  {
    id: 'curse-three-club-limit',
    title: 'Three-Club Limit',
    description: 'Choose only three clubs for the hole. You may use putter in addition.',
    category: 'curse',
  },
  {
    id: 'curse-quiet-setup',
    title: 'Silent Setup',
    description: 'No talking during your setup, swing, or immediate result.',
    category: 'curse',
  },
  {
    id: 'curse-club-down',
    title: 'Club Down',
    description: 'On one full swing, you must take one less club than normal.',
    category: 'curse',
  },
  {
    id: 'curse-club-up',
    title: 'Club Up',
    description: 'On one full swing, you must take one extra club and swing smooth.',
    category: 'curse',
  },
  {
    id: 'curse-no-gps',
    title: 'No Yardage Help',
    description: 'No rangefinder or GPS allowed on this hole.',
    category: 'curse',
  },
  {
    id: 'curse-fast-decision',
    title: 'Ten-Second Decision',
    description: 'You must pick your club within 10 seconds when it is your turn.',
    category: 'curse',
  },
  {
    id: 'curse-putt-from-fringe',
    title: 'Texas Holdem',
    description: 'If your ball is on the fringe, you must putt instead of chip.',
    category: 'curse',
  },
  {
    id: 'curse-no-hero-shot',
    title: 'No Hero Shot',
    description: 'When in trouble, you must play the safe punch-out option.',
    category: 'curse',
  },
  {
    id: 'curse-no-free-drop',
    title: 'No Optional Relief',
    description: 'Optional free relief is disabled for you on this hole.',
    category: 'curse',
  },
  {
    id: 'curse-one-ball',
    title: 'One Ball Only',
    description: 'No provisional or second ball allowed this hole.',
    category: 'curse',
  },
  {
    id: 'curse-back-tee',
    title: 'Back Tee Penalty',
    description: 'You must tee off from one tee box behind the group.',
    category: 'curse',
  },
  {
    id: 'curse-bunker-tax',
    title: 'Bunker Tax',
    description: 'If you hit a bunker, add one penalty stroke.',
    category: 'curse',
  },
  {
    id: 'curse-short-putt-repeat',
    title: 'No Tap-In',
    description: 'All putts must be played from at least one putter head behind the marker.',
    category: 'curse',
  },
  {
    id: 'curse-rough-only-drop',
    title: 'Rough Is Fairway',
    description: 'If you hit fairway off the tee, move your ball to first cut rough.',
    category: 'curse',
  },
  {
    id: 'curse-no-lie-improvement',
    title: 'No Lie Improvement',
    description: 'Ball must be played exactly as it lies unless required by safety rules.',
    category: 'curse',
  },
  {
    id: 'curse-blind-commit',
    title: 'Blind Commit',
    description: 'Choose your club before hearing anyone else discuss yardage.',
    category: 'curse',
  },
  {
    id: 'curse-two-putt-max-fail',
    title: 'Three-Putt Punisher',
    description: 'If you three-putt, add one extra stroke penalty.',
    category: 'curse',
  },
  {
    id: 'curse-par-or-worse',
    title: 'Par Pressure',
    description: 'If you make worse than par, add one penalty stroke.',
    category: 'curse',
  },
  {
    id: 'curse-no-favorite-club',
    title: 'No Favorite Club',
    description: 'You cannot use your favorite club this hole.',
    category: 'curse',
  },
  {
    id: 'curse-carry-bag',
    title: 'No Cart Assist',
    description: 'No cart ride to your ball after tee shot; walk to your next shot.',
    category: 'curse',
  },
]

const ALL_POWER_UPS = [...POWER_UPS, ...BAD_POWER_UPS]

export const POWER_UPS_BY_ID: Record<string, PowerUp> = Object.fromEntries(
  ALL_POWER_UPS.map((powerUp) => [powerUp.id, powerUp]),
)
