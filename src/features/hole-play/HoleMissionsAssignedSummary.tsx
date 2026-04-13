import { hapticLightImpact } from '../../capacitor/haptics.ts'
import { adaptChallengeTextToSkillLevel } from '../../logic/challengeText.ts'
import { getPersonalParByHoleByPlayerId } from '../../logic/personalPar.ts'
import type { PersonalCard } from '../../types/cards.ts'
import type { HoleCardsState, HoleCount, HoleDefinition, Player } from '../../types/game.ts'

export type IllustrativeMissionPreviewPayload = {
  playerName: string
  expectedScore18: number
  card: PersonalCard
  offerKind?: 'safe' | 'hard' | 'single'
}

interface HoleMissionsAssignedSummaryProps {
  players: Player[]
  holeCards: HoleCardsState
  playerNameById: Record<string, string>
  holes: HoleDefinition[]
  holeCount: HoleCount
  currentHoleIndex: number
  onOpenIllustrativePreview: (payload: IllustrativeMissionPreviewPayload) => void
}

function HoleMissionsAssignedSummary({
  players,
  holeCards,
  playerNameById,
  holes,
  holeCount,
  currentHoleIndex,
  onOpenIllustrativePreview,
}: HoleMissionsAssignedSummaryProps) {
  const personalParByHoleByPlayerId = getPersonalParByHoleByPlayerId(players, holes, holeCount)
  const currentHolePar = holes[currentHoleIndex]?.par ?? 4

  return (
    <section
      className="panel stack-sm hole-missions-assigned-summary"
      aria-label="Selected challenge review"
    >
      <header className="stack-xs">
        <h3 className="hole-missions-assigned-summary__title">Selected Challenge Review</h3>
        <p className="hole-missions-assigned-summary__subtitle muted">
          Tap challenge to view the illustrative card.
        </p>
      </header>
      <div className="stack-sm hole-missions-assigned-summary__list">
        {players.map((player) => {
          const dealtCards = holeCards.dealtPersonalCardsByPlayerId[player.id] ?? []
          const selectedCardId = holeCards.selectedCardIdByPlayerId[player.id]
          const selectedCard = dealtCards.find((c) => c.id === selectedCardId) ?? null
          const offerKind =
            dealtCards.length === 0
              ? undefined
              : dealtCards.length === 1
                ? 'single'
                : dealtCards[0]?.id === selectedCard?.id
                  ? 'safe'
                  : 'hard'
          const personalParForCurrentHole =
            personalParByHoleByPlayerId[player.id]?.[currentHoleIndex] ?? currentHolePar
          const pointsLabel = selectedCard ? `${selectedCard.points >= 0 ? '+' : ''}${selectedCard.points} pts` : ''

          return (
            <article key={player.id} className="stack-xs hole-missions-assigned-summary__player">
              <h4 className="hole-missions-assigned-summary__player-name">
                {playerNameById[player.id]}
              </h4>
              {selectedCard ? (
                <button
                  type="button"
                  className={`hole-missions-assigned-summary__mission-card hole-missions-assigned-summary__mission-card--difficulty-${selectedCard.difficulty}`}
                  onClick={() => {
                    hapticLightImpact()
                    onOpenIllustrativePreview({
                      playerName: playerNameById[player.id],
                      expectedScore18: player.expectedScore18,
                      card: selectedCard,
                      offerKind,
                    })
                  }}
                >
                  <header className="row-between setup-row-wrap hole-missions-assigned-summary__mission-header">
                    <strong className="hole-missions-assigned-summary__mission-title">
                      {selectedCard.name}
                    </strong>
                    <span className="chip hole-missions-assigned-summary__points-chip">
                      {pointsLabel}
                    </span>
                  </header>
                  <p className="hole-missions-assigned-summary__mission-description">
                    {adaptChallengeTextToSkillLevel(selectedCard.description, player.expectedScore18)}
                  </p>
                  <p className="hole-missions-assigned-summary__personal-par">
                    Personal Par: {personalParForCurrentHole} strokes
                  </p>
                </button>
              ) : (
                <p className="muted">No personal mission for this golfer.</p>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}

export default HoleMissionsAssignedSummary
