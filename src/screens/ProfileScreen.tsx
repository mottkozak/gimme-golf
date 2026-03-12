import { useMemo } from 'react'
import { ICONS } from '../app/icons.ts'
import AppIcon from '../components/AppIcon.tsx'
import { ALL_CARDS } from '../data/cards.ts'
import { getLandingModeById, type LandingModeId } from '../logic/landingModes.ts'
import { getPlayerIdentityBadge, loadLocalIdentityState } from '../logic/localIdentity.ts'
import type { ScreenProps } from './types.ts'

function formatShortDate(timestampMs: number): string {
  return new Date(timestampMs).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getPrimaryMode(modeIds: LandingModeId[]): LandingModeId {
  return modeIds[0] ?? 'classic'
}

function buildGoofyIdentity(
  playerName: string,
  roundsPlayed: number,
  winRate: number,
  primaryModeId: LandingModeId,
): {
  nickname: string
  archetype: string
  description: string
} {
  if (roundsPlayed < 2) {
    return {
      nickname: `${playerName} the Fresh Tee`,
      archetype: 'Starter Spark',
      description: 'Still charting a style, but already bringing energy to the group.',
    }
  }

  if (primaryModeId === 'powerUps') {
    return {
      nickname: `${playerName} the Turbo Wedge`,
      archetype: 'Arcade Instigator',
      description: 'Loves tempo, boosts, and dramatic momentum swings.',
    }
  }

  if (primaryModeId === 'chaos') {
    return {
      nickname: `${playerName} the Plot Twist`,
      archetype: 'Variance Surfer',
      description: 'Thrives when rounds get weird and pressure starts stacking.',
    }
  }

  if (primaryModeId === 'props') {
    return {
      nickname: `${playerName} the Green Oracle`,
      archetype: 'Prediction Captain',
      description: 'Reads the table well and leans into strategic calls.',
    }
  }

  if (winRate >= 0.52) {
    return {
      nickname: `${playerName} the Sunday Closer`,
      archetype: 'Pressure Finisher',
      description: 'Consistent when it matters and steady in late-round spots.',
    }
  }

  return {
    nickname: `${playerName} the Fairway Poet`,
    archetype: 'Feel-First Shotmaker',
    description: 'Plays with rhythm, picks smart lines, and keeps the round fun.',
  }
}

function ProfileScreen({ onNavigate }: ScreenProps) {
  const localIdentity = useMemo(() => loadLocalIdentityState(), [])

  const profileRows = Object.values(localIdentity.playerProfiles).sort(
    (left, right) => right.lastPlayedAtMs - left.lastPlayedAtMs,
  )
  const activeProfile = profileRows[0] ?? null

  const gamesPlayed = activeProfile?.roundsPlayed ?? localIdentity.roundHistory.length
  const gamesWon = activeProfile?.wins ?? 0
  const winRate = gamesPlayed > 0 ? gamesWon / gamesPlayed : 0

  const modeCounts = localIdentity.roundHistory.reduce<Record<LandingModeId, number>>(
    (counts, historyEntry) => ({
      ...counts,
      [historyEntry.modeId]: (counts[historyEntry.modeId] ?? 0) + 1,
    }),
    {
      classic: 0,
      novelty: 0,
      chaos: 0,
      props: 0,
      powerUps: 0,
    },
  )
  const favoriteModeIds = (Object.entries(modeCounts) as Array<[LandingModeId, number]>)
    .filter(([, count]) => count > 0)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([modeId]) => modeId)

  const cardNameById = useMemo(
    () => Object.fromEntries(ALL_CARDS.map((card) => [card.id, card.name])),
    [],
  )
  const favoriteCards = Object.entries(localIdentity.favoriteCardCountsById)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([cardId, count]) => ({
      cardId,
      count,
      name: cardNameById[cardId] ?? cardId,
    }))

  const primaryModeId = getPrimaryMode(favoriteModeIds)
  const displayName = activeProfile?.displayName ?? 'Local Golfer'
  const badge = activeProfile ? getPlayerIdentityBadge(activeProfile) : null
  const goofyIdentity = buildGoofyIdentity(displayName, gamesPlayed, winRate, primaryModeId)

  const premiumPackPlaceholders = [
    'Showtime Pack',
    'Wildcard Pack',
    'Forecast Pack',
    'Arcade Pack',
  ]

  return (
    <section className="screen stack-sm profile-screen">
      <header className="screen__header profile-header">
        <div className="row-between setup-row-wrap">
          <div className="screen-title">
            <AppIcon className="screen-title__icon" icon={ICONS.account} />
            <h2>Profile</h2>
          </div>
          <button type="button" onClick={() => onNavigate('home')}>
            Back
          </button>
        </div>
        <p className="muted">Local activity snapshot and identity overview.</p>
      </header>

      <section className="panel stack-xs profile-hero-card">
        <p className="label">Nickname</p>
        <h3>{goofyIdentity.nickname}</h3>
        <p className="profile-hero-card__archetype">{goofyIdentity.archetype}</p>
        <p className="muted">{goofyIdentity.description}</p>
        {badge && (
          <p className="muted">
            Current badge: <strong>{badge.label}</strong> ({badge.detail})
          </p>
        )}
      </section>

      <section className="panel stack-xs">
        <p className="label">Activity</p>
        <div className="profile-metrics-grid">
          <article className="profile-metric">
            <p className="profile-metric__label">Games Played</p>
            <p className="profile-metric__value">{gamesPlayed}</p>
          </article>
          <article className="profile-metric">
            <p className="profile-metric__label">Games Won</p>
            <p className="profile-metric__value">{gamesWon}</p>
          </article>
          <article className="profile-metric">
            <p className="profile-metric__label">Win Rate</p>
            <p className="profile-metric__value">{Math.round(winRate * 100)}%</p>
          </article>
          <article className="profile-metric">
            <p className="profile-metric__label">Primary Mode</p>
            <p className="profile-metric__value profile-metric__value--text">{getLandingModeById(primaryModeId).name}</p>
          </article>
        </div>
      </section>

      <section className="panel stack-xs">
        <p className="label">Favorite Game Modes</p>
        {favoriteModeIds.length > 0 ? (
          <div className="profile-chip-row">
            {favoriteModeIds.map((modeId) => {
              const mode = getLandingModeById(modeId)
              return (
                <span key={modeId} className="chip">
                  {mode.name}
                  {mode.isPremium ? ' • Premium' : ''}
                </span>
              )
            })}
          </div>
        ) : (
          <p className="muted">Play a round to unlock mode insights.</p>
        )}
      </section>

      <section className="panel stack-xs">
        <p className="label">Favorite Cards</p>
        {favoriteCards.length > 0 ? (
          <ul className="list-reset profile-favorite-list">
            {favoriteCards.map((favoriteCard) => (
              <li key={favoriteCard.cardId} className="profile-favorite-list__row">
                <span>{favoriteCard.name}</span>
                <span className="chip">{favoriteCard.count} uses</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Card favorites will appear after completed rounds.</p>
        )}
      </section>

      <section className="panel stack-xs">
        <p className="label">Premium Packs</p>
        <p className="muted">Coming soon. Packs will appear here when subscriptions launch.</p>
        <div className="profile-premium-scroll" role="list" aria-label="Premium packs placeholder">
          {premiumPackPlaceholders.map((packName) => (
            <article key={packName} className="profile-premium-card" role="listitem">
              <p className="profile-premium-card__name">{packName}</p>
              <span className="chip">Locked</span>
            </article>
          ))}
        </div>
      </section>

      <section className="panel stack-xs">
        <p className="label">Recent Rounds</p>
        {localIdentity.roundHistory.length > 0 ? (
          <ol className="list-reset home-history-list">
            {localIdentity.roundHistory.slice(0, 6).map((historyEntry) => (
              <li key={historyEntry.roundSignature} className="home-history-list__item">
                <p className="home-history-list__winner">{historyEntry.winnerNames}</p>
                <p className="muted home-history-list__meta">
                  {formatShortDate(historyEntry.completedAtMs)} • {historyEntry.holeCount} holes •{' '}
                  {getLandingModeById(historyEntry.modeId).name}
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="muted">No completed rounds yet.</p>
        )}
      </section>
    </section>
  )
}

export default ProfileScreen
