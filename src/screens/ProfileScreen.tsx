import { useMemo, useState } from 'react'
import { ICONS } from '../app/icons.ts'
import AppIcon from '../components/AppIcon.tsx'
import Modal from '../components/Modal.tsx'
import { hapticError, hapticLightImpact, hapticSuccess } from '../capacitor/haptics.ts'
import { ALL_CARDS } from '../data/cards.ts'
import { getPersonalCardArtwork, getPublicCardArtwork } from '../logic/cardArtwork.ts'
import { getLandingModeById, type LandingModeId } from '../logic/landingModes.ts'
import {
  getPlayerIdentityBadge,
  getPlayerProfileByName,
  loadLocalIdentityState,
} from '../logic/localIdentity.ts'
import {
  clearAccountProfile,
  getOrCreateLocalAccountUserId,
  getSupabaseClient,
  isSupabaseAuthEnabled,
  loadAccountProfile,
  saveAccountProfile,
  signOutFromSupabase,
} from '../logic/account.ts'
import {
  DEFAULT_EXPECTED_SCORE,
  normalizeExpectedScore,
} from '../logic/roundSetup.ts'
import type { ScreenProps } from '../app/screenContracts.ts'
import type { GimmeGolfCard } from '../types/cards.ts'

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

function parseExpectedScoreInput(value: string): number {
  const trimmedValue = value.trim()
  if (trimmedValue.length === 0) {
    return DEFAULT_EXPECTED_SCORE
  }

  return normalizeExpectedScore(Number(trimmedValue))
}

function ProfileScreen({ onNavigate }: ScreenProps) {
  void onNavigate
  const localIdentity = useMemo(() => loadLocalIdentityState(), [])
  const [accountProfile, setAccountProfile] = useState(() => loadAccountProfile())
  const [usernameDraft, setUsernameDraft] = useState(() => loadAccountProfile()?.displayName ?? '')
  const [expectedScoreInput, setExpectedScoreInput] = useState(() =>
    String(normalizeExpectedScore(loadAccountProfile()?.expectedScore18 ?? DEFAULT_EXPECTED_SCORE)),
  )
  const [profileDefaultsMessage, setProfileDefaultsMessage] = useState<string | null>(null)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [activeFavoriteCard, setActiveFavoriteCard] = useState<{
    card: GimmeGolfCard
    artworkSrc: string | null
    artworkAlt: string
  } | null>(null)
  const authIsEnabled = isSupabaseAuthEnabled()

  const profileRows = Object.values(localIdentity.playerProfiles).sort(
    (left, right) => right.lastPlayedAtMs - left.lastPlayedAtMs,
  )
  const profileNameForIdentity = (accountProfile?.displayName ?? usernameDraft).trim()
  const matchedProfile =
    profileNameForIdentity.length > 0
      ? getPlayerProfileByName(localIdentity, profileNameForIdentity)
      : null
  const activeProfile = matchedProfile ?? profileRows[0] ?? null

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

  const cardNameById = Object.fromEntries(ALL_CARDS.map((card) => [card.id, card.name]))
  const favoriteCards = Object.entries(localIdentity.favoriteCardCountsById)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([cardId, count]) => ({
      card: ALL_CARDS.find((card) => card.id === cardId) ?? null,
      cardId,
      count,
      name: cardNameById[cardId] ?? cardId,
    }))
    .map((favoriteCard) => {
      if (!favoriteCard.card) {
        return {
          ...favoriteCard,
          artworkSrc: null as string | null,
          artworkAlt: `${favoriteCard.name} card artwork`,
        }
      }

      const artwork = favoriteCard.card.isPublic
        ? getPublicCardArtwork(favoriteCard.card)
        : getPersonalCardArtwork(favoriteCard.card)

      return {
        ...favoriteCard,
        artworkSrc: artwork?.src ?? null,
        artworkAlt: artwork?.alt ?? `${favoriteCard.name} card artwork`,
      }
    })

  const primaryModeId = getPrimaryMode(favoriteModeIds)
  const displayName = activeProfile?.displayName ?? 'Local Golfer'
  const badge = activeProfile ? getPlayerIdentityBadge(activeProfile) : null
  const goofyIdentity = buildGoofyIdentity(displayName, gamesPlayed, winRate, primaryModeId)
  const resolvedUsernameDraft =
    usernameDraft.length > 0 ? usernameDraft : accountProfile?.displayName ?? activeProfile?.displayName ?? ''

  const signOut = async () => {
    const client = getSupabaseClient()
    if (!client) {
      return
    }

    setIsSigningOut(true)
    const signOutResult = await signOutFromSupabase(client)
    if (signOutResult.ok) {
      clearAccountProfile()
      setAccountProfile(null)
      hapticSuccess()
    } else {
      hapticError()
    }
    setIsSigningOut(false)
  }

  const saveRoundDefaults = () => {
    const trimmedUsername = resolvedUsernameDraft.trim()
    if (trimmedUsername.length < 1) {
      hapticError()
      setProfileDefaultsMessage('Username must include at least 1 character.')
      return
    }

    const normalizedExpectedScore = parseExpectedScoreInput(expectedScoreInput)
    const nowMs = Date.now()
    const nextProfile = {
      userId: accountProfile?.userId ?? getOrCreateLocalAccountUserId(),
      email: accountProfile?.email ?? '',
      displayName: trimmedUsername,
      expectedScore18: normalizedExpectedScore,
      challengeLayout: accountProfile?.challengeLayout ?? 'illustrative',
      appVibe: accountProfile?.appVibe ?? 'balanced',
      typicalGroupSize: accountProfile?.typicalGroupSize ?? 'foursome_plus',
      playCadence: accountProfile?.playCadence ?? 'monthly',
      remindersEnabled: accountProfile?.remindersEnabled ?? true,
      onboardingCompleted: accountProfile?.onboardingCompleted ?? false,
      createdAtMs: accountProfile?.createdAtMs ?? nowMs,
    }

    saveAccountProfile(nextProfile)
    setAccountProfile(nextProfile)
    setUsernameDraft(trimmedUsername)
    setExpectedScoreInput(String(normalizedExpectedScore))
    setProfileDefaultsMessage('Round defaults saved.')
    hapticSuccess()
  }

  return (
    <section className="screen stack-sm profile-screen">
      <header className="screen__header profile-header">
        <div className="screen-title">
          <AppIcon className="screen-title__icon" icon={ICONS.account} />
          <h2>Profile</h2>
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

      {accountProfile && (
        <section className="panel stack-xs">
          <p className="label">Account</p>
          <p>
            <strong>{accountProfile.displayName}</strong>
          </p>
          {accountProfile.email.trim().length > 0 && <p className="muted">{accountProfile.email}</p>}
          {authIsEnabled && (
            <button
              type="button"
              onClick={() => {
                hapticLightImpact()
                void signOut()
              }}
              disabled={isSigningOut}
            >
              {isSigningOut ? 'Signing Out...' : 'Sign Out'}
            </button>
          )}
        </section>
      )}

      <section className="panel stack-xs">
        <p className="label">Round Defaults</p>
        <p className="muted">Used to prefill Golfer 1 in Round Config.</p>
        <div className="profile-defaults-fields">
          <label htmlFor="profile-username">Username</label>
          <input
            id="profile-username"
            type="text"
            value={resolvedUsernameDraft}
            maxLength={40}
            autoComplete="nickname"
            placeholder="Your name"
            onChange={(event) => setUsernameDraft(event.target.value)}
          />
          <label htmlFor="profile-expected-score">Estimated score on 18 holes</label>
          <input
            id="profile-expected-score"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={expectedScoreInput}
            onChange={(event) => {
              const nextValue = event.target.value
              if (/^\d*$/.test(nextValue)) {
                setExpectedScoreInput(nextValue)
              }
            }}
            onBlur={() => {
              setExpectedScoreInput(String(parseExpectedScoreInput(expectedScoreInput)))
            }}
          />
        </div>
        <button type="button" className="button-primary" onClick={saveRoundDefaults}>
          Save Round Defaults
        </button>
        {profileDefaultsMessage && (
          <p className="muted" role="status" aria-live="polite">
            {profileDefaultsMessage}
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
        <p className="label">Favorite Cards</p>
        {favoriteCards.length > 0 ? (
          <ul className="list-reset profile-favorite-list">
            {favoriteCards.map((favoriteCard) => (
              <li key={favoriteCard.cardId} className="profile-favorite-list__row">
                {favoriteCard.card ? (
                  <button
                    type="button"
                    className="profile-favorite-list__card profile-favorite-list__card-button"
                    onClick={() => {
                      hapticLightImpact()
                      setActiveFavoriteCard({
                        card: favoriteCard.card!,
                        artworkSrc: favoriteCard.artworkSrc,
                        artworkAlt: favoriteCard.artworkAlt,
                      })
                    }}
                  >
                    {favoriteCard.artworkSrc ? (
                      <img
                        className="profile-favorite-list__thumb"
                        src={favoriteCard.artworkSrc}
                        alt={favoriteCard.artworkAlt}
                        loading="lazy"
                      />
                    ) : (
                      <span className="profile-favorite-list__thumb profile-favorite-list__thumb--fallback" aria-hidden>
                        <AppIcon icon={ICONS.dealCards} />
                      </span>
                    )}
                    <span>{favoriteCard.name}</span>
                  </button>
                ) : (
                  <span className="profile-favorite-list__card">
                    {favoriteCard.artworkSrc ? (
                      <img
                        className="profile-favorite-list__thumb"
                        src={favoriteCard.artworkSrc}
                        alt={favoriteCard.artworkAlt}
                        loading="lazy"
                      />
                    ) : (
                      <span className="profile-favorite-list__thumb profile-favorite-list__thumb--fallback" aria-hidden>
                        <AppIcon icon={ICONS.dealCards} />
                      </span>
                    )}
                    <span>{favoriteCard.name}</span>
                  </span>
                )}
                <span className="chip">{favoriteCard.count} uses</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Card favorites will appear after completed rounds.</p>
        )}
      </section>

      {activeFavoriteCard && (
        <Modal onClose={() => setActiveFavoriteCard(null)} labelledBy="profile-favorite-card-title">
          <div className="row-between">
            <h3 id="profile-favorite-card-title">{activeFavoriteCard.card.name}</h3>
            <button type="button" onClick={() => setActiveFavoriteCard(null)}>
              Close
            </button>
          </div>
          <p className="muted">
            {activeFavoriteCard.card.code} | {activeFavoriteCard.card.isPublic ? 'Public Card' : 'Personal Card'}
          </p>
          {activeFavoriteCard.artworkSrc && (
            <img
              className="profile-favorite-card-modal__artwork"
              src={activeFavoriteCard.artworkSrc}
              alt={activeFavoriteCard.artworkAlt}
            />
          )}
          <p>{activeFavoriteCard.card.description}</p>
          <p className="muted">{activeFavoriteCard.card.rulesText}</p>
        </Modal>
      )}

    </section>
  )
}

export default ProfileScreen
