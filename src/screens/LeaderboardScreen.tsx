import HoleRecap from '../components/HoleRecap.tsx'
import LeaderboardTable from '../components/LeaderboardTable.tsx'
import {
  buildLeaderboardEntries,
  getLeaderboardLeader,
} from '../logic/leaderboard.ts'
import { calculatePlayerHoleGamePoints } from '../logic/scoring.ts'
import type { ScreenProps } from './types.ts'

function LeaderboardScreen({ roundState, onNavigate, onUpdateRoundState }: ScreenProps) {
  const adjustedRows = buildLeaderboardEntries(
    roundState.players,
    roundState.totalsByPlayerId,
    'adjustedScore',
  )
  const realRows = buildLeaderboardEntries(roundState.players, roundState.totalsByPlayerId, 'realScore')
  const pointsRows = buildLeaderboardEntries(
    roundState.players,
    roundState.totalsByPlayerId,
    'gamePoints',
  )

  const realLeader = getLeaderboardLeader(realRows, 'realScore')
  const pointsLeader = getLeaderboardLeader(pointsRows, 'gamePoints')
  const adjustedLeader = getLeaderboardLeader(adjustedRows, 'adjustedScore')

  const currentHole = roundState.holes[roundState.currentHoleIndex]
  const currentHoleCards = roundState.holeCards[roundState.currentHoleIndex]
  const currentResult = roundState.holeResults[roundState.currentHoleIndex]
  const isLastHole = roundState.currentHoleIndex === roundState.holes.length - 1

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

      <section className="panel stack-xs">
        <strong>Hole {currentHole.holeNumber} Personal Card Points</strong>
        {roundState.players.map((player) => {
          const points = calculatePlayerHoleGamePoints(player.id, currentHoleCards, currentResult)

          return (
            <div key={player.id} className="row-between">
              <span>{player.name}</span>
              <span>
                {points > 0 ? '+' : ''}
                {points} pts
              </span>
            </div>
          )
        })}
      </section>

      <HoleRecap hole={currentHole} result={currentResult} players={roundState.players} />

      <section className="panel stack-xs">
        <strong>Current Leaders</strong>
        <p>
          Real: <strong>{realLeader?.playerName ?? '-'}</strong> ({realLeader?.realScore ?? '-'})
        </p>
        <p>
          Game Points: <strong>{pointsLeader?.playerName ?? '-'}</strong> (
          {pointsLeader?.gamePoints ?? '-'})
        </p>
        <p>
          Adjusted: <strong>{adjustedLeader?.playerName ?? '-'}</strong> (
          {adjustedLeader?.adjustedScore ?? '-'})
        </p>
      </section>

      <LeaderboardTable title="Adjusted Score Leaderboard" rows={adjustedRows} />
      <LeaderboardTable title="Real Score Leaderboard" rows={realRows} />
      <LeaderboardTable title="Game Points Leaderboard" rows={pointsRows} />

      <section className="panel stack-xs">
        <button type="button" className="button-primary" onClick={progressRound}>
          {isLastHole ? 'Finish Round' : `Go To Hole ${currentHole.holeNumber + 1}`}
        </button>
      </section>
    </section>
  )
}

export default LeaderboardScreen
