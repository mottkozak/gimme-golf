import { useEffect, useMemo, useRef, useState } from 'react'
import { ICONS } from '../../app/icons.ts'
import { hapticError, hapticLightImpact, hapticSuccess, hapticWarning } from '../../capacitor/haptics.ts'
import AppIcon from '../../components/AppIcon.tsx'
import RecapLeaderboardCard from '../../components/RecapLeaderboardCard.tsx'
import { getAndroidPlayStoreUrl, getIosAppStoreUrl, getPrimaryStoreShareUrl } from '../../config/appLinks.ts'
import {
  trackAwardsViewed,
  trackRecapInteraction,
  trackRecapShareAction,
  trackRoundCompleted,
  trackSummaryScreenViewed,
} from '../../logic/analytics.ts'
import { formatGolfScoreToPar } from '../../logic/golfScore.ts'
import { buildHolePointBreakdownsByPlayerId } from '../../logic/streaks.ts'
import {
  buildRoundRecapImageBlob,
  buildRoundRecapPayload,
  copyRecapTextToClipboard,
  createRecapImageFile,
  downloadRecapImage,
  formatRoundRecapText,
  tryNativeShareRecap,
} from '../../logic/roundRecapShare.ts'
import { buildLeaderboardEntries } from '../../logic/leaderboard.ts'
import { recordCompletedRoundIdentity } from '../../logic/localIdentity.ts'
import { buildRoundRecapViewModel, type RecapShareTheme } from '../../logic/roundRecapViewModel.ts'
import type { ScreenProps } from '../../app/screenContracts.ts'

/** Distinct strokes for score-vs-par lines (CSS cannot vary per path reliably). */
const SCORE_VS_PAR_LINE_COLORS = [
  '#0d6e4a',
  '#1565c0',
  '#c62828',
  '#6a1b9a',
  '#ef6c00',
  '#00838f',
  '#ad1457',
  '#37474f',
]

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function getContrastTextColor(hexColor: string): string {
  const sanitized = hexColor.replace('#', '')
  if (sanitized.length !== 6) {
    return '#ffffff'
  }
  const red = Number.parseInt(sanitized.slice(0, 2), 16)
  const green = Number.parseInt(sanitized.slice(2, 4), 16)
  const blue = Number.parseInt(sanitized.slice(4, 6), 16)
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255
  return luminance > 0.62 ? '#1f1d1a' : '#ffffff'
}

function getAwardWinnerColor(
  winnerLine: string,
  playerColorsByName: Record<string, string>,
  fallbackColor: string,
): string {
  const normalizedWinnerLine = winnerLine.trim().toLowerCase()
  if (!normalizedWinnerLine) {
    return fallbackColor
  }

  const exactColor = playerColorsByName[normalizedWinnerLine]
  if (exactColor) {
    return exactColor
  }

  const matchedEntry = Object.entries(playerColorsByName).find(([playerName]) =>
    normalizedWinnerLine.includes(playerName),
  )
  return matchedEntry?.[1] ?? fallbackColor
}

type ArchetypeTheme = 'heartbreaker' | 'clutch' | 'chaos' | 'neutral'

function getArchetypeTheme(title: string): ArchetypeTheme {
  const normalizedTitle = title.toLowerCase()
  if (normalizedTitle.includes('heartbreaker') || normalizedTitle.includes('cursed')) {
    return 'heartbreaker'
  }
  if (
    normalizedTitle.includes('chaos') ||
    normalizedTitle.includes('gambler') ||
    normalizedTitle.includes('rollercoaster')
  ) {
    return 'chaos'
  }
  if (
    normalizedTitle.includes('closer') ||
    normalizedTitle.includes('sniper') ||
    normalizedTitle.includes('pace setter') ||
    normalizedTitle.includes('heater')
  ) {
    return 'clutch'
  }
  return 'neutral'
}

function getArchetypeAccent(title: string): string {
  const normalizedTitle = title.toLowerCase()
  if (normalizedTitle.includes('heater')) return 'heater'
  if (normalizedTitle.includes('sniper')) return 'sniper'
  if (normalizedTitle.includes('heartbreaker')) return 'heartbreaker'
  if (normalizedTitle.includes('chaos')) return 'chaos'
  if (normalizedTitle.includes('closer')) return 'closer'
  if (normalizedTitle.includes('gambler')) return 'gambler'
  if (normalizedTitle.includes('strategist')) return 'strategist'
  if (normalizedTitle.includes('rollercoaster')) return 'rollercoaster'
  if (normalizedTitle.includes('balanced')) return 'balanced'
  if (normalizedTitle.includes('pace setter')) return 'pace-setter'
  if (normalizedTitle.includes('rebuilder')) return 'rebuilder'
  if (normalizedTitle.includes('wall')) return 'wall'
  if (normalizedTitle.includes('cursed')) return 'cursed'
  return 'default'
}

function getArchetypeEmoji(title: string): string {
  const normalizedTitle = title.toLowerCase()
  if (normalizedTitle.includes('heartbreaker')) return '💔'
  if (normalizedTitle.includes('chaos')) return '⚡'
  if (normalizedTitle.includes('closer')) return '🏁'
  if (normalizedTitle.includes('sniper')) return '🎯'
  if (normalizedTitle.includes('gambler')) return '🎲'
  if (normalizedTitle.includes('strategist')) return '🧠'
  if (normalizedTitle.includes('heater')) return '🔥'
  if (normalizedTitle.includes('rollercoaster')) return '🎢'
  if (normalizedTitle.includes('balanced')) return '⚖️'
  if (normalizedTitle.includes('pace setter')) return '🚩'
  if (normalizedTitle.includes('rebuilder')) return '🛠️'
  if (normalizedTitle.includes('wall')) return '🧱'
  return '⭐'
}

type AwardCardTone = 'mvp' | 'comeback' | 'ice' | 'mission' | 'default'

function getAwardCardTone(awardId: string): AwardCardTone {
  if (awardId === 'mvp') {
    return 'mvp'
  }
  if (awardId === 'comeback' || awardId === 'biggestComeback') {
    return 'comeback'
  }
  if (awardId === 'clutch' || awardId === 'mostClutch') {
    return 'ice'
  }
  if (awardId === 'mission-king' || awardId === 'missionMachine') {
    return 'mission'
  }
  return 'default'
}

function getAwardCardEmoji(awardId: string): string {
  if (awardId === 'mvp') {
    return '🧠'
  }
  if (awardId === 'comeback' || awardId === 'biggestComeback') {
    return '🔥'
  }
  if (awardId === 'clutch' || awardId === 'mostClutch') {
    return '🧊'
  }
  if (awardId === 'mission-king' || awardId === 'missionMachine') {
    return '👑'
  }
  return '🏅'
}

function EndRoundScreen({ roundState, onNavigate }: ScreenProps) {
  const isPowerUpsMode = roundState.config.gameMode === 'powerUps'
  const [isSharingRecap, setIsSharingRecap] = useState(false)
  const [shareToast, setShareToast] = useState<{
    message: string
    tone: 'success' | 'warning' | 'error'
  } | null>(null)
  const [shareTheme] = useState<RecapShareTheme>('champion')
  const [heroStep, setHeroStep] = useState(0)
  const [isReduceMotionPreferred, setIsReduceMotionPreferred] = useState(false)
  const [graphInView, setGraphInView] = useState(false)
  const [animatedHoleIndex, setAnimatedHoleIndex] = useState(0)
  const [scrubHoleIndex, setScrubHoleIndex] = useState<number | null>(null)
  const [isScrubbingGraph, setIsScrubbingGraph] = useState(false)
  const hasTrackedRoundSummaryRef = useRef(false)
  const hasPersistedIdentityRef = useRef(false)
  const graphRef = useRef<HTMLDivElement | null>(null)

  const recapViewModel = useMemo(() => buildRoundRecapViewModel(roundState), [roundState])
  const roundLeaderboardRows = useMemo(
    () =>
      buildLeaderboardEntries(
        roundState.players,
        roundState.totalsByPlayerId,
        isPowerUpsMode ? 'realScore' : 'adjustedScore',
      ),
    [isPowerUpsMode, roundState.players, roundState.totalsByPlayerId],
  )
  const roundEvenParTotal = useMemo(
    () => roundState.holes.reduce((sum, hole) => sum + hole.par, 0),
    [roundState.holes],
  )
  const scoreToParProgression = useMemo(() => {
    const holes = roundState.holes.map((hole) => hole.holeNumber)
    const pointBreakdownsByPlayerId = buildHolePointBreakdownsByPlayerId(
      roundState.players,
      roundState.holes,
      roundState.holeCards,
      roundState.holeResults,
      roundState.config.toggles.momentumBonuses,
    )

    const lines = roundState.players.map((player, playerIndex) => {
      let runningScore = 0
      let runningPar = 0
      const cumulativeScoreToParByHole = roundState.holes.map((hole, holeIndex) => {
        runningPar += hole.par
        const strokes = roundState.holeResults[holeIndex]?.strokesByPlayerId[player.id]
        if (typeof strokes === 'number') {
          if (isPowerUpsMode) {
            runningScore += strokes
          } else {
            const holePoints = pointBreakdownsByPlayerId[player.id]?.[holeIndex]?.total ?? 0
            runningScore += strokes - holePoints
          }
        }
        return runningScore - runningPar
      })

      return {
        playerId: player.id,
        playerName: player.name.trim().length > 0 ? player.name : `Player ${playerIndex + 1}`,
        cumulativeScoreToParByHole,
        isWinner: recapViewModel.adjustedWinnerPlayerIds.includes(player.id),
      }
    })

    const leaderByHole = holes.map((_, holeIndex) => {
      if (lines.length === 0) {
        return null
      }
      const lowestAdjustedToPar = Math.min(
        ...lines.map((line) => line.cumulativeScoreToParByHole[holeIndex] ?? 0),
      )
      const leaders = lines.filter(
        (line) => (line.cumulativeScoreToParByHole[holeIndex] ?? 0) === lowestAdjustedToPar,
      )
      return leaders.length === 1 ? leaders[0].playerId : null
    })

    return {
      holes,
      lines,
      leaderByHole,
    }
  }, [
    isPowerUpsMode,
    recapViewModel.adjustedWinnerPlayerIds,
    roundState.config.toggles.momentumBonuses,
    roundState.holeCards,
    roundState.holeResults,
    roundState.holes,
    roundState.players,
  ])
  const activeRecapPayload = useMemo(
    () => buildRoundRecapPayload(roundState, { theme: shareTheme }),
    [roundState, shareTheme],
  )
  const progressionHoleCount = scoreToParProgression.holes.length
  const lastHoleIndex = Math.max(0, progressionHoleCount - 1)
  const visibleHoleIndex = scrubHoleIndex ?? animatedHoleIndex

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const applyPreference = () => {
      const prefersReducedMotion = mediaQuery.matches
      setIsReduceMotionPreferred(prefersReducedMotion)
      if (prefersReducedMotion) {
        setHeroStep(2)
        setAnimatedHoleIndex(lastHoleIndex)
      }
    }
    applyPreference()
    mediaQuery.addEventListener('change', applyPreference)
    return () => mediaQuery.removeEventListener('change', applyPreference)
  }, [lastHoleIndex])

  useEffect(() => {
    if (isReduceMotionPreferred || heroStep >= 2) {
      return
    }
    const timeoutId = window.setTimeout(() => {
      setHeroStep((current) => Math.min(2, current + 1))
    }, 200)
    return () => window.clearTimeout(timeoutId)
  }, [heroStep, isReduceMotionPreferred])

  useEffect(() => {
    if (hasTrackedRoundSummaryRef.current) {
      return
    }
    hasTrackedRoundSummaryRef.current = true
    trackSummaryScreenViewed(roundState, 'end_round', roundState.holes.length)
    trackRoundCompleted(roundState)
    trackAwardsViewed(roundState, 'signature', recapViewModel.awards.cards.length)
  }, [recapViewModel.awards.cards.length, roundState])

  useEffect(() => {
    if (hasPersistedIdentityRef.current) {
      return
    }

    hasPersistedIdentityRef.current = true
    recordCompletedRoundIdentity(roundState)
  }, [roundState])

  useEffect(() => {
    if (!graphRef.current || typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
      setGraphInView(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setGraphInView(true)
          observer.disconnect()
        }
      },
      { threshold: 0.35 },
    )
    observer.observe(graphRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (isReduceMotionPreferred) {
      setAnimatedHoleIndex(lastHoleIndex)
      return
    }
    if (!graphInView || isScrubbingGraph || scrubHoleIndex !== null || animatedHoleIndex >= lastHoleIndex) {
      return
    }
    const timeoutId = window.setTimeout(() => {
      setAnimatedHoleIndex((current) => Math.min(lastHoleIndex, current + 1))
    }, 95)
    return () => window.clearTimeout(timeoutId)
  }, [
    animatedHoleIndex,
    graphInView,
    isReduceMotionPreferred,
    isScrubbingGraph,
    lastHoleIndex,
    scrubHoleIndex,
  ])

  useEffect(() => {
    setAnimatedHoleIndex(0)
    setScrubHoleIndex(null)
    setHeroStep(0)
  }, [roundState])

  useEffect(() => {
    if (!shareToast) {
      return
    }
    const timeoutId = window.setTimeout(() => setShareToast(null), 3400)
    return () => window.clearTimeout(timeoutId)
  }, [shareToast])

  const updateScrubHoleIndex = (clientX: number) => {
    const graphElement = graphRef.current
    if (!graphElement || progressionHoleCount <= 1) {
      setScrubHoleIndex(0)
      return
    }
    const rect = graphElement.getBoundingClientRect()
    const relativeX = clamp((clientX - rect.left) / Math.max(rect.width, 1), 0, 1)
    const nextIndex = Math.round(relativeX * (progressionHoleCount - 1))
    setScrubHoleIndex(nextIndex)
    trackRecapInteraction(
      roundState,
      'story_beat_opened',
      `hole_${scoreToParProgression.holes[nextIndex] ?? nextIndex + 1}`,
      shareTheme,
    )
  }

  const shareRecap = async () => {
    if (isSharingRecap) {
      return
    }

    setIsSharingRecap(true)
    try {
      const iosStoreUrl = getIosAppStoreUrl()
      const androidStoreUrl = getAndroidPlayStoreUrl()
      const shareUrl = getPrimaryStoreShareUrl(window.navigator.userAgent, window.location.href)
      const recapText = formatRoundRecapText(activeRecapPayload, {
        ios: iosStoreUrl,
        android: androidStoreUrl,
      })
      const recapImageBlob = await buildRoundRecapImageBlob(activeRecapPayload, shareUrl)
      const recapImageFile = recapImageBlob ? createRecapImageFile(recapImageBlob) : null
      const nativeShareResult = await tryNativeShareRecap({
        title: `Gimme Golf ${activeRecapPayload.themeTitle}`,
        text: recapText,
        url: shareUrl,
        imageFile: recapImageFile,
      })

      if (nativeShareResult === 'shared') {
        trackRecapShareAction(roundState, 'shared')
        hapticSuccess()
        setShareToast({ message: 'Recap shared.', tone: 'success' })
        return
      }
      if (nativeShareResult === 'cancelled') {
        trackRecapShareAction(roundState, 'cancelled')
        hapticWarning()
        setShareToast({ message: 'Share canceled.', tone: 'warning' })
        return
      }

      const isCopied = await copyRecapTextToClipboard(recapText)
      if (isCopied) {
        const isDownloaded = recapImageBlob ? downloadRecapImage(recapImageBlob) : false
        trackRecapShareAction(roundState, isDownloaded ? 'downloaded' : 'copied')
        hapticSuccess()
        setShareToast({
          message: isDownloaded ? 'Recap copied. Image downloaded.' : 'Recap copied to clipboard.',
          tone: 'success',
        })
        return
      }

      const isDownloaded = recapImageBlob ? downloadRecapImage(recapImageBlob) : false
      if (isDownloaded) {
        trackRecapShareAction(roundState, 'downloaded')
        hapticWarning()
        setShareToast({ message: 'Clipboard unavailable. Image downloaded.', tone: 'warning' })
        return
      }

      trackRecapShareAction(roundState, 'unsupported')
      hapticError()
      setShareToast({ message: 'Unable to share recap on this browser.', tone: 'error' })
    } catch {
      trackRecapShareAction(roundState, 'error')
      hapticError()
      setShareToast({ message: 'Unable to prepare recap share right now.', tone: 'error' })
    } finally {
      setIsSharingRecap(false)
    }
  }

  const goHome = () => {
    hapticLightImpact()
    onNavigate('home')
  }

  const chartWidth = 640
  const chartHeight = 260
  // Give Y-axis labels enough room so "Even" and signed ticks are not clipped.
  const chartPadding = 40
  const visibleLineValues = scoreToParProgression.lines.flatMap((line) =>
    line.cumulativeScoreToParByHole.slice(0, visibleHoleIndex + 1),
  )
  const minValue = visibleLineValues.length > 0 ? Math.min(0, ...visibleLineValues) : -1
  const maxValue = visibleLineValues.length > 0 ? Math.max(0, ...visibleLineValues) : 1
  const valueSpan = Math.max(1, maxValue - minValue)
  const getX = (holeIndex: number): number =>
    chartPadding +
    (holeIndex / Math.max(1, progressionHoleCount - 1)) * (chartWidth - chartPadding * 2)
  const getY = (value: number): number =>
    chartHeight - chartPadding - ((value - minValue) / valueSpan) * (chartHeight - chartPadding * 2)
  const parLineY = getY(0)
  const activeLeaderId = scoreToParProgression.leaderByHole[visibleHoleIndex] ?? null
  const visibleCallouts = isPowerUpsMode
    ? []
    : recapViewModel.progression.callouts.filter(
        (callout) => callout.holeNumber <= (scoreToParProgression.holes[visibleHoleIndex] ?? 0),
      )
  const playerColorByName = useMemo(
    () =>
      Object.fromEntries(
        scoreToParProgression.lines.map((line, lineIndex) => [
          line.playerName.trim().toLowerCase(),
          SCORE_VS_PAR_LINE_COLORS[lineIndex % SCORE_VS_PAR_LINE_COLORS.length],
        ]),
      ),
    [scoreToParProgression.lines],
  )
  const finalHoleIndex = Math.max(0, scoreToParProgression.holes.length - 1)
  const finalBestScoreToPar =
    scoreToParProgression.lines.length > 0
      ? Math.min(
          ...scoreToParProgression.lines.map(
            (line) => line.cumulativeScoreToParByHole[finalHoleIndex] ?? 0,
          ),
        )
      : 0
  const toParInsight = isPowerUpsMode
    ? `Best actual finish closed at ${formatGolfScoreToPar(finalBestScoreToPar)}.`
    : `Best adjusted finish closed at ${formatGolfScoreToPar(finalBestScoreToPar)}.`
  const showInsight = visibleHoleIndex >= lastHoleIndex
  const yTickStep = valueSpan > 14 ? 2 : 1
  const yTickMin = Math.floor(minValue / yTickStep) * yTickStep
  const yTickMax = Math.ceil(maxValue / yTickStep) * yTickStep
  const yTicks = Array.from(
    { length: Math.max(0, Math.round((yTickMax - yTickMin) / yTickStep)) + 1 },
    (_, index) => yTickMin + index * yTickStep,
  )
  const xTickHoleIndices = Array.from({ length: progressionHoleCount }, (_, index) => index).filter(
    (index) =>
      progressionHoleCount <= 9 ||
      index === 0 ||
      index === progressionHoleCount - 1 ||
      (index + 1) % 2 === 0,
  )
  const winnerRow =
    recapViewModel.winnerHero.fullTableRows.find((row) => row.isWinner) ??
    recapViewModel.winnerHero.fullTableRows[0] ??
    null
  const heroTitle = recapViewModel.winnerHero.title.endsWith('!')
    ? recapViewModel.winnerHero.title
    : `${recapViewModel.winnerHero.title}!`
  const podiumRows = recapViewModel.winnerHero.scoreboardRows.slice(0, 3)
  const podiumSlots = [
    { row: podiumRows[1], place: 2, medal: '🥈', tone: 'silver' },
    { row: podiumRows[0], place: 1, medal: '🥇', tone: 'gold' },
    { row: podiumRows[2], place: 3, medal: '🥉', tone: 'bronze' },
  ].flatMap((slot) => (slot.row ? [{ ...slot, row: slot.row }] : []))
  const formatRelativeToEven = (value: number): string => {
    if (value === 0) {
      return 'E'
    }
    return `${value > 0 ? '+' : ''}${value}`
  }
  return (
    <section className="screen stack-sm end-round-screen end-round-story">
      <header className="screen__header end-round-header">
        <div className="screen-title">
          <AppIcon className="screen-title__icon" icon={ICONS.leaderboard} />
          <h2>Round Recap</h2>
        </div>
      </header>

      <section className="panel stack-sm end-round-story-hero" aria-live="polite">
        <p className={`end-round-story-hero__trophy ${heroStep >= 0 ? 'is-visible' : ''}`}>🏆</p>
        <h3 className={`end-round-story-hero__title ${heroStep >= 0 ? 'is-visible' : ''}`}>
          {heroTitle}
        </h3>
        {podiumSlots.length > 0 && (
          <div className={`end-round-story-hero__podium ${heroStep >= 1 ? 'is-visible' : ''}`}>
            {podiumSlots.map((slot) => (
              <div
                key={slot.row.playerId}
                className={`end-round-story-hero__podium-slot end-round-story-hero__podium-slot--${slot.tone}`}
              >
                <p className="end-round-story-hero__podium-name">
                  <span className="end-round-story-hero__podium-medal" aria-hidden>
                    {slot.medal}
                  </span>
                  <span>{slot.row.playerName}</span>
                </p>
                <div className="end-round-story-hero__podium-block">{slot.place}</div>
              </div>
            ))}
          </div>
        )}
        {winnerRow && (
          <div className={`end-round-story-hero__stats ${heroStep >= 2 ? 'is-visible' : ''}`}>
            <article className="end-round-story-hero__stat">
              <p className="end-round-story-hero__stat-emoji" aria-hidden>
                ⛳
              </p>
              <p className="end-round-story-hero__stat-value">{winnerRow.realScore}</p>
              <p className="end-round-story-hero__stat-label">Total Strokes</p>
            </article>
            {isPowerUpsMode ? (
              <article className="end-round-story-hero__stat">
                <p className="end-round-story-hero__stat-emoji" aria-hidden>
                  📈
                </p>
                <p className="end-round-story-hero__stat-value">
                  {formatRelativeToEven(winnerRow.realScore - roundEvenParTotal)}
                </p>
                <p className="end-round-story-hero__stat-label">Score to Par</p>
              </article>
            ) : (
              <>
                <article className="end-round-story-hero__stat">
                  <p className="end-round-story-hero__stat-emoji" aria-hidden>
                    ✨
                  </p>
                  <p className="end-round-story-hero__stat-value">{winnerRow.gamePoints}</p>
                  <p className="end-round-story-hero__stat-label">Game Points</p>
                </article>
                <article className="end-round-story-hero__stat">
                  <p className="end-round-story-hero__stat-emoji" aria-hidden>
                    📊
                  </p>
                  <p className="end-round-story-hero__stat-value">
                    {formatRelativeToEven(winnerRow.adjustedScore - roundEvenParTotal)}
                  </p>
                  <p className="end-round-story-hero__stat-label">Adjusted Score</p>
                </article>
              </>
            )}
          </div>
        )}
      </section>

      <RecapLeaderboardCard
        title="Final Leaderboard"
        rows={roundLeaderboardRows}
        sortMode={isPowerUpsMode ? 'realScore' : 'adjustedScore'}
        badge={null}
        evenParTotal={roundEvenParTotal}
        metricVisibility={
          isPowerUpsMode
            ? { adjustedScore: false, realScore: true, gamePoints: false }
            : undefined
        }
        legendText={isPowerUpsMode ? 'Actual is pure strokes. Lowest score wins in Power Ups mode.' : undefined}
      />

      <section className="panel stack-sm end-round-story-graph">
        <div className="row-between">
          <h3>{isPowerUpsMode ? 'Actual Score vs Par' : 'Adjusted Score vs Par'}</h3>
          <span className="chip">
            Hole {Math.min(progressionHoleCount, visibleHoleIndex + 1)}/{progressionHoleCount}
          </span>
        </div>
        <div className="end-round-story-graph__frame">
          <div
            className="end-round-story-graph__canvas"
            ref={graphRef}
            onPointerDown={(event) => {
              setIsScrubbingGraph(true)
              updateScrubHoleIndex(event.clientX)
            }}
            onPointerMove={(event) => {
              if (isScrubbingGraph) {
                updateScrubHoleIndex(event.clientX)
              }
            }}
            onPointerUp={() => setIsScrubbingGraph(false)}
            onPointerLeave={() => setIsScrubbingGraph(false)}
            onDoubleClick={() => setScrubHoleIndex(null)}
            role="presentation"
          >
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="end-round-story-graph__svg">
              {yTicks.map((tickValue) => {
                const y = getY(tickValue)
                return (
                  <g key={`y-${tickValue}`}>
                    <line
                      x1={chartPadding}
                      y1={y}
                      x2={chartWidth - chartPadding}
                      y2={y}
                      className="end-round-story-graph__grid-line"
                    />
                    <text x={chartPadding - 8} y={y + 4} className="end-round-story-graph__axis-label" textAnchor="end">
                      {tickValue === 0 ? 'Even' : formatGolfScoreToPar(tickValue)}
                    </text>
                  </g>
                )
              })}
              {xTickHoleIndices.map((holeIndex) => {
                const x = getX(holeIndex)
                return (
                  <g key={`x-${holeIndex}`}>
                    <line
                      x1={x}
                      y1={chartHeight - chartPadding}
                      x2={x}
                      y2={chartHeight - chartPadding + 6}
                      className="end-round-story-graph__axis"
                    />
                    <text
                      x={x}
                      y={chartHeight - chartPadding + 18}
                      className="end-round-story-graph__axis-label"
                      textAnchor="middle"
                    >
                      {scoreToParProgression.holes[holeIndex]}
                    </text>
                  </g>
                )
              })}
              <line
                x1={chartPadding}
                y1={parLineY}
                x2={chartWidth - chartPadding}
                y2={parLineY}
                className="end-round-story-graph__par-line"
              />
              <line
                x1={chartPadding}
                y1={chartPadding}
                x2={chartPadding}
                y2={chartHeight - chartPadding}
                className="end-round-story-graph__axis"
              />
              {scoreToParProgression.lines.map((line, lineIndex) => {
                const points = line.cumulativeScoreToParByHole.slice(0, visibleHoleIndex + 1)
                const d = points
                  .map((value, pointIndex) => `${pointIndex === 0 ? 'M' : 'L'} ${getX(pointIndex)} ${getY(value)}`)
                  .join(' ')
                const strokeColor = SCORE_VS_PAR_LINE_COLORS[lineIndex % SCORE_VS_PAR_LINE_COLORS.length]
                const strokeWidth = line.isWinner ? 3.25 : 2.25
                return (
                  <path
                    key={line.playerId}
                    d={d}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`end-round-story-graph__line ${line.playerId === activeLeaderId ? 'is-leader' : ''} ${line.isWinner ? 'is-winner' : ''}`}
                  />
                )
              })}
            </svg>
          </div>
          <ul
            className="list-reset end-round-story-graph__legend"
            aria-label={isPowerUpsMode ? 'Actual score line legend' : 'Adjusted score line legend'}
          >
            {scoreToParProgression.lines.map((line, lineIndex) => {
              const swatchColor = SCORE_VS_PAR_LINE_COLORS[lineIndex % SCORE_VS_PAR_LINE_COLORS.length]
              const textColor = getContrastTextColor(swatchColor)
              return (
                <li
                  key={`legend-${line.playerId}`}
                  className="end-round-story-graph__legend-item"
                  style={{ backgroundColor: swatchColor, borderColor: swatchColor, color: textColor }}
                >
                  <span className="end-round-story-graph__legend-name">{line.playerName}</span>
                </li>
              )
            })}
          </ul>
          <p className="muted end-round-story-graph__hint">
            {isPowerUpsMode
              ? 'Y-axis shows actual score vs par (Even at 0). Drag to scrub holes.'
              : 'Y-axis shows adjusted score vs par (Even at 0). Drag to scrub holes.'}
          </p>
          {visibleCallouts.length > 0 && (
            <div className="end-round-story-graph__callouts">
              {visibleCallouts.map((callout) => (
                <article key={callout.id} className="end-round-story-graph__callout">
                  <p className="label">
                    Hole {callout.holeNumber} • {callout.title}
                  </p>
                  <p>{callout.detail}</p>
                </article>
              ))}
            </div>
          )}
          {showInsight && <p className="end-round-story-graph__insight">{toParInsight}</p>}
        </div>
      </section>

      <section className="panel stack-sm end-round-story-archetypes end-round-story-vignette">
        <h3>Player Archetypes</h3>
        <p className="muted end-round-story-vignette__lede">
          The roles you played today. Swipe to view all archetypes.
        </p>
        <div className="end-round-story-archetypes__scroller">
          {recapViewModel.archetypes.map((archetype, index) => {
            const theme = getArchetypeTheme(archetype.title)
            return (
              <article
                key={archetype.playerId}
                className={`end-round-story-archetype-card end-round-story-archetype-card--${theme} end-round-story-archetype-card--${getArchetypeAccent(
                  archetype.title,
                )}`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <p className="end-round-story-archetype-card__icon" aria-hidden>
                  {getArchetypeEmoji(archetype.title)}
                </p>
                <p className="end-round-story-archetype-card__name">{archetype.playerName}</p>
                <p className="end-round-story-archetype-card__role">{archetype.title.toUpperCase()}</p>
                <p className="end-round-story-archetype-card__tagline">{archetype.oneLiner}</p>
              </article>
            )
          })}
        </div>
      </section>

      <section className="panel stack-sm end-round-story-awards end-round-story-vignette end-round-story-vignette--awards">
        <h3>Round Awards</h3>
        <p className="muted end-round-story-vignette__lede">Moments worth bragging about.</p>
        <div className="end-round-story-awards__list">
          {recapViewModel.awards.cards.map((award, index) => {
            const awardWinnerColor = getAwardWinnerColor(
              award.winnerLine,
              playerColorByName,
              '#00553b',
            )
            return (
              <article
                key={award.id}
                className={`end-round-story-award-card end-round-story-award-card--${getAwardCardTone(award.id)}`}
                style={{ animationDelay: `${index * 75}ms` }}
              >
                <p className="end-round-story-award-card__icon" aria-hidden>
                  {getAwardCardEmoji(award.id)}
                </p>
                <p className="end-round-story-award-card__title">{award.title}</p>
                <p
                  className="end-round-story-award-card__winner"
                  style={{
                    backgroundColor: awardWinnerColor,
                    borderColor: awardWinnerColor,
                    color: getContrastTextColor(awardWinnerColor),
                  }}
                >
                  {award.winnerLine.toUpperCase()}
                </p>
                <p className="end-round-story-award-card__detail">{award.detail}</p>
              </article>
            )
          })}
        </div>
      </section>

      <section className="panel inset stack-sm end-round-story-actions">
        <button type="button" className="button-primary" onClick={shareRecap} disabled={isSharingRecap}>
          <AppIcon className="button-icon" icon={ICONS.holeRecap} />
          {isSharingRecap ? 'Preparing Recap…' : 'Share Recap'}
        </button>
        <button type="button" className="end-round-story-actions__home" onClick={goHome}>
          <AppIcon className="button-icon" icon="home" />
          Home
        </button>
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
    </section>
  )
}

export default EndRoundScreen
