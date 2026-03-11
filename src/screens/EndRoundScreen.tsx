import { useEffect, useMemo, useRef, useState } from 'react'
import { ICONS } from '../app/icons.ts'
import AppIcon from '../components/AppIcon.tsx'
import HoleSummaryList from '../components/HoleSummaryList.tsx'
import LeaderboardTable from '../components/LeaderboardTable.tsx'
import { computeRoundAwards } from '../logic/awards.ts'
import {
  trackAwardsViewed,
  trackRecapShareAction,
  trackRoundCompleted,
  trackRoundStarted,
  trackSummaryScreenViewed,
} from '../logic/analytics.ts'
import { buildLeaderboardEntries } from '../logic/leaderboard.ts'
import {
  getPlayerIdentityBadge,
  getPlayerProfileByName,
  loadLocalIdentityState,
  recordCompletedRoundIdentity,
} from '../logic/localIdentity.ts'
import { formatPlayerNames, getDisplayPlayerName } from '../logic/playerNames.ts'
import {
  buildRoundRecapImageBlob,
  buildRoundRecapPayload,
  copyRecapTextToClipboard,
  createRecapImageFile,
  downloadRecapImage,
  formatRoundRecapText,
  formatSignedPoints,
  tryNativeShareRecap,
} from '../logic/roundRecapShare.ts'
import { resetRoundProgress } from '../logic/roundLifecycle.ts'
import { buildHolePointBreakdownsByPlayerId, getCurrentMomentumStateByPlayerId } from '../logic/streaks.ts'
import type { LeaderboardEntry } from '../types/game.ts'
import type { ScreenProps } from './types.ts'

const MAJOR_AWARD_IDS = new Set(['mvp', 'mostClutch', 'missionMachine', 'biggestComeback'])

interface FunHighlightItem {
  id: string
  label: string
  headline: string
  detail: string
  tone: 'accent' | 'warning' | 'info' | 'neutral'
}

interface PlayerIdentityRow {
  playerId: string
  playerName: string
  badgeLabel: string
  badgeDetail: string
  roundsPlayed: number
  wins: number
}

interface HoleHighlightSnippet {
  id: string
  holeNumber: number
  title: string
  detail: string
  tone: 'accent' | 'warning' | 'info'
}

function formatFeaturedHoleType(featuredHoleType: string): string {
  return featuredHoleType
    .split('_')
    .map((segment) => `${segment.charAt(0).toUpperCase()}${segment.slice(1)}`)
    .join(' ')
}

function buildHoleHighlightSnippets(roundState: ScreenProps['roundState']): HoleHighlightSnippet[] {
  const pointBreakdownsByPlayerId = buildHolePointBreakdownsByPlayerId(
    roundState.players,
    roundState.holes,
    roundState.holeCards,
    roundState.holeResults,
    roundState.config.toggles.momentumBonuses,
  )

  const snippets = roundState.holes
    .map((hole, holeIndex) => {
      const playerRows = roundState.players.map((player, playerIndex) => {
        const breakdown = pointBreakdownsByPlayerId[player.id]?.[holeIndex]
        const holePoints = breakdown?.total ?? 0
        const strokes = roundState.holeResults[holeIndex]?.strokesByPlayerId[player.id] ?? null

        return {
          playerId: player.id,
          playerName: getDisplayPlayerName(player.name, playerIndex),
          holePoints,
          strokes,
        }
      })

      const hasAnyEnteredStrokes = playerRows.some((row) => typeof row.strokes === 'number')
      if (!hasAnyEnteredStrokes) {
        return null
      }

      const highestPoints = Math.max(...playerRows.map((row) => row.holePoints))
      const lowestPoints = Math.min(...playerRows.map((row) => row.holePoints))
      const swing = highestPoints - lowestPoints
      const winningNames = formatPlayerNames(
        playerRows
          .filter((row) => row.holePoints === highestPoints)
          .map((row) => row.playerName),
      )
      const publicCardCount = roundState.holeCards[holeIndex]?.publicCards.length ?? 0
      const featuredHoleType = hole.featuredHoleType
      const interestScore =
        swing * 10 +
        Math.max(0, highestPoints) * 2 +
        publicCardCount * 4 +
        (featuredHoleType ? 10 : 0)

      const detailParts = [
        `${winningNames} led with ${formatSignedPoints(highestPoints)} points`,
      ]
      if (swing > 0) {
        detailParts.push(`swing ${swing}`)
      }
      if (publicCardCount > 0) {
        detailParts.push(`${publicCardCount} public card${publicCardCount === 1 ? '' : 's'}`)
      }

      return {
        id: `hole-highlight-${hole.holeNumber}`,
        holeNumber: hole.holeNumber,
        title: featuredHoleType
          ? `Hole ${hole.holeNumber} • ${formatFeaturedHoleType(featuredHoleType)}`
          : `Hole ${hole.holeNumber}`,
        detail: detailParts.join(' • '),
        tone: featuredHoleType ? 'warning' : swing >= 6 ? 'accent' : 'info',
        interestScore,
      }
    })
    .filter((snippet): snippet is HoleHighlightSnippet & { interestScore: number } => Boolean(snippet))
    .sort((left, right) => {
      if (left.interestScore !== right.interestScore) {
        return right.interestScore - left.interestScore
      }

      return left.holeNumber - right.holeNumber
    })
    .slice(0, 3)

  return snippets.map((snippet) => ({
    id: snippet.id,
    holeNumber: snippet.holeNumber,
    title: snippet.title,
    detail: snippet.detail,
    tone: snippet.tone,
  }))
}

function getLeaderboardWinners(
  rows: LeaderboardEntry[],
  metric: 'realScore' | 'gamePoints' | 'adjustedScore',
): { names: string; value: number | null } {
  if (rows.length === 0) {
    return {
      names: '-',
      value: null,
    }
  }

  const values = rows.map((row) => row[metric])
  const winningValue = metric === 'gamePoints' ? Math.max(...values) : Math.min(...values)
  const winnerNames = rows
    .filter((row) => row[metric] === winningValue)
    .map((row) => row.playerName)

  return {
    names: formatPlayerNames(winnerNames),
    value: winningValue,
  }
}

function getScoreToneClass(value: number): 'score-positive' | 'score-negative' | 'score-neutral' {
  if (value > 0) {
    return 'score-positive'
  }

  if (value < 0) {
    return 'score-negative'
  }

  return 'score-neutral'
}

function EndRoundScreen({ roundState, onNavigate, onResetRound }: ScreenProps) {
  const [localIdentityState, setLocalIdentityState] = useState(() => loadLocalIdentityState())
  const [isSharingRecap, setIsSharingRecap] = useState(false)
  const hasTrackedRoundSummaryRef = useRef(false)
  const hasTrackedMajorAwardsRef = useRef(false)
  const [shareToast, setShareToast] = useState<{
    message: string
    tone: 'success' | 'warning' | 'error'
  } | null>(null)
  const leaderboardRows = buildLeaderboardEntries(
    roundState.players,
    roundState.totalsByPlayerId,
    'adjustedScore',
  )
  const realRows = buildLeaderboardEntries(roundState.players, roundState.totalsByPlayerId, 'realScore')
  const pointsRows = buildLeaderboardEntries(roundState.players, roundState.totalsByPlayerId, 'gamePoints')

  const realWinner = getLeaderboardWinners(realRows, 'realScore')
  const pointsWinner = getLeaderboardWinners(pointsRows, 'gamePoints')
  const adjustedWinner = getLeaderboardWinners(leaderboardRows, 'adjustedScore')
  const momentumByPlayerId = getCurrentMomentumStateByPlayerId(
    roundState.players,
    roundState.holes,
    roundState.holeCards,
    roundState.holeResults,
    roundState.config.toggles.momentumBonuses,
  )

  const awardsSummary = computeRoundAwards(roundState)
  const majorAwards = awardsSummary.awards.filter((award) => MAJOR_AWARD_IDS.has(award.awardId))
  const funAwards = awardsSummary.awards.filter((award) => !MAJOR_AWARD_IDS.has(award.awardId))
  const orderedAwards = [...majorAwards, ...funAwards]
  const awardById = Object.fromEntries(orderedAwards.map((award) => [award.awardId, award]))

  const adjustedWinningScore = adjustedWinner.value
  const adjustedWinnerRows = leaderboardRows.filter(
    (row) => adjustedWinningScore !== null && row.adjustedScore === adjustedWinningScore,
  )
  const heroWinnerNames = formatPlayerNames(adjustedWinnerRows.map((row) => row.playerName))
  const heroWinnerRow = adjustedWinnerRows[0] ?? leaderboardRows[0] ?? null
  const leaderboardTopRows = leaderboardRows.slice(0, 3)
  const gameModeLabel = roundState.config.gameMode === 'powerUps' ? 'Power Ups' : 'Cards'
  const replayGroupLabel = formatPlayerNames(
    roundState.players.map((player, playerIndex) => getDisplayPlayerName(player.name, playerIndex)),
  )
  const totalPublicImpact = Object.values(awardsSummary.statsByPlayerId).reduce(
    (total, stats) => total + stats.publicImpactMagnitude,
    0,
  )
  const totalCursesFaced = Object.values(awardsSummary.statsByPlayerId).reduce(
    (total, stats) => total + stats.curseCardsFaced,
    0,
  )
  const standoutGamePointsRow = pointsRows[0] ?? null
  const holeHighlightSnippets = useMemo(() => buildHoleHighlightSnippets(roundState), [roundState])

  const funHighlights: FunHighlightItem[] = [
    {
      id: 'winner',
      label: 'Round Winner',
      headline:
        heroWinnerNames !== '-'
          ? `${heroWinnerNames} ${adjustedWinnerRows.length > 1 ? 'win' : 'wins'} the round`
          : 'Round complete',
      detail:
        adjustedWinner.value !== null
          ? `Best adjusted score: ${adjustedWinner.value}`
          : 'Adjusted scoring locked in.',
      tone: 'accent',
    },
    {
      id: 'comeback',
      label: 'Biggest Comeback',
      headline: formatPlayerNames(
        awardById.biggestComeback?.winners.map((winner) => winner.playerName) ?? [],
      ),
      detail: awardById.biggestComeback?.supportingStat ?? 'No comeback swing recorded.',
      tone: 'info',
    },
    {
      id: 'cursed',
      label: 'Most Cursed',
      headline: formatPlayerNames(
        awardById.mostCursed?.winners.map((winner) => winner.playerName) ?? [],
      ),
      detail:
        totalCursesFaced > 0
          ? awardById.mostCursed?.supportingStat ?? `${totalCursesFaced} curses faced`
          : 'No curse cards showed up this round.',
      tone: 'warning',
    },
    {
      id: 'chaos',
      label: 'Chaos Meter',
      headline:
        totalPublicImpact > 0
          ? `${totalPublicImpact} total public-card swing`
          : 'Low-chaos round',
      detail:
        awardById.chaosAgent?.supportingStat ??
        `${roundState.holeCards.filter((holeCardsState) => holeCardsState.publicCards.length > 0).length} holes had public cards`,
      tone: totalPublicImpact >= 12 ? 'warning' : 'neutral',
    },
    {
      id: 'standout',
      label: 'Standout Performance',
      headline: standoutGamePointsRow
        ? `${standoutGamePointsRow.playerName} posted ${formatSignedPoints(
            standoutGamePointsRow.gamePoints,
          )}`
        : '-',
      detail: standoutGamePointsRow
        ? `Adjusted ${standoutGamePointsRow.adjustedScore}`
        : 'No standout recorded.',
      tone: 'accent',
    },
  ]

  const playerIdentityRows: PlayerIdentityRow[] = roundState.players
    .map((player, playerIndex) => {
      const playerName = getDisplayPlayerName(player.name, playerIndex)
      const profile = getPlayerProfileByName(localIdentityState, playerName)
      const badge = profile ? getPlayerIdentityBadge(profile) : null

      return {
        playerId: player.id,
        playerName,
        badgeLabel: badge?.label ?? 'Rookie Spark',
        badgeDetail: badge?.detail ?? 'First local round',
        roundsPlayed: profile?.roundsPlayed ?? 1,
        wins: profile?.wins ?? 0,
      }
    })
    .sort((left, right) => {
      if (left.roundsPlayed !== right.roundsPlayed) {
        return right.roundsPlayed - left.roundsPlayed
      }

      return right.wins - left.wins
    })

  useEffect(() => {
    setLocalIdentityState(recordCompletedRoundIdentity(roundState))
  }, [roundState])

  useEffect(() => {
    if (!hasTrackedRoundSummaryRef.current) {
      hasTrackedRoundSummaryRef.current = true
      trackSummaryScreenViewed(roundState, 'end_round', roundState.holes.length)
      trackRoundCompleted(roundState)
    }

    if (!hasTrackedMajorAwardsRef.current) {
      hasTrackedMajorAwardsRef.current = true
      trackAwardsViewed(roundState, 'signature', majorAwards.length)
    }
  }, [majorAwards.length, roundState])

  useEffect(() => {
    if (!shareToast) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setShareToast(null)
    }, 3400)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [shareToast])

  const shareRecap = async () => {
    if (isSharingRecap) {
      return
    }

    setIsSharingRecap(true)

    try {
      const appUrl = window.location.href
      const recapPayload = buildRoundRecapPayload(roundState)
      const recapText = formatRoundRecapText(recapPayload, appUrl)
      const recapImageBlob = await buildRoundRecapImageBlob(recapPayload, appUrl)
      const recapImageFile = recapImageBlob ? createRecapImageFile(recapImageBlob) : null
      const nativeShareResult = await tryNativeShareRecap({
        title: 'Gimme Golf Round Recap',
        text: recapText,
        url: appUrl,
        imageFile: recapImageFile,
      })

      if (nativeShareResult === 'shared') {
        trackRecapShareAction(roundState, 'shared')
        setShareToast({
          message: 'Recap shared.',
          tone: 'success',
        })
        return
      }

      if (nativeShareResult === 'cancelled') {
        trackRecapShareAction(roundState, 'cancelled')
        setShareToast({
          message: 'Share canceled.',
          tone: 'warning',
        })
        return
      }

      const isCopied = await copyRecapTextToClipboard(recapText)
      if (isCopied) {
        const isDownloaded = recapImageBlob ? downloadRecapImage(recapImageBlob) : false
        trackRecapShareAction(roundState, isDownloaded ? 'downloaded' : 'copied')
        setShareToast({
          message: isDownloaded ? 'Recap copied. Image downloaded.' : 'Recap copied to clipboard.',
          tone: 'success',
        })
        return
      }

      const isDownloaded = recapImageBlob ? downloadRecapImage(recapImageBlob) : false
      if (isDownloaded) {
        trackRecapShareAction(roundState, 'downloaded')
        setShareToast({
          message: 'Clipboard unavailable. Image downloaded.',
          tone: 'warning',
        })
        return
      }

      trackRecapShareAction(roundState, 'unsupported')
      setShareToast({
        message: 'Unable to share recap on this browser.',
        tone: 'error',
      })
    } catch {
      trackRecapShareAction(roundState, 'error')
      setShareToast({
        message: 'Unable to prepare recap share right now.',
        tone: 'error',
      })
    } finally {
      setIsSharingRecap(false)
    }
  }

  const runItBack = () => {
    const nextRoundState = resetRoundProgress(roundState)
    trackRoundStarted(nextRoundState, 'end_round_run_it_back')
    onResetRound()
    onNavigate('holePlay')
  }

  const editBeforeNextRound = () => {
    onResetRound()
    onNavigate('roundSetup')
  }

  return (
    <section className="screen stack-sm end-round-screen">
      <header className="screen__header end-round-header">
        <div className="screen-title">
          <AppIcon className="screen-title__icon" icon={ICONS.leaderboard} />
          <h2>Round Summary</h2>
        </div>
        <p className="muted">Final recap after {roundState.holes.length} holes. Ceremony time.</p>
      </header>

      <section className="panel end-round-hero stack-xs" aria-live="polite">
        <p className="label">Round Winner</p>
        <p className="end-round-hero__title">
          {heroWinnerNames !== '-' ? `${heroWinnerNames} ${adjustedWinnerRows.length > 1 ? 'Win' : 'Wins'} The Round` : 'Round Complete'}
        </p>
        <div className="end-round-hero__metrics">
          <div className="end-round-hero__metric">
            <span className="label">Game Points</span>
            <strong className={heroWinnerRow ? getScoreToneClass(heroWinnerRow.gamePoints) : 'score-neutral'}>
              {heroWinnerRow ? formatSignedPoints(heroWinnerRow.gamePoints) : '-'}
            </strong>
          </div>
          <div className="end-round-hero__metric">
            <span className="label">Adjusted Score</span>
            <strong className="score-neutral">{heroWinnerRow ? heroWinnerRow.adjustedScore : '-'}</strong>
          </div>
        </div>
      </section>

      <section className="panel end-round-share-card stack-sm" aria-label="Share-ready round summary card">
        <div className="row-between end-round-share-card__header">
          <span className="chip">Share Ready</span>
          <span className="end-round-share-card__meta">
            {roundState.holes.length} holes • {gameModeLabel}
          </span>
        </div>

        <div className="stack-xs end-round-share-card__winner-block">
          <p className="label">Champion</p>
          <h3 className="end-round-share-card__winner">
            {heroWinnerNames !== '-' ? heroWinnerNames : 'Round Complete'}
          </h3>
          <p className="muted end-round-share-card__winner-sub">
            {adjustedWinner.value !== null
              ? `Best adjusted score: ${adjustedWinner.value}`
              : 'Adjusted leaderboard locked in.'}
          </p>
        </div>

        <section className="stack-xs end-round-share-card__leaders" aria-label="Top leaderboard rows">
          <div className="end-round-share-card__leaders-header">
            <span>Top 3</span>
            <span>Adjusted</span>
            <span>Points</span>
          </div>
          <ol className="list-reset end-round-share-card__leaders-list">
            {leaderboardTopRows.map((row, index) => (
              <li key={row.playerId} className="end-round-share-card__leader-row">
                <span className="end-round-share-card__leader-name">
                  {index + 1}. {row.playerName}
                </span>
                <span className="end-round-share-card__leader-metric">{row.adjustedScore}</span>
                <span
                  className={`end-round-share-card__leader-metric ${getScoreToneClass(row.gamePoints)}`}
                >
                  {formatSignedPoints(row.gamePoints)}
                </span>
              </li>
            ))}
          </ol>
        </section>

        <p className="muted end-round-share-card__hint">
          Screenshot this card, or tap Share Recap for native share/copy/download options.
        </p>
      </section>

      <section className="panel inset stack-xs end-round-next-round">
        <div className="row-between">
          <p className="label">Replay Path</p>
          <span className="chip">Round Two Ready</span>
        </div>
        <p className="end-round-next-round__title">Keep this group rolling?</p>
        <p className="muted">
          Run It Back jumps straight to Hole 1 with the same group and mode. Choose New Mode to
          tweak setup first.
        </p>
        <p className="muted end-round-next-round__meta">
          {replayGroupLabel} • {roundState.holes.length} holes • {gameModeLabel}
        </p>
      </section>

      <section className="panel stack-xs end-round-fun-highlights">
        <div className="row-between">
          <h3>Fun Highlights</h3>
          <span className="chip">Round Story</span>
        </div>
        <p className="muted">{awardsSummary.roundPersonalityLine}</p>
        <div className="end-round-highlights-grid" role="list" aria-label="Round highlights">
          {funHighlights.map((highlight) => (
            <article
              key={highlight.id}
              className={`end-round-highlight end-round-highlight--${highlight.tone}`}
              role="listitem"
            >
              <p className="end-round-highlight__label">{highlight.label}</p>
              <p className="end-round-highlight__headline">{highlight.headline}</p>
              <p className="end-round-highlight__detail">{highlight.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="panel stack-xs end-round-identity">
        <div className="row-between">
          <h3>Group Tendencies</h3>
          <span className="chip">Local Memory</span>
        </div>
        <p className="muted">Lightweight identity badges built from rounds on this device.</p>
        <ul className="list-reset end-round-identity__list">
          {playerIdentityRows.map((identityRow) => (
            <li key={identityRow.playerId} className="end-round-identity__row">
              <div className="stack-xs end-round-identity__player">
                <p className="end-round-identity__name">{identityRow.playerName}</p>
                <p className="muted end-round-identity__detail">{identityRow.badgeDetail}</p>
              </div>
              <div className="end-round-identity__meta">
                <span className="chip">{identityRow.badgeLabel}</span>
                <span className="muted">
                  {identityRow.roundsPlayed} round{identityRow.roundsPlayed === 1 ? '' : 's'} •{' '}
                  {identityRow.wins} win{identityRow.wins === 1 ? '' : 's'}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel stack-xs end-round-results">
        <div className="row-between">
          <h3>Round Results</h3>
          <span className="chip">Final Leaders</span>
        </div>
        <div className="end-round-results__list">
          <div className="end-round-results__row">
            <span className="end-round-results__label">Lowest Real Score</span>
            <span className="end-round-results__value score-neutral">
              {realWinner.names} {realWinner.value !== null ? `(${realWinner.value})` : ''}
            </span>
          </div>
          <div className="end-round-results__row">
            <span className="end-round-results__label">Most Game Points</span>
            <span className={`end-round-results__value ${getScoreToneClass(pointsWinner.value ?? 0)}`}>
              {pointsWinner.names} {pointsWinner.value !== null ? `(${formatSignedPoints(pointsWinner.value)})` : ''}
            </span>
          </div>
          <div className="end-round-results__row">
            <span className="end-round-results__label">Best Adjusted Score</span>
            <span className="end-round-results__value score-neutral">
              {adjustedWinner.names} {adjustedWinner.value !== null ? `(${adjustedWinner.value})` : ''}
            </span>
          </div>
        </div>
      </section>

      <section className="panel inset stack-xs end-round-score-clarity">
        <p className="label">Scoring Clarity</p>
        <p className="muted">
          Real score is your golf score and is never modified by cards. Game points come from
          side-game outcomes. Adjusted score combines both by subtracting points from real score.
        </p>
      </section>

      <LeaderboardTable
        title="Round Leaderboard"
        rows={leaderboardRows}
        momentumByPlayerId={momentumByPlayerId}
      />

      <section className="panel stack-xs end-round-awards-major">
        <div className="row-between">
          <h3>Signature Awards</h3>
          <span className="chip">{majorAwards.length} major</span>
        </div>
        <div className="end-round-major-awards-grid" role="list" aria-label="Signature awards">
          {majorAwards.map((award) => (
            <article
              key={award.awardId}
              className="award-row award-row--major end-round-award-card"
              role="listitem"
            >
              <div className="row-between">
                <p className="award-title">{award.awardName}</p>
                <span className="chip">{award.shortLabel}</span>
              </div>
              <p className="award-winner">
                {formatPlayerNames(award.winners.map((winner) => winner.playerName))}
                {award.isTie ? ' (Tie)' : ''}
              </p>
              <p className="award-explanation">{award.explanation}</p>
              <p className="award-stat">{award.supportingStat}</p>
            </article>
          ))}
        </div>
      </section>

      {funAwards.length > 0 && (
        <section className="panel stack-xs end-round-awards">
          <details
            onToggle={(event) => {
              if (event.currentTarget.open) {
                trackAwardsViewed(roundState, 'additional', funAwards.length)
              }
            }}
          >
            <summary className="end-round-disclosure__summary row-between">
              <h3>More Awards</h3>
              <span className="chip">{funAwards.length}</span>
            </summary>
            <div className="award-carousel" role="list" aria-label="Additional awards">
              {funAwards.map((award) => (
                <article
                  key={award.awardId}
                  className="award-row award-row--fun end-round-award-card"
                  role="listitem"
                >
                  <div className="row-between">
                    <p className="award-title">{award.awardName}</p>
                    <span className="chip">{award.shortLabel}</span>
                  </div>
                  <p className="award-winner">
                    {formatPlayerNames(award.winners.map((winner) => winner.playerName))}
                    {award.isTie ? ' (Tie)' : ''}
                  </p>
                  <p className="award-explanation">{award.explanation}</p>
                  <p className="award-stat">{award.supportingStat}</p>
                </article>
              ))}
            </div>
          </details>
        </section>
      )}

      {holeHighlightSnippets.length > 0 && (
        <section className="panel stack-xs end-round-hole-highlights">
          <div className="row-between">
            <h3>Hole Highlights</h3>
            <span className="chip">Top {holeHighlightSnippets.length}</span>
          </div>
          <ul className="list-reset end-round-hole-highlights__list">
            {holeHighlightSnippets.map((snippet) => (
              <li
                key={snippet.id}
                className={`end-round-hole-highlight end-round-hole-highlight--${snippet.tone}`}
              >
                <p className="end-round-hole-highlight__title">{snippet.title}</p>
                <p className="end-round-hole-highlight__detail">{snippet.detail}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="panel stack-xs end-round-holes">
        <details>
          <summary className="end-round-disclosure__summary row-between">
            <h3>Per-Hole Summary</h3>
            <span className="chip">Tap to Expand</span>
          </summary>
          <p className="muted">
            {roundState.config.gameMode === 'powerUps'
              ? 'Compact scorecards. Tap a hole for full detail.'
              : 'Compact scorecards with point swings. Tap a hole for full detail.'}
          </p>
          <HoleSummaryList
            players={roundState.players}
            holes={roundState.holes}
            holeCards={roundState.holeCards}
            holeResults={roundState.holeResults}
            momentumEnabled={roundState.config.toggles.momentumBonuses}
            gameMode={roundState.config.gameMode}
          />
        </details>
      </section>

      {shareToast && (
        <aside
          className={`end-share-toast end-share-toast--${shareToast.tone}`}
          role="status"
          aria-live="polite"
        >
          {shareToast.message}
        </aside>
      )}

      <section className="end-cta-bar end-cta-bar--with-share end-cta-bar--replay">
        <button type="button" onClick={shareRecap} disabled={isSharingRecap}>
          <AppIcon className="button-icon" icon={ICONS.holeRecap} />
          {isSharingRecap ? 'Preparing Recap...' : 'Share Recap'}
        </button>
        <button
          type="button"
          className="button-primary"
          onClick={runItBack}
        >
          <AppIcon className="button-icon" icon={ICONS.teeOff} />
          Run It Back
        </button>
        <button type="button" onClick={editBeforeNextRound}>
          Same Group, New Mode
        </button>
        <button type="button" onClick={() => onNavigate('home')}>
          Home
        </button>
      </section>
    </section>
  )
}

export default EndRoundScreen
