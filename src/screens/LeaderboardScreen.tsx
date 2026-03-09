import { useMemo, useState } from 'react'
import LeaderboardTable from '../components/LeaderboardTable.tsx'
import { buildHoleRecapData } from '../logic/holeRecap.ts'
import { buildLeaderboardEntries, type LeaderboardSortMode } from '../logic/leaderboard.ts'
import type { PlayerTotals } from '../types/game.ts'
import type { ScreenProps } from './types.ts'

function buildHoleTotalsByPlayerId(
  recapData: ReturnType<typeof buildHoleRecapData>,
): Record<string, PlayerTotals> {
  return Object.fromEntries(
    recapData.playerRows.map((row) => {
      const realScore = row.strokes ?? 0
      const gamePoints = row.holePoints
      return [
        row.playerId,
        {
          realScore,
          gamePoints,
          adjustedScore: realScore - gamePoints,
        },
      ]
    }),
  )
}

function LeaderboardScreen({ roundState, onNavigate, onUpdateRoundState }: ScreenProps) {
  const recapData = buildHoleRecapData(roundState)
  const isLastHole = roundState.currentHoleIndex === roundState.holes.length - 1
  const [roundSortMode, setRoundSortMode] = useState<LeaderboardSortMode>('adjustedScore')
  const [holeSortMode, setHoleSortMode] = useState<LeaderboardSortMode>('adjustedScore')

  const roundLeaderboardRows = useMemo(
    () => buildLeaderboardEntries(roundState.players, roundState.totalsByPlayerId, roundSortMode),
    [roundSortMode, roundState.players, roundState.totalsByPlayerId],
  )
  const holeTotalsByPlayerId = useMemo(() => buildHoleTotalsByPlayerId(recapData), [recapData])
  const holeLeaderboardRows = useMemo(
    () => buildLeaderboardEntries(roundState.players, holeTotalsByPlayerId, holeSortMode),
    [holeSortMode, holeTotalsByPlayerId, roundState.players],
  )

  const progressRound = () => {
    if (isLastHole) {
      onNavigate('endRound')
      return
    }

    onUpdateRoundState((currentState) => ({
      ...currentState,
      currentHoleIndex: currentState.currentHoleIndex + 1,
    }))
    onNavigate('holeSetup')
  }

  return (
    <section className="screen stack-sm hole-recap-screen">
      <header className="screen__header recap-header">
        <div className="row-between">
          <h2>Hole {recapData.holeNumber} Recap</h2>
          <span className="chip">Par {recapData.holePar}</span>
        </div>
        <p className="recap-highlight-label">Top Moment</p>
        <p className="recap-highlight">{recapData.highlightLine}</p>
      </header>

      <LeaderboardTable
        title="Round Leaderboard"
        rows={roundLeaderboardRows}
        sortMode={roundSortMode}
        onSortChange={setRoundSortMode}
        showMomentum={false}
      />

      <LeaderboardTable
        title="Hole Leaderboard"
        rows={holeLeaderboardRows}
        sortMode={holeSortMode}
        onSortChange={setHoleSortMode}
        showMomentum={false}
      />

      <section className="panel stack-xs recap-next">
        <button type="button" className="button-primary" onClick={progressRound}>
          {isLastHole ? 'Finish Round' : `Go To Hole ${recapData.holeNumber + 1}`}
        </button>
      </section>
    </section>
  )
}

export default LeaderboardScreen
