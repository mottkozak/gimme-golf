import { useLayoutEffect, useRef, type ReactNode } from 'react'
import {
  formatGolfScoreToPar,
  getGolfScoreToneClass,
  type GolfScoreToParByPlayerId,
} from '../logic/golfScore.ts'
import type { LeaderboardSortMode } from '../logic/leaderboard.ts'
import type { LeaderboardEntry } from '../types/game.ts'

interface LeaderboardMomentumValue {
  streak: number
  tierLabel: string
}

const LEADERBOARD_ROW_MOVE_DURATION_MS = 420

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

interface LeaderboardTableProps {
  title: string
  rows: LeaderboardEntry[]
  sortMode?: LeaderboardSortMode
  onSortChange?: (sortMode: LeaderboardSortMode) => void
  momentumByPlayerId?: Record<string, LeaderboardMomentumValue>
  showMomentum?: boolean
  golfScoreToParByPlayerId?: GolfScoreToParByPlayerId
  className?: string
  headerBadge?: ReactNode
  compactLegend?: boolean
  evenParTotal?: number
  metricVisibility?: {
    adjustedScore?: boolean
    realScore?: boolean
    gamePoints?: boolean
  }
  legendText?: string
}

function LeaderboardTable({
  title,
  rows,
  sortMode,
  onSortChange,
  momentumByPlayerId,
  showMomentum,
  golfScoreToParByPlayerId,
  className,
  headerBadge,
  compactLegend = false,
  evenParTotal,
  metricVisibility,
  legendText,
}: LeaderboardTableProps) {
  const rowElementByPlayerIdRef = useRef<Record<string, HTMLTableRowElement | null>>({})
  const rowTopByPlayerIdRef = useRef<Record<string, number>>({})
  const shouldShowMomentum = showMomentum ?? Boolean(momentumByPlayerId)
  const shouldShowGolfScore = Boolean(golfScoreToParByPlayerId)
  const showAdjustedMetric = metricVisibility?.adjustedScore ?? true
  const showRealMetric = metricVisibility?.realScore ?? true
  const showGamePointsMetric = metricVisibility?.gamePoints ?? true
  const formatRelativeToEven = (value: number): string => {
    if (value === 0) {
      return 'E'
    }
    return `${value > 0 ? '+' : ''}${value}`
  }
  const formatScoreWithEvenDelta = (score: number): string => {
    if (typeof evenParTotal !== 'number' || !Number.isFinite(evenParTotal)) {
      return String(score)
    }

    const deltaToEven = score - evenParTotal
    return `${score} (${formatRelativeToEven(deltaToEven)})`
  }

  useLayoutEffect(() => {
    const nextTopByPlayerId: Record<string, number> = {}

    for (const row of rows) {
      const rowElement = rowElementByPlayerIdRef.current[row.playerId]
      if (!rowElement) {
        continue
      }

      const nextTop = rowElement.getBoundingClientRect().top
      nextTopByPlayerId[row.playerId] = nextTop

      if (prefersReducedMotion()) {
        rowElement.style.transform = ''
        rowElement.style.transition = ''
        continue
      }

      const previousTop = rowTopByPlayerIdRef.current[row.playerId]
      if (typeof previousTop !== 'number') {
        continue
      }

      const deltaY = previousTop - nextTop
      if (Math.abs(deltaY) < 1) {
        continue
      }

      rowElement.style.transition = 'transform 0ms'
      rowElement.style.transform = `translateY(${deltaY}px)`

      window.requestAnimationFrame(() => {
        rowElement.style.transition = `transform ${LEADERBOARD_ROW_MOVE_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`
        rowElement.style.transform = 'translateY(0)'

        window.setTimeout(() => {
          if (rowElementByPlayerIdRef.current[row.playerId] !== rowElement) {
            return
          }

          rowElement.style.transition = ''
        }, LEADERBOARD_ROW_MOVE_DURATION_MS)
      })
    }

    rowTopByPlayerIdRef.current = nextTopByPlayerId
  }, [rows])

  const renderSortButton = (label: string, mode: LeaderboardSortMode) => {
    if (!onSortChange) {
      return <span>{label}</span>
    }

    return (
      <button
        type="button"
        className={`table-sort-button ${sortMode === mode ? 'active' : ''}`}
        onClick={() => onSortChange(mode)}
      >
        {label}
      </button>
    )
  }

  return (
    <div className={['panel', 'stack-xs', className ?? ''].filter(Boolean).join(' ')}>
      <div className="row-between">
        <strong>{title}</strong>
        {headerBadge === undefined ? <span className="chip">#{rows[0]?.playerName ?? '-'}</span> : headerBadge}
      </div>
      <div className="leaderboard-scroll">
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th className="leaderboard-table__th leaderboard-table__th--rank">Rank</th>
              <th className="leaderboard-table__th leaderboard-table__th--player">Player</th>
              {shouldShowMomentum && <th className="leaderboard-table__th">Heat</th>}
              {showAdjustedMetric && (
                <th className="leaderboard-table__th leaderboard-table__th--metric">
                  {renderSortButton('Adjusted', 'adjustedScore')}
                </th>
              )}
              {showRealMetric && (
                <th className="leaderboard-table__th leaderboard-table__th--metric">
                  {renderSortButton('Actual', 'realScore')}
                </th>
              )}
              {showGamePointsMetric && (
                <th className="leaderboard-table__th leaderboard-table__th--metric">
                  {renderSortButton('Game Pts', 'gamePoints')}
                </th>
              )}
              {shouldShowGolfScore && <th className="leaderboard-table__th leaderboard-table__th--metric">Golf</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={row.playerId}
                className={`leaderboard-table__row ${index === 0 ? 'leaderboard-table__row--leader' : ''}`}
                ref={(element) => {
                  rowElementByPlayerIdRef.current[row.playerId] = element
                }}
              >
                <td className="leaderboard-table__cell leaderboard-table__cell--rank">{index + 1}</td>
                <td className="leaderboard-table__cell leaderboard-table__cell--player">{row.playerName}</td>
                {shouldShowMomentum && (
                  <td className="leaderboard-table__cell">
                    {momentumByPlayerId
                      ? `${momentumByPlayerId[row.playerId]?.streak ?? 0} ${
                          momentumByPlayerId[row.playerId]?.tierLabel ?? 'Cold'
                        }`
                      : '-'}
                  </td>
                )}
                {showAdjustedMetric && (
                  <td className="leaderboard-table__cell leaderboard-table__cell--metric">
                    {formatScoreWithEvenDelta(row.adjustedScore)}
                  </td>
                )}
                {showRealMetric && (
                  <td className="leaderboard-table__cell leaderboard-table__cell--metric">
                    {formatScoreWithEvenDelta(row.realScore)}
                  </td>
                )}
                {showGamePointsMetric && (
                  <td className="leaderboard-table__cell leaderboard-table__cell--metric">
                    {row.gamePoints}
                  </td>
                )}
                {shouldShowGolfScore && (
                  <td
                    className={`leaderboard-table__cell leaderboard-table__cell--metric ${getGolfScoreToneClass(
                      golfScoreToParByPlayerId?.[row.playerId] ?? null,
                    )}`}
                  >
                    {formatGolfScoreToPar(golfScoreToParByPlayerId?.[row.playerId] ?? null)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={`muted leaderboard-table__legend ${compactLegend ? 'leaderboard-table__legend--compact' : ''}`}>
        {legendText ??
          'Actual is pure strokes. Game points come from side-game outcomes. Adjusted = actual minus game points.'}
      </p>
    </div>
  )
}

export default LeaderboardTable
