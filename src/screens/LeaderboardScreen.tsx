import { useState } from 'react'
import HoleRecapTable from '../components/HoleRecapTable.tsx'
import LeaderboardTable from '../components/LeaderboardTable.tsx'
import { buildLeaderboardEntries, type LeaderboardSortMode } from '../logic/leaderboard.ts'
import { calculatePlayerHoleGamePoints } from '../logic/scoring.ts'
import type { ScreenProps } from './types.ts'

function LeaderboardScreen({ roundState, onNavigate, onUpdateRoundState }: ScreenProps) {
  const [sortMode, setSortMode] = useState<LeaderboardSortMode>('adjustedScore')
  const leaderboardRows = buildLeaderboardEntries(
    roundState.players,
    roundState.totalsByPlayerId,
    sortMode,
  )

  const currentHole = roundState.holes[roundState.currentHoleIndex]
  const currentHoleCards = roundState.holeCards[roundState.currentHoleIndex]
  const currentResult = roundState.holeResults[roundState.currentHoleIndex]
  const isLastHole = roundState.currentHoleIndex === roundState.holes.length - 1
  const holeRecapRows = [...roundState.players]
    .map((player) => ({
      playerId: player.id,
      playerName: player.name,
      strokes: currentResult.strokesByPlayerId[player.id],
      missionStatus: currentResult.missionStatusByPlayerId[player.id],
      holePoints: calculatePlayerHoleGamePoints(player.id, currentHoleCards, currentResult),
    }))
    .sort((rowA, rowB) => {
      const strokesA = rowA.strokes
      const strokesB = rowB.strokes

      if (typeof strokesA === 'number' && typeof strokesB === 'number' && strokesA !== strokesB) {
        return strokesA - strokesB
      }

      if (typeof strokesA === 'number' && typeof strokesB !== 'number') {
        return -1
      }

      if (typeof strokesA !== 'number' && typeof strokesB === 'number') {
        return 1
      }

      return rowB.holePoints - rowA.holePoints
    })

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
    <section className="screen stack-sm">
      <header className="screen__header">
        <h2>Hole Recap</h2>
        <p className="muted">Hole {currentHole.holeNumber} complete. Review standings and continue.</p>
      </header>

      <LeaderboardTable
        title="Leaderboard"
        rows={leaderboardRows}
        sortMode={sortMode}
        onSortChange={setSortMode}
      />
      <HoleRecapTable title={`Hole ${currentHole.holeNumber} Recap`} rows={holeRecapRows} />

      <section className="panel stack-xs">
        <button type="button" className="button-primary" onClick={progressRound}>
          {isLastHole ? 'Finish Round' : `Go To Hole ${currentHole.holeNumber + 1}`}
        </button>
      </section>
    </section>
  )
}

export default LeaderboardScreen
